import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SqlitePaymentStateStore } from '../src/payment-store.ts';
import type { PaymentRecord } from '../src/payment.ts';

const RECEIPT = {
  success: true as const,
  transaction: 'cd'.repeat(32),
  network: 'nano:mainnet' as const,
  payer: 'nano_test_payer',
};

function record(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    paymentIdentity: 'ab'.repeat(32),
    requestId: '11'.repeat(32),
    operationId: '22'.repeat(32),
    state: 'settling',
    ...overrides,
  };
}

async function withDb(t: Parameters<typeof test>[1] extends (...args: infer A) => unknown ? A[0] : never) {
  const dir = await mkdtemp(join(tmpdir(), 'nano-json-lens-store-'));
  const path = join(dir, 'payments.sqlite');
  t.after(async () => rm(dir, { recursive: true, force: true }));
  return { dir, path };
}

test('SQLite store atomically claims one payment identity for one request', async (t) => {
  const { path } = await withDb(t);
  const store = new SqlitePaymentStateStore(path);
  t.after(() => store.close());

  const first = await store.claim(record());
  assert.equal(first.kind, 'new');

  const same = await store.claim(record());
  assert.equal(same.kind, 'existing');

  const conflict = await store.claim(record({ requestId: '33'.repeat(32), operationId: '44'.repeat(32) }));
  assert.equal(conflict.kind, 'conflict');
  assert.equal(conflict.record.requestId, '11'.repeat(32));
});

test('settled receipt survives process-style close and reopen', async (t) => {
  const { path } = await withDb(t);
  const first = new SqlitePaymentStateStore(path);
  assert.equal((await first.claim(record())).kind, 'new');
  await first.update('22'.repeat(32), { state: 'settled', receipt: RECEIPT });
  first.close();

  const reopened = new SqlitePaymentStateStore(path);
  t.after(() => reopened.close());
  const claim = await reopened.claim(record());

  assert.equal(claim.kind, 'existing');
  assert.equal(claim.record.state, 'settled');
  assert.deepEqual(claim.record.receipt, RECEIPT);
});

test('store rejects mutation of payment identity fields and missing operations', async (t) => {
  const { path } = await withDb(t);
  const store = new SqlitePaymentStateStore(path);
  t.after(() => store.close());
  await store.claim(record());

  await assert.rejects(() => store.update('22'.repeat(32), { requestId: '55'.repeat(32) }));
  await assert.rejects(() => store.update('ff'.repeat(32), { state: 'settled', receipt: RECEIPT }));
});
