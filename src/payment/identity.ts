import { createHash } from 'node:crypto';

export interface RequestIdentityTerms {
  readonly version: string;
  readonly method: string;
  readonly route: string;
  readonly canonicalPayloadHash: string;
  readonly price: string;
  readonly network: string;
  readonly payTo: string;
}

const REQUEST_DOMAIN = 'nano-json-lens-402/request-id/v1';
const OPERATION_DOMAIN = 'nano-json-lens-402/operation-id/v1';
const NANO_BLOCK_IDENTITY_DOMAIN = 'nano-json-lens-402/nano-block-payment-id/v1';
const NANO_ADDRESS = /^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/;
const HEX_64 = /^[0-9a-f]{64}$/i;
const MAX_UINT128 = (1n << 128n) - 1n;

/**
 * Encode security fields without delimiter ambiguity.
 * Each UTF-8 field is prefixed by its byte length, so ["ab", "c"] and
 * ["a", "bc"] cannot serialize to the same byte sequence.
 */
export function canonicalSecurityEncoding(fields: readonly string[]): string {
  return fields.map((field) => {
    const bytes = Buffer.byteLength(field, 'utf8');
    return `${bytes}:${field}`;
  }).join('');
}

function sha256(fields: readonly string[]): string {
  return createHash('sha256').update(canonicalSecurityEncoding(fields), 'utf8').digest('hex');
}

export function deriveRequestId(terms: RequestIdentityTerms): string {
  return sha256([
    REQUEST_DOMAIN,
    terms.version,
    terms.method,
    terms.route,
    terms.canonicalPayloadHash,
    terms.price,
    terms.network,
    terms.payTo,
  ]);
}

export function deriveOperationId(requestId: string, paymentIdentity: string): string {
  return sha256([OPERATION_DOMAIN, requestId, paymentIdentity]);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/**
 * Derive a stable local replay identity from the security-relevant material of
 * a Nano state block. Envelope metadata, signature, PoW and derived display
 * fields are intentionally excluded so equivalent representations of the same
 * signed block cannot obtain a different replay key.
 *
 * This value is a service-local SHA-256 identity, not a claim to be the Nano
 * protocol's canonical on-chain block hash. Signature validity and settlement
 * remain authoritative responsibilities of the x402 Nano verifier/facilitator.
 */
export function deriveNanoBlockPaymentIdentity(paymentPayload: unknown): string | undefined {
  const envelope = asRecord(paymentPayload);
  const payload = asRecord(envelope?.payload);
  const block = asRecord(payload?.block);
  if (block === undefined) return undefined;

  if (block.type !== 'state' ||
      typeof block.account !== 'string' || !NANO_ADDRESS.test(block.account) ||
      typeof block.previous !== 'string' || !HEX_64.test(block.previous) ||
      typeof block.representative !== 'string' || !NANO_ADDRESS.test(block.representative) ||
      typeof block.balance !== 'string' || !/^(?:0|[1-9]\d*)$/.test(block.balance) ||
      typeof block.link !== 'string' || !HEX_64.test(block.link)) {
    return undefined;
  }

  let balance: bigint;
  try {
    balance = BigInt(block.balance);
  } catch {
    return undefined;
  }
  if (balance < 0n || balance > MAX_UINT128) return undefined;

  return sha256([
    NANO_BLOCK_IDENTITY_DOMAIN,
    block.type,
    block.account,
    block.previous.toLowerCase(),
    block.representative,
    block.balance,
    block.link.toLowerCase(),
  ]);
}

/** Secondary identifier only; prefer a stronger protocol/on-chain payment identity when available. */
export function digestPaymentEvidence(proof: string): string {
  return sha256(['nano-json-lens-402/payment-evidence/v1', proof]);
}
