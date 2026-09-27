import { createHash } from 'node:crypto';
import type { PaymentContext, PaymentGate, PaymentOutcome, SettlementReceipt } from './server.ts';

export interface RequestIdentityInput {
  resourceUrl: string;
  requestDigest: string;
  priceRaw: string;
  network: string;
  payTo: string;
}

export interface NanoPaymentRequirement {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  extra: { requestId: string };
}

export interface DecodedNanoPayment {
  paymentIdentity: string;
  payload: unknown;
  accepted: NanoPaymentRequirement;
}

export interface NanoProtocolAdapter {
  buildChallenge(requirement: NanoPaymentRequirement, resourceUrl: string): Promise<Record<string, unknown>>;
  decodeProof(proof: string): DecodedNanoPayment;
  verify(payload: unknown, requirement: NanoPaymentRequirement): Promise<{ isValid: boolean; payer?: string }>;
  settle(payload: unknown, requirement: NanoPaymentRequirement): Promise<
    | { success: true; transaction: string; network: string; payer?: string }
    | { success: false }
  >;
}

export type PaymentState = 'settling' | 'settlement_unknown' | 'settled' | 'settle_failed';

export interface PaymentRecord {
  paymentIdentity: string;
  requestId: string;
  operationId: string;
  state: PaymentState;
  receipt?: SettlementReceipt;
}

export type PaymentClaim =
  | { kind: 'new'; record: PaymentRecord }
  | { kind: 'existing'; record: PaymentRecord }
  | { kind: 'conflict'; record: PaymentRecord };

/**
 * Production implementations must make claim atomic across processes/instances.
 * A paymentIdentity may be owned by exactly one requestId.
 */
export interface PaymentStateStore {
  claim(record: PaymentRecord): Promise<PaymentClaim>;
  update(operationId: string, patch: Partial<PaymentRecord>): Promise<PaymentRecord>;
}

export interface NanoPaymentGateOptions {
  priceRaw: string;
  payTo: string;
  protocol: NanoProtocolAdapter;
  store: PaymentStateStore;
}

/**
 * Derives the server-owned identity for exactly one protected purchase.
 * A fixed JSON array is used as an unambiguous structured encoding; field
 * order is part of the versioned domain and does not depend on object order.
 */
export function deriveRequestId(input: RequestIdentityInput): string {
  const encoded = JSON.stringify([
    'nano-json-lens/payment-request/v1',
    'POST',
    input.resourceUrl,
    input.requestDigest,
    input.priceRaw,
    input.network,
    input.payTo,
  ]);

  return createHash('sha256').update(encoded, 'utf8').digest('hex');
}

export function deriveOperationId(requestId: string, paymentIdentity: string): string {
  const encoded = JSON.stringify([
    'nano-json-lens/payment-operation/v1',
    requestId,
    paymentIdentity,
  ]);
  return createHash('sha256').update(encoded, 'utf8').digest('hex');
}

function buildRequirement(context: PaymentContext, options: NanoPaymentGateOptions): NanoPaymentRequirement {
  const requestId = deriveRequestId({
    resourceUrl: context.resourceUrl,
    requestDigest: context.requestDigest,
    priceRaw: options.priceRaw,
    network: 'nano:mainnet',
    payTo: options.payTo,
  });
  return {
    scheme: 'exact',
    network: 'nano:mainnet',
    asset: 'XNO',
    amount: options.priceRaw,
    payTo: options.payTo,
    extra: { requestId },
  };
}

function sameRequirement(actual: NanoPaymentRequirement, expected: NanoPaymentRequirement): boolean {
  return actual?.scheme === expected.scheme &&
    actual?.network === expected.network &&
    actual?.asset === expected.asset &&
    actual?.amount === expected.amount &&
    actual?.payTo === expected.payTo &&
    actual?.extra?.requestId === expected.extra.requestId;
}

function isReceipt(value: unknown): value is SettlementReceipt {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Partial<SettlementReceipt>;
  return receipt.success === true && receipt.network === 'nano:mainnet' &&
    typeof receipt.transaction === 'string' && /^[0-9a-f]{64}$/i.test(receipt.transaction);
}

export function createNanoPaymentGate(options: NanoPaymentGateOptions): PaymentGate {
  if (!/^[0-9]+$/.test(options.priceRaw) || BigInt(options.priceRaw) <= 0n) {
    throw new Error('Nano price must be a positive raw-unit integer string.');
  }
  if (!options.payTo) throw new Error('Nano receiving address is required.');
  if (!options.protocol || !options.store) throw new Error('Protocol adapter and durable payment store are required.');

  return {
    async challenge(context: PaymentContext): Promise<Record<string, unknown>> {
      const requirement = buildRequirement(context, options);
      return options.protocol.buildChallenge(requirement, context.resourceUrl);
    },

    async verifyAndSettle(context: PaymentContext, proof: string): Promise<PaymentOutcome> {
      const requirement = buildRequirement(context, options);
      let decoded: DecodedNanoPayment;
      try {
        decoded = options.protocol.decodeProof(proof);
      } catch {
        return { settled: false };
      }
      if (!sameRequirement(decoded.accepted, requirement) ||
          !/^[0-9a-f]{64}$/i.test(decoded.paymentIdentity)) {
        return { settled: false };
      }

      const verification = await options.protocol.verify(decoded.payload, requirement);
      if (!verification.isValid) return { settled: false };

      const requestId = requirement.extra.requestId;
      const operationId = deriveOperationId(requestId, decoded.paymentIdentity.toLowerCase());
      const proposed: PaymentRecord = {
        paymentIdentity: decoded.paymentIdentity.toLowerCase(),
        requestId,
        operationId,
        state: 'settling',
      };
      const claim = await options.store.claim(proposed);

      if (claim.kind === 'conflict') return { settled: false };
      if (claim.kind === 'existing') {
        if (claim.record.state === 'settled' && isReceipt(claim.record.receipt)) {
          return { settled: true, receipt: claim.record.receipt };
        }
        if (claim.record.state === 'settle_failed') return { settled: false };
        throw new Error('Payment settlement outcome is unknown; reconciliation is required.');
      }

      let settlement: Awaited<ReturnType<NanoProtocolAdapter['settle']>>;
      try {
        settlement = await options.protocol.settle(decoded.payload, requirement);
      } catch (cause) {
        await options.store.update(operationId, { state: 'settlement_unknown' });
        throw cause;
      }

      if (!settlement.success) {
        await options.store.update(operationId, { state: 'settle_failed' });
        return { settled: false };
      }

      const receipt: SettlementReceipt = {
        success: true,
        transaction: settlement.transaction,
        network: settlement.network as 'nano:mainnet',
        ...(settlement.payer ? { payer: settlement.payer } : {}),
      };
      if (!isReceipt(receipt)) {
        await options.store.update(operationId, { state: 'settlement_unknown' });
        throw new Error('Facilitator returned an untrusted settlement result.');
      }

      await options.store.update(operationId, { state: 'settled', receipt });
      return { settled: true, receipt };
    },
  };
}
