import type {
  PaymentContext,
  PaymentGate,
  PaymentOutcome,
  SettlementReceipt,
} from './server.ts';
import { deriveNanoBlockPaymentIdentity, deriveOperationId } from './payment/identity.ts';
import type { PaymentStateStore } from './payment/store.ts';

interface PaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  extra?: Record<string, unknown>;
}

interface ResourceServerLike {
  buildPaymentRequirements(config: Record<string, unknown>): Promise<PaymentRequirements[]>;
  createPaymentRequiredResponse(
    requirements: PaymentRequirements[],
    resource: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  verifyPayment(payload: unknown, requirements: PaymentRequirements): Promise<{ isValid: boolean }>;
  settlePayment(payload: unknown, requirements: PaymentRequirements): Promise<Record<string, unknown>>;
}

export interface NanoPaymentGateOptions {
  readonly payTo: string;
  readonly priceXno: string;
  readonly facilitatorUrl: string;
  /** Injected x402 resource server. Production construction is added only after package validation. */
  readonly resourceServer: ResourceServerLike;
  /** Required for replay protection. Memory stores are suitable only for tests/local development. */
  readonly stateStore?: PaymentStateStore;
}

const NETWORK = 'nano:mainnet';
const SCHEME = 'exact';
const ASSET = 'XNO';

function xnoToRaw(value: string): string {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,30})?$/.test(value)) {
    throw new Error('Nano price must be a non-negative decimal with at most 30 decimal places.');
  }
  const [whole, fraction = ''] = value.split('.');
  const raw = `${whole}${fraction.padEnd(30, '0')}`.replace(/^0+(?=\d)/, '');
  return raw || '0';
}

function decodeProof(value: string): unknown | undefined {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return undefined;
  try {
    const bytes = Buffer.from(value, 'base64');
    if (bytes.toString('base64') !== value) return undefined;
    const parsed: unknown = JSON.parse(bytes.toString('utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function acceptedFrom(payload: unknown): PaymentRequirements | undefined {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const accepted = (payload as Record<string, unknown>).accepted;
  if (accepted === null || typeof accepted !== 'object' || Array.isArray(accepted)) return undefined;
  return accepted as unknown as PaymentRequirements;
}

function matchesTerms(
  accepted: PaymentRequirements,
  context: PaymentContext,
  expectedAmount: string,
  payTo: string,
): boolean {
  return accepted.scheme === SCHEME &&
    accepted.network === NETWORK &&
    accepted.asset === ASSET &&
    accepted.amount === expectedAmount &&
    accepted.payTo === payTo &&
    accepted.extra?.requestDigest === context.requestDigest;
}

function boundedReceipt(value: Record<string, unknown>): SettlementReceipt | undefined {
  if (value.success !== true || typeof value.transaction !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(value.transaction) || value.network !== NETWORK) return undefined;
  if (value.payer !== undefined && typeof value.payer !== 'string') return undefined;
  return Object.freeze({
    success: true,
    transaction: value.transaction,
    network: NETWORK,
    ...(typeof value.payer === 'string' ? { payer: value.payer.slice(0, 128) } : {}),
  });
}

export function createNanoPaymentGate(options: NanoPaymentGateOptions): PaymentGate {
  if (!options.resourceServer) throw new Error('An x402 resource server is required.');
  if (!/^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/.test(options.payTo)) {
    throw new Error('A valid public Nano receiving address is required.');
  }
  const facilitator = new URL(options.facilitatorUrl);
  if (facilitator.protocol !== 'https:') throw new Error('Facilitator URL must use HTTPS.');
  const amount = xnoToRaw(options.priceXno);
  if (amount === '0') throw new Error('Nano price must be greater than zero.');

  async function requirements(context: PaymentContext): Promise<PaymentRequirements> {
    const built = await options.resourceServer.buildPaymentRequirements({
      scheme: SCHEME,
      network: NETWORK,
      price: options.priceXno,
      payTo: options.payTo,
      description: 'Deterministic JSON structural analysis',
      mimeType: 'application/json',
      extra: { requestDigest: context.requestDigest },
    });
    if (built.length !== 1) throw new Error('Unexpected payment requirements.');
    const requirement = built[0];
    if (!matchesTerms(requirement, context, amount, options.payTo)) {
      throw new Error('Resource server returned mismatched payment requirements.');
    }
    return requirement;
  }

  return Object.freeze({
    async challenge(context: PaymentContext): Promise<Record<string, unknown>> {
      const requirement = await requirements(context);
      return options.resourceServer.createPaymentRequiredResponse([requirement], {
        url: context.resourceUrl,
        description: 'Deterministic JSON structural analysis',
        mimeType: 'application/json',
      });
    },

    async verifyAndSettle(context: PaymentContext, proof: string): Promise<PaymentOutcome> {
      const payload = decodeProof(proof);
      if (payload === undefined) return { settled: false };
      const accepted = acceptedFrom(payload);
      if (accepted === undefined || !matchesTerms(accepted, context, amount, options.payTo)) {
        return { settled: false };
      }

      let operationId: string | undefined;
      if (options.stateStore !== undefined) {
        // Use the stable Nano state-block identity as the primary replay key.
        // Envelope-only mutations must not create a second settlement operation.
        const paymentIdentity = deriveNanoBlockPaymentIdentity(payload);
        if (paymentIdentity === undefined) return { settled: false };
        operationId = deriveOperationId(context.requestDigest, paymentIdentity);
        const claim = await options.stateStore.claimPayment(
          paymentIdentity,
          context.requestDigest,
          operationId,
        );
        if (claim.status === 'conflict') return { settled: false };
        if (claim.status === 'existing') {
          const state = await options.stateStore.getState(claim.operationId);
          if (state !== 'settled' && state !== 'fulfilled') return { settled: false };
          const receipt = await options.stateStore.getSettlementReceipt(claim.operationId);
          return receipt === undefined ? { settled: false } : { settled: true, receipt };
        }
      }

      const requirement = await requirements(context);
      const verification = await options.resourceServer.verifyPayment(payload, requirement);
      if (verification.isValid !== true) return { settled: false };

      if (operationId !== undefined) {
        const verified = await options.stateStore!.compareAndSetState(operationId, 'unverified', 'verified');
        if (!verified) return { settled: false };
        const settling = await options.stateStore!.compareAndSetState(operationId, 'verified', 'settling');
        if (!settling) return { settled: false };
      }

      let settlement: Record<string, unknown>;
      try {
        settlement = await options.resourceServer.settlePayment(payload, requirement);
      } catch (cause) {
        if (operationId !== undefined) {
          await options.stateStore!.compareAndSetState(operationId, 'settling', 'settlement_unknown');
        }
        throw cause;
      }
      if (settlement.success !== true) {
        if (operationId !== undefined) {
          await options.stateStore!.compareAndSetState(operationId, 'settling', 'settlement_unknown');
        }
        return { settled: false };
      }
      const receipt = boundedReceipt(settlement);
      if (receipt === undefined) {
        if (operationId !== undefined) {
          await options.stateStore!.compareAndSetState(operationId, 'settling', 'settlement_unknown');
        }
        throw new Error('Settlement response could not be confirmed.');
      }
      if (operationId !== undefined) {
        const settled = await options.stateStore!.compareAndSetState(operationId, 'settling', 'settled');
        if (!settled) throw new Error('Settlement state could not be confirmed.');
        await options.stateStore!.saveSettlementReceipt(operationId, receipt);
      }
      return { settled: true, receipt };
    },
  });
}
