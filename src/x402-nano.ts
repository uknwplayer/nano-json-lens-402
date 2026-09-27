import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import type { PaymentPayload, PaymentRequirements } from '@x402/core/types';
import { ExactNanoScheme } from '@x402nano/exact/server';
import { Nano } from 'nano-sdk';
import type {
  DecodedNanoPayment,
  NanoPaymentRequirement,
  NanoProtocolAdapter,
} from './payment.ts';

export interface X402NanoProtocolOptions {
  facilitatorUrl: string;
}

function parseFacilitatorUrl(value: string): URL {
  const url = new URL(value);
  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) {
    throw new Error('Facilitator URL must use HTTPS, except for loopback integration tests.');
  }
  if (url.username || url.password) throw new Error('Facilitator URL must not contain credentials.');
  return url;
}

function decodeBase64Json(proof: string): unknown {
  if (typeof proof !== 'string' || proof.length === 0 || proof.length > 32_768) {
    throw new Error('Invalid payment proof encoding.');
  }
  if (proof.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(proof)) {
    throw new Error('Invalid payment proof encoding.');
  }
  const bytes = Buffer.from(proof, 'base64');
  if (bytes.toString('base64') !== proof) throw new Error('Non-canonical payment proof encoding.');
  return JSON.parse(bytes.toString('utf8')) as unknown;
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${name}.`);
  }
  return value as Record<string, unknown>;
}

function decodeAccepted(value: unknown): NanoPaymentRequirement {
  const accepted = asRecord(value, 'accepted payment terms');
  const extra = asRecord(accepted.extra, 'accepted payment metadata');
  const requestId = extra.requestId;
  if (accepted.scheme !== 'exact' || accepted.network !== 'nano:mainnet' || accepted.asset !== 'XNO' ||
      typeof accepted.amount !== 'string' || !/^\d+$/.test(accepted.amount) ||
      typeof accepted.payTo !== 'string' || typeof requestId !== 'string' || !/^[0-9a-f]{64}$/i.test(requestId)) {
    throw new Error('Invalid accepted payment terms.');
  }
  return {
    scheme: 'exact',
    network: 'nano:mainnet',
    asset: 'XNO',
    amount: accepted.amount,
    payTo: accepted.payTo,
    extra: { requestId: requestId.toLowerCase() },
  };
}

function decodePayload(proof: string): { wire: PaymentPayload; accepted: NanoPaymentRequirement; block: Nano.Blocks.StateBlock } {
  const wireRecord = asRecord(decodeBase64Json(proof), 'payment payload');
  if (wireRecord.x402Version !== 2) throw new Error('Unsupported x402 payment version.');
  const resource = asRecord(wireRecord.resource, 'payment resource');
  if (typeof resource.url !== 'string' || resource.url.length === 0) throw new Error('Invalid payment resource.');
  const accepted = decodeAccepted(wireRecord.accepted);
  const payload = asRecord(wireRecord.payload, 'Nano payment payload');
  const block = asRecord(payload.block, 'Nano payment block') as unknown as Nano.Blocks.StateBlock;
  const paymentIdentity = Nano.Crypto.hashBlock({ block });
  if (!/^[0-9a-f]{64}$/i.test(paymentIdentity)) throw new Error('Invalid Nano block identity.');
  return { wire: wireRecord as unknown as PaymentPayload, accepted, block };
}

async function sdkRequirement(
  resourceServer: x402ResourceServer,
  requirement: NanoPaymentRequirement,
): Promise<PaymentRequirements> {
  const requirements = await resourceServer.buildPaymentRequirements({
    scheme: 'exact',
    network: 'nano:mainnet',
    price: requirement.amount,
    payTo: requirement.payTo,
    extra: { requestId: requirement.extra.requestId },
  });
  if (requirements.length !== 1) throw new Error('Facilitator did not yield exactly one Nano payment requirement.');
  return requirements[0];
}

export async function createX402NanoProtocolAdapter(
  options: X402NanoProtocolOptions,
): Promise<NanoProtocolAdapter> {
  const facilitatorUrl = parseFacilitatorUrl(options.facilitatorUrl).toString().replace(/\/$/, '');
  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator);
  resourceServer.register('nano:mainnet', new ExactNanoScheme());
  await resourceServer.initialize();

  return {
    async buildChallenge(requirement, resourceUrl) {
      const paymentRequirement = await sdkRequirement(resourceServer, requirement);
      return resourceServer.createPaymentRequiredResponse([paymentRequirement], {
        url: resourceUrl,
        description: 'Deterministic JSON analysis',
        mimeType: 'application/json',
      }) as unknown as Record<string, unknown>;
    },

    decodeProof(proof): DecodedNanoPayment {
      const decoded = decodePayload(proof);
      const paymentIdentity = Nano.Crypto.hashBlock({ block: decoded.block });
      return {
        paymentIdentity,
        payload: decoded.wire,
        accepted: decoded.accepted,
      };
    },

    async verify(payload, requirement) {
      const paymentRequirement = await sdkRequirement(resourceServer, requirement);
      const result = await resourceServer.verifyPayment(payload as PaymentPayload, paymentRequirement);
      return {
        isValid: result.isValid,
        ...(result.payer ? { payer: result.payer } : {}),
      };
    },

    async settle(payload, requirement) {
      const paymentRequirement = await sdkRequirement(resourceServer, requirement);
      const result = await resourceServer.settlePayment(payload as PaymentPayload, paymentRequirement);
      if (!result.success) return { success: false };
      return {
        success: true,
        transaction: result.transaction,
        network: result.network,
        ...(result.payer ? { payer: result.payer } : {}),
      };
    },
  };
}
