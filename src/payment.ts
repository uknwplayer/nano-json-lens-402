import { createHash } from 'node:crypto';

export interface RequestIdentityInput {
  resourceUrl: string;
  requestDigest: string;
  priceRaw: string;
  network: string;
  payTo: string;
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
