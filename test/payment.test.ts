import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNanoPaymentGate } from '../src/payment.ts';
import { deriveNanoBlockPaymentIdentity, deriveOperationId } from '../src/payment/identity.ts';
import { MemoryPaymentStateStore } from '../src/payment/memory-store.ts';
import type { PaymentContext } from '../src/server.ts';

const payTo = 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt';
const amount = '10000000000000000000000000000';
const context: PaymentContext = {
  resourceUrl: 'https://lens.example/api/lens',
  requestDigest: 'a'.repeat(64),
};

interface FakeRequirements {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  extra?: Record<string, unknown>;
}

interface FakeConfig {
  scheme?: unknown;
  network?: unknown;
  payTo?: unknown;
  extra?: unknown;
}

function fakeServer(options: {
  verifyValid?: boolean;
  settleSuccess?: boolean;
  throwVerify?: boolean;
  throwSettle?: boolean;
  settleDelayMs?: number;
} = {}) {
  const calls: string[] = [];
  return {
    calls,
    server: {
      async buildPaymentRequirements(config: Record<string, unknown>): Promise<FakeRequirements[]> {
        calls.push('build');
        const typed = config as FakeConfig;
        if (typeof typed.scheme !== 'string' || typeof typed.network !== 'string' ||
            typeof typed.payTo !== 'string' ||
            (typed.extra !== undefined && (typed.extra === null || typeof typed.extra !== 'object' || Array.isArray(typed.extra)))) {
          throw new Error('invalid test payment config');
        }
        return [{
          scheme: typed.scheme,
          network: typed.network,
          asset: 'XNO',
          amount,
          payTo: typed.payTo,
          ...(typed.extra === undefined ? {} : { extra: typed.extra as Record<string, unknown> }),
        }];
      },
      async createPaymentRequiredResponse(requirements: FakeRequirements[], resource: Record<string, unknown>) {
        calls.push('challenge');
        return { x402Version: 2, resource, accepts: requirements };
      },
      async verifyPayment() {
        calls.push('verify');
        if (options.throwVerify) throw new Error('private verify failure');
        return { isValid: options.verifyValid ?? true, invalidReason: 'invalid' };
      },
      async settlePayment() {
        calls.push('settle');
        if (options.settleDelayMs) await new Promise(resolve => setTimeout(resolve, options.settleDelayMs));
        if (options.throwSettle) throw new Error('private settle failure');
        return options.settleSuccess === false
          ? { success: false, errorReason: 'rejected' }
          : { success: true, transaction: 'b'.repeat(64), network: 'nano:mainnet', payer: 'nano_test_payer' };
      },
    },
  };
}

const nanoBlock = {
  type: 'state',
  account: payTo,
  previous: 'A'.repeat(64),
  representative: payTo,
  balance: '123456789',
  link: 'B'.repeat(64),
  signature: 'C'.repeat(128),
  work: 'D'.repeat(16),
};

function proof(
  accepted: Partial<FakeRequirements> = {},
  envelope: Record<string, unknown> = {},
) {
  return Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: {
      scheme: 'exact', network: 'nano:mainnet', asset: 'XNO', amount, payTo,
      extra: { requestDigest: context.requestDigest },
      ...accepted,
    },
    payload: { block: nanoBlock },
    ...envelope,
  }), 'utf8').toString('base64');
}

function setup(fake = fakeServer(), stateStore?: MemoryPaymentStateStore) {
  return {
    fake,
    gate: createNanoPaymentGate({
      payTo,
      priceXno: '0.01',
      facilitatorUrl: 'https://facilitator.pursekeeper.dev',
      resourceServer: fake.server,
      ...(stateStore === undefined ? {} : { stateStore }),
    }),
  };
}

test('challenge advertises exact Nano mainnet terms and request digest metadata', async () => {
  const { gate } = setup();
  const challenge = await gate.challenge(context) as any;
  assert.equal(challenge.x402Version, 2);
  assert.equal(challenge.resource.url, context.resourceUrl);
  assert.equal(challenge.accepts[0].scheme, 'exact');
  assert.equal(challenge.accepts[0].network, 'nano:mainnet');
  assert.equal(challenge.accepts[0].asset, 'XNO');
  assert.equal(challenge.accepts[0].amount, amount);
  assert.equal(challenge.accepts[0].payTo, payTo);
  assert.equal(challenge.accepts[0].extra.requestDigest, context.requestDigest);
});

