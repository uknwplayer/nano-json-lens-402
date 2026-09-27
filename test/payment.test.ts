import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRequestId } from '../src/payment.ts';

const base = {
  resourceUrl: 'https://lens.example.test/api/lens',
  requestDigest: '00'.repeat(32),
  priceRaw: '10000000000000000000000000000',
  network: 'nano:mainnet' as const,
  payTo: 'nano_test_receiving_address_only_for_identity_tests',
};

test('request identity is deterministic and 256-bit hex', () => {
  const first = deriveRequestId(base);
  const second = deriveRequestId({ ...base });

  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test('request identity binds every protected payment term', () => {
  const expected = deriveRequestId(base);

  assert.notEqual(expected, deriveRequestId({ ...base, requestDigest: '11'.repeat(32) }));
  assert.notEqual(expected, deriveRequestId({ ...base, resourceUrl: 'https://lens.example.test/api/other' }));
  assert.notEqual(expected, deriveRequestId({ ...base, priceRaw: '10000000000000000000000000001' }));
  assert.notEqual(expected, deriveRequestId({ ...base, network: 'nano:testnet' }));
  assert.notEqual(expected, deriveRequestId({ ...base, payTo: `${base.payTo}_other` }));
});

test('structured identity encoding cannot collide by delimiter shifting', () => {
  const left = deriveRequestId({ ...base, resourceUrl: 'https://lens.example.test/a|b', payTo: 'c' });
  const right = deriveRequestId({ ...base, resourceUrl: 'https://lens.example.test/a', payTo: 'b|c' });

  assert.notEqual(left, right);
});
