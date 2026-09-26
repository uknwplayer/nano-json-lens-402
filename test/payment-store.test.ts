import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPaymentStateStore } from '../src/payment/memory-store.ts';

const requestA = 'a'.repeat(64);
const requestB = 'b'.repeat(64);
const operationA = 'c'.repeat(64);
const paymentA = 'nano-payment-A';
const receipt = Object.freeze({
  success: true as const,
  transaction: 'd'.repeat(64),
  network: 'nano:mainnet' as const,
  payer: 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt',
});

test('first claimant atomically owns a payment identity', async () => {
  const store = new MemoryPaymentStateStore();
  const [first, second] = await Promise.all([
    store.claimPayment(paymentA, requestA, operationA),
    store.claimPayment(paymentA, requestA, operationA),
  ]);

  assert.equal([first.status, second.status].filter(status => status === 'claimed').length, 1);
  assert.equal([first.status, second.status].filter(status => status === 'existing').length, 1);
});

test('same payment and same request is an idempotent existing operation', async () => {
  const store = new MemoryPaymentStateStore();
  assert.deepEqual(await store.claimPayment(paymentA, requestA, operationA), { status: 'claimed' });
  assert.deepEqual(await store.claimPayment(paymentA, requestA, operationA), {
    status: 'existing',
    operationId: operationA,
  });
});

test('same payment cannot be rebound to a different protected request', async () => {
  const store = new MemoryPaymentStateStore();
  await store.claimPayment(paymentA, requestA, operationA);
  assert.deepEqual(await store.claimPayment(paymentA, requestB, 'd'.repeat(64)), {
    status: 'conflict',
  });
});

test('operation state compare-and-set prevents stale concurrent transitions', async () => {
  const store = new MemoryPaymentStateStore();
  await store.claimPayment(paymentA, requestA, operationA);

  const [first, second] = await Promise.all([
    store.compareAndSetState(operationA, 'unverified', 'verified'),
    store.compareAndSetState(operationA, 'unverified', 'verified'),
  ]);

  assert.equal([first, second].filter(Boolean).length, 1);
  assert.equal(await store.getState(operationA), 'verified');
});

test('settlement confirmation atomically stores receipt with settling to settled transition', async () => {
  const store = new MemoryPaymentStateStore();
  await store.claimPayment(paymentA, requestA, operationA);
  assert.equal(await store.compareAndSetState(operationA, 'unverified', 'verified'), true);
  assert.equal(await store.compareAndSetState(operationA, 'verified', 'settling'), true);

  assert.equal(await store.confirmSettlement(operationA, receipt), true);
  assert.equal(await store.getState(operationA), 'settled');
  assert.deepEqual(await store.getSettlementReceipt(operationA), receipt);
});

test('settlement confirmation fails closed from a stale state and stores no receipt', async () => {
  const store = new MemoryPaymentStateStore();
  await store.claimPayment(paymentA, requestA, operationA);

  assert.equal(await store.confirmSettlement(operationA, receipt), false);
  assert.equal(await store.getState(operationA), 'unverified');
  assert.equal(await store.getSettlementReceipt(operationA), undefined);
});

test('memory store does not survive a new instance and is explicitly non-production', async () => {
  const first = new MemoryPaymentStateStore();
  await first.claimPayment(paymentA, requestA, operationA);

  const restarted = new MemoryPaymentStateStore();
  assert.equal(await restarted.getState(operationA), undefined);
  assert.equal(restarted.productionSafe, false);
});
