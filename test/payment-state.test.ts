import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionPaymentState } from '../src/payment/state.ts';

test('normal payment lifecycle reaches fulfilled only through confirmed settlement', () => {
  let state = 'unverified' as const;
  state = transitionPaymentState(state, 'verified');
  state = transitionPaymentState(state, 'settling');
  state = transitionPaymentState(state, 'settled');
  state = transitionPaymentState(state, 'fulfilled');
  assert.equal(state, 'fulfilled');
});

test('settlement uncertainty is explicit and cannot directly fulfill', () => {
  assert.equal(transitionPaymentState('settling', 'settlement_unknown'), 'settlement_unknown');
  assert.throws(() => transitionPaymentState('settlement_unknown', 'fulfilled'));
});

test('state machine rejects settlement and fulfillment skips', () => {
  assert.throws(() => transitionPaymentState('unverified', 'settled'));
  assert.throws(() => transitionPaymentState('verified', 'fulfilled'));
  assert.throws(() => transitionPaymentState('settling', 'fulfilled'));
});

test('confirmed settlement preserves customer entitlement after delivery failure', () => {
  assert.equal(transitionPaymentState('settled', 'settled'), 'settled');
  assert.equal(transitionPaymentState('settled', 'fulfilled'), 'fulfilled');
});

test('unknown settlement can return to verified only after reconciliation says no settlement occurred', () => {
  assert.equal(
    transitionPaymentState('settlement_unknown', 'verified', { reconciledNotSettled: true }),
    'verified',
  );
  assert.throws(() => transitionPaymentState('settlement_unknown', 'verified'));
});