test('rejects malformed payment proof before facilitator calls', async () => {
  const { gate, fake } = setup();
  assert.deepEqual(await gate.verifyAndSettle(context, '%%%not-base64%%%'), { settled: false });
  assert.deepEqual(fake.calls, []);
});

test('rejects payment terms that do not match network amount address or request metadata', async () => {
  for (const changed of [
    { network: 'nano:testnet' },
    { amount: '1' },
    { payTo: 'nano_wrong' },
    { extra: { requestDigest: 'c'.repeat(64) } },
  ]) {
    const { gate, fake } = setup();
    assert.deepEqual(await gate.verifyAndSettle(context, proof(changed)), { settled: false });
    assert.deepEqual(fake.calls, []);
  }
});

test('verification rejection never attempts settlement', async () => {
  const fake = fakeServer({ verifyValid: false });
  const { gate } = setup(fake);
  assert.deepEqual(await gate.verifyAndSettle(context, proof()), { settled: false });
  assert.deepEqual(fake.calls, ['build', 'verify']);
});

test('settlement failure does not report a paid result', async () => {
  const fake = fakeServer({ settleSuccess: false });
  const { gate } = setup(fake);
  assert.deepEqual(await gate.verifyAndSettle(context, proof()), { settled: false });
  assert.deepEqual(fake.calls, ['build', 'verify', 'settle']);
});

test('facilitator transport failures propagate for the HTTP layer to map to 503', async () => {
  for (const fake of [fakeServer({ throwVerify: true }), fakeServer({ throwSettle: true })]) {
    const { gate } = setup(fake);
    await assert.rejects(() => gate.verifyAndSettle(context, proof()));
  }
});

test('successful settlement returns only bounded receipt metadata', async () => {
  const fake = fakeServer();
  const { gate } = setup(fake);
  const result = await gate.verifyAndSettle(context, proof());
  assert.deepEqual(result, {
    settled: true,
    receipt: { success: true, transaction: 'b'.repeat(64), network: 'nano:mainnet', payer: 'nano_test_payer' },
  });
  assert.deepEqual(fake.calls, ['build', 'verify', 'settle']);
});

test('concurrent replay of one proof can reach settlement at most once', async () => {
  const fake = fakeServer({ settleDelayMs: 20 });
  const { gate } = setup(fake, new MemoryPaymentStateStore());
  const paymentProof = proof();

  const results = await Promise.all([
    gate.verifyAndSettle(context, paymentProof),
    gate.verifyAndSettle(context, paymentProof),
  ]);

  assert.equal(fake.calls.filter(call => call === 'settle').length, 1);
  assert.equal(results.filter(result => result.settled).length, 1);
});

test('equivalent envelopes for one Nano block cannot settle twice', async () => {
  const fake = fakeServer();
  const { gate } = setup(fake, new MemoryPaymentStateStore());

  const first = await gate.verifyAndSettle(context, proof({}, { envelopeNote: 'first' }));
  const second = await gate.verifyAndSettle(context, proof({}, { envelopeNote: 'second' }));

  assert.equal(first.settled, true);
  assert.equal(second.settled, true);
  assert.equal(fake.calls.filter(call => call === 'settle').length, 1);
});

test('retry after confirmed settlement is idempotent and never settles twice', async () => {
  const fake = fakeServer();
  const { gate } = setup(fake, new MemoryPaymentStateStore());
  const paymentProof = proof();

  const first = await gate.verifyAndSettle(context, paymentProof);
  const second = await gate.verifyAndSettle(context, paymentProof);

  assert.equal(first.settled, true);
  assert.equal(second.settled, true);
  assert.equal(fake.calls.filter(call => call === 'settle').length, 1);
});

test('ambiguous settlement becomes settlement_unknown and retry cannot settle again', async () => {
  const stateStore = new MemoryPaymentStateStore();
  const fake = fakeServer({ throwSettle: true });
  const { gate } = setup(fake, stateStore);
  const paymentProof = proof();
  const decoded = JSON.parse(Buffer.from(paymentProof, 'base64').toString('utf8')) as unknown;
  const paymentIdentity = deriveNanoBlockPaymentIdentity(decoded);
  assert.notEqual(paymentIdentity, undefined);
  const operationId = deriveOperationId(context.requestDigest, paymentIdentity!);

  await assert.rejects(() => gate.verifyAndSettle(context, paymentProof));
  assert.equal(await stateStore.getState(operationId), 'settlement_unknown');

  const retry = await gate.verifyAndSettle(context, paymentProof);
  assert.deepEqual(retry, { settled: false });
  assert.equal(fake.calls.filter(call => call === 'settle').length, 1);
});
