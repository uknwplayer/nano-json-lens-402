import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSecurityEncoding,
  deriveNanoBlockPaymentIdentity,
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

const nanoBlock = {
  type: 'state',
  account: 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt',
  previous: 'A'.repeat(64),
  representative: 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt',
  balance: '123456789',
  link: 'B'.repeat(64),
  link_as_account: 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt',
  signature: 'C'.repeat(128),
  work: 'D'.repeat(16),
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

test('Nano block payment identity is stable across envelope-only changes', () => {
  const first = deriveNanoBlockPaymentIdentity({
    x402Version: 2,
    accepted: { network: 'nano:mainnet' },
    payload: { block: nanoBlock },
  });
  const second = deriveNanoBlockPaymentIdentity({
    x402Version: 2,
    accepted: { network: 'nano:mainnet', arbitraryEnvelopeField: 'changed' },
    payload: { block: { ...nanoBlock } },
    unrelated: 'different',
  });

  assert.match(first ?? '', /^[0-9a-f]{64}$/);
  assert.equal(first, second);
});

test('Nano block payment identity changes when signed block material changes', () => {
  const baseline = deriveNanoBlockPaymentIdentity({ payload: { block: nanoBlock } });
  const changed = deriveNanoBlockPaymentIdentity({
    payload: { block: { ...nanoBlock, previous: 'E'.repeat(64) } },
  });

  assert.notEqual(baseline, changed);
});

test('Nano block payment identity fails closed when the payment block is absent or malformed', () => {
  assert.equal(deriveNanoBlockPaymentIdentity({}), undefined);
  assert.equal(deriveNanoBlockPaymentIdentity({ payload: {} }), undefined);
  assert.equal(deriveNanoBlockPaymentIdentity({ payload: { block: 'not-an-object' } }), undefined);
});
