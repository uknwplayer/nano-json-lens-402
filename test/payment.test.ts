import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNanoPaymentGate,
  deriveOperationId,
  deriveRequestId,
  type NanoPaymentRequirement,
  type NanoProtocolAdapter,
  type PaymentRecord,
  type PaymentStateStore,
} from '../src/payment.ts';

const base = {
  resourceUrl: 'https://lens.example.test/api/lens',
  requestDigest: '00'.repeat(32),
  priceRaw: '10000000000000000000000000000',
  network: 'nano:mainnet' as const,
  payTo: 'nano_test_receiving_address_only_for_identity_tests',
};

const context = { resourceUrl: base.resourceUrl, requestDigest: base.requestDigest };
const paymentIdentity = 'ab'.repeat(32);
const transaction = 'cd'.repeat(32);

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

test('operation identity binds a payment identity to one request identity', () => {
  const requestId = deriveRequestId(base);
  const first = deriveOperationId(requestId, paymentIdentity);

  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, deriveOperationId(requestId, paymentIdentity));
  assert.notEqual(first, deriveOperationId('11'.repeat(32), paymentIdentity));
  assert.notEqual(first, deriveOperationId(requestId, '22'.repeat(32)));
});

class MemoryStore implements PaymentStateStore {
  readonly byPayment = new Map<string, PaymentRecord>();

  async claim(record: PaymentRecord) {
    const existing = this.byPayment.get(record.paymentIdentity);
    if (!existing) {
      this.byPayment.set(record.paymentIdentity, record);
      return { kind: 'new' as const, record };
    }
    if (existing.requestId !== record.requestId) return { kind: 'conflict' as const, record: existing };
    return { kind: 'existing' as const, record: existing };
  }

  async update(operationId: string, patch: Partial<PaymentRecord>) {
    const current = [...this.byPayment.values()].find((record) => record.operationId === operationId);
    if (!current) throw new Error('missing payment record');
    const next = { ...current, ...patch };
    this.byPayment.set(next.paymentIdentity, next);
    return next;
  }
}

class FakeProtocol implements NanoProtocolAdapter {
  lastRequirement?: NanoPaymentRequirement;
  lastResourceUrl?: string;
  nextAccepted?: NanoPaymentRequirement;
  nextIdentity = paymentIdentity;
  verifyValid = true;
  settleSuccess = true;
  throwOnSettle = false;
  verifyCalls = 0;
  settleCalls = 0;

  async buildChallenge(requirement: NanoPaymentRequirement, resourceUrl: string) {
    this.lastRequirement = structuredClone(requirement);
    this.lastResourceUrl = resourceUrl;
    return { x402Version: 2, resource: { url: resourceUrl }, accepts: [requirement] };
  }

  decodeProof(_proof: string) {
    if (!this.nextAccepted) throw new Error('test proof not configured');
    return { paymentIdentity: this.nextIdentity, payload: { test: true }, accepted: this.nextAccepted };
  }

  async verify() {
    this.verifyCalls += 1;
    return { isValid: this.verifyValid, payer: 'nano_test_payer' };
  }

  async settle() {
    this.settleCalls += 1;
    if (this.throwOnSettle) throw new Error('facilitator connection lost');
    return this.settleSuccess
      ? { success: true as const, transaction, network: 'nano:mainnet' as const, payer: 'nano_test_payer' }
      : { success: false as const };
  }
}

function makeGate(protocol = new FakeProtocol(), store = new MemoryStore()) {
  return {
    protocol,
    store,
    gate: createNanoPaymentGate({ priceRaw: base.priceRaw, payTo: base.payTo, protocol, store }),
  };
}

async function armValidProof(gate: ReturnType<typeof makeGate>) {
  await gate.gate.challenge(context);
  gate.protocol.nextAccepted = structuredClone(gate.protocol.lastRequirement!);
}

test('challenge binds mainnet amount, recipient, resource and request id', async () => {
  const setup = makeGate();
  const challenge = await setup.gate.challenge(context);
  const requestId = deriveRequestId(base);

  assert.deepEqual(challenge, {
    x402Version: 2,
    resource: { url: base.resourceUrl },
    accepts: [{
      scheme: 'exact', network: 'nano:mainnet', asset: 'XNO', amount: base.priceRaw,
      payTo: base.payTo, extra: { requestId },
    }],
  });
});

test('mismatched accepted payment terms are rejected before facilitator verification', async () => {
  const fields: Array<(requirement: NanoPaymentRequirement) => NanoPaymentRequirement> = [
    (r) => ({ ...r, network: 'nano:testnet' }),
    (r) => ({ ...r, amount: `${r.amount}1` }),
    (r) => ({ ...r, payTo: `${r.payTo}_other` }),
    (r) => ({ ...r, extra: { requestId: '00'.repeat(32) } }),
  ];

  for (const mutate of fields) {
    const setup = makeGate();
    await setup.gate.challenge(context);
    setup.protocol.nextAccepted = mutate(structuredClone(setup.protocol.lastRequirement!));
    const result = await setup.gate.verifyAndSettle(context, 'proof');
    assert.deepEqual(result, { settled: false });
    assert.equal(setup.protocol.verifyCalls, 0);
    assert.equal(setup.protocol.settleCalls, 0);
  }
});

test('invalid verification fails closed without settlement', async () => {
  const setup = makeGate();
  await armValidProof(setup);
  setup.protocol.verifyValid = false;

  assert.deepEqual(await setup.gate.verifyAndSettle(context, 'proof'), { settled: false });
  assert.equal(setup.protocol.verifyCalls, 1);
  assert.equal(setup.protocol.settleCalls, 0);
});

test('successful settlement is idempotent for the same payment and request', async () => {
  const setup = makeGate();
  await armValidProof(setup);

  const first = await setup.gate.verifyAndSettle(context, 'proof');
  const second = await setup.gate.verifyAndSettle(context, 'proof');

  assert.deepEqual(first, second);
  assert.deepEqual(first, { settled: true, receipt: {
    success: true, transaction, network: 'nano:mainnet', payer: 'nano_test_payer',
  } });
  assert.equal(setup.protocol.settleCalls, 1);
});

test('the same payment identity cannot authorize a different protected request', async () => {
  const setup = makeGate();
  await armValidProof(setup);
  assert.equal((await setup.gate.verifyAndSettle(context, 'proof')).settled, true);

  const otherContext = { ...context, requestDigest: '44'.repeat(32) };
  await setup.gate.challenge(otherContext);
  setup.protocol.nextAccepted = structuredClone(setup.protocol.lastRequirement!);

  assert.deepEqual(await setup.gate.verifyAndSettle(otherContext, 'proof'), { settled: false });
  assert.equal(setup.protocol.settleCalls, 1);
});

test('ambiguous settlement is persisted and never retried blindly', async () => {
  const setup = makeGate();
  await armValidProof(setup);
  setup.protocol.throwOnSettle = true;

  await assert.rejects(() => setup.gate.verifyAndSettle(context, 'proof'));
  setup.protocol.throwOnSettle = false;
  await assert.rejects(() => setup.gate.verifyAndSettle(context, 'proof'), /settlement outcome is unknown/i);
  assert.equal(setup.protocol.settleCalls, 1);
});
