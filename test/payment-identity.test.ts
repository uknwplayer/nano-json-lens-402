import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSecurityEncoding,
  deriveOperationId,
  deriveRequestId,
} from '../src/payment/identity.ts';

const base = {
  version: 'nano-json-lens-402/v1',
  method: 'POST',
  route: '/api/lens',
  canonicalPayloadHash: 'a'.repeat(64),
  price: '10000000000000000000000000000',
  network: 'nano:mainnet',
  payTo: 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt',
};

test('canonical security encoding is deterministic and preserves field boundaries', () => {
  assert.equal(
    canonicalSecurityEncoding(['ab', 'c']),
    canonicalSecurityEncoding(['ab', 'c']),
  );
  assert.notEqual(
    canonicalSecurityEncoding(['ab', 'c']),
    canonicalSecurityEncoding(['a', 'bc']),
  );
});

test('requestId is deterministic for identical protected terms', () => {
  assert.equal(deriveRequestId(base), deriveRequestId({ ...base }));
  assert.match(deriveRequestId(base), /^[0-9a-f]{64}$/);
});

test('requestId changes when any security-relevant protected term changes', () => {
  const baseline = deriveRequestId(base);
  const variants = [
    { ...base, version: 'nano-json-lens-402/v2' },
    { ...base, method: 'PUT' },
    { ...base, route: '/api/other' },
    { ...base, canonicalPayloadHash: 'b'.repeat(64) },
    { ...base, price: '1' },
    { ...base, network: 'nano:testnet' },
    { ...base, payTo: 'nano_other' },
  ];

  for (const variant of variants) {
    assert.notEqual(deriveRequestId(variant), baseline);
  }
});

test('operationId binds the request to the payment identity', () => {
  const requestId = deriveRequestId(base);
  const first = deriveOperationId(requestId, 'payment-A');
  assert.equal(first, deriveOperationId(requestId, 'payment-A'));
  assert.notEqual(first, deriveOperationId(requestId, 'payment-B'));
  assert.notEqual(first, deriveOperationId(deriveRequestId({ ...base, canonicalPayloadHash: 'c'.repeat(64) }), 'payment-A'));
  assert.match(first, /^[0-9a-f]{64}$/);
});
