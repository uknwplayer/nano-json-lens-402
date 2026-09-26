import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createD1PaymentStateStore } from '../src/payment/d1-store.ts';
import { SQLiteD1Database } from './support/sqlite-d1.ts';

const paymentA = 'a'.repeat(64);
const requestA = 'b'.repeat(64);
const requestB = 'c'.repeat(64);
const operationA = 'd'.repeat(64);
const operationB = 'e'.repeat(64);
const migration = readFileSync(new URL('../migrations/0001_payment_state.sql', import.meta.url), 'utf8');
const receipt = Object.freeze({
  success: true as const,
  transaction: 'f'.repeat(64),
  network: 'nano:mainnet' as const,
  payer: 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt',
});

function freshStore() {
  const database = new SQLiteD1Database();
  database.exec(migration);
  return { database, store: createD1PaymentStateStore(database) };
}

test('D1 store atomically claims one payment identity and detects rebinding', async () => {
  const { database, store } = freshStore();
  try {
    assert.equal(store.productionSafe, true);
    const [first, second] = await Promise.all([
      store.claimPayment(paymentA, requestA, operationA),
      store.claimPayment(paymentA, requestA, operationA),
    ]);
    assert.equal([first.status, second.status].filter(status => status === 'claimed').length, 1);
    assert.equal([first.status, second.status].filter(status => status === 'existing').length, 1);
    assert.deepEqual(await store.claimPayment(paymentA, requestB, operationB), { status: 'conflict' });
  } finally {
    database.close();
  }
});

test('D1 store compare-and-set permits only one stale-state transition', async () => {
  const { database, store } = freshStore();
  try {
    await store.claimPayment(paymentA, requestA, operationA);
    const [first, second] = await Promise.all([
      store.compareAndSetState(operationA, 'unverified', 'verified'),
      store.compareAndSetState(operationA, 'unverified', 'verified'),
    ]);
    assert.equal([first, second].filter(Boolean).length, 1);
    assert.equal(await store.getState(operationA), 'verified');
  } finally {
    database.close();
  }
});

test('D1 settlement confirmation stores state and receipt in one conditional write', async () => {
  const { database, store } = freshStore();
  try {
    await store.claimPayment(paymentA, requestA, operationA);
    assert.equal(await store.confirmSettlement(operationA, receipt), false);
    assert.equal(await store.compareAndSetState(operationA, 'unverified', 'verified'), true);
    assert.equal(await store.compareAndSetState(operationA, 'verified', 'settling'), true);
    assert.equal(await store.confirmSettlement(operationA, receipt), true);
    assert.equal(await store.getState(operationA), 'settled');
    assert.deepEqual(await store.getSettlementReceipt(operationA), receipt);
  } finally {
    database.close();
  }
});

test('D1 state and confirmed receipt survive closing and reopening the database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nano-json-lens-d1-'));
  const filename = join(directory, 'payments.sqlite');
  try {
    const firstDatabase = new SQLiteD1Database(filename);
    firstDatabase.exec(migration);
    const firstStore = createD1PaymentStateStore(firstDatabase);
    await firstStore.claimPayment(paymentA, requestA, operationA);
    await firstStore.compareAndSetState(operationA, 'unverified', 'verified');
    await firstStore.compareAndSetState(operationA, 'verified', 'settling');
    assert.equal(await firstStore.confirmSettlement(operationA, receipt), true);
    firstDatabase.close();

    const restartedDatabase = new SQLiteD1Database(filename);
    const restartedStore = createD1PaymentStateStore(restartedDatabase);
    assert.equal(await restartedStore.getState(operationA), 'settled');
    assert.deepEqual(await restartedStore.getSettlementReceipt(operationA), receipt);
    assert.deepEqual(await restartedStore.claimPayment(paymentA, requestA, operationA), {
      status: 'existing',
      operationId: operationA,
    });
    restartedDatabase.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
