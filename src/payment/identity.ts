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

/** Secondary identifier only; prefer a stronger protocol/on-chain payment identity when available. */
export function digestPaymentEvidence(proof: string): string {
  return sha256(['nano-json-lens-402/payment-evidence/v1', proof]);
}
