import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentBootstrap } from '../src/payment/bootstrap.ts';
import { MemoryPaymentStateStore } from '../src/payment/memory-store.ts';
import { createProductionNanoPaymentGate } from '../src/payment/production-gate.ts';
import type { PaymentStateStore } from '../src/payment/store.ts';
import type { SettlementReceipt } from '../src/server.ts';
import type { PaymentState } from '../src/payment/state.ts';

const payTo = 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt';

function fakeResourceServer() {
  return {
    async initialize(): Promise<void> {},
    async buildPaymentRequirements(config: Record<string, unknown>) {
      return [{
        scheme: 'exact',
        network: 'nano:mainnet',
        asset: 'XNO',
        amount: '10000000000000000000000000000',
        payTo,
        extra: config.extra as Record<string, unknown>,
      }];
    },
    async createPaymentRequiredResponse(requirements: unknown[]) {
      return { x402Version: 2, accepts: requirements };
    },
    async verifyPayment() {
      return { isValid: false };
    },
    async settlePayment() {
      throw new Error('settlement must not be reached in composition tests');
    },
  };
}

class ProductionSafeTestStore implements PaymentStateStore {
  readonly productionSafe = true;
  async claimPayment() { return { status: 'claimed' } as const; }
  async getState(): Promise<PaymentState | undefined> { return undefined; }
  async compareAndSetState(): Promise<boolean> { return false; }
  async saveSettlementReceipt(_operationId: string, _receipt: SettlementReceipt): Promise<void> {}
  async getSettlementReceipt(): Promise<SettlementReceipt | undefined> { return undefined; }
}

function options(bootstrap: ReturnType<typeof createPaymentBootstrap>, stateStore: PaymentStateStore) {
  return {
    bootstrap,
    stateStore,
    payTo,
    priceXno: '0.01',
    facilitatorUrl: 'https://facilitator.pursekeeper.dev',
  };
}

test('production payment gate rejects a cold bootstrap', () => {
  const bootstrap = createPaymentBootstrap(fakeResourceServer());

  assert.throws(
    () => createProductionNanoPaymentGate(options(bootstrap, new ProductionSafeTestStore())),
    /ready/i,
  );
});

test('production payment gate rejects a non-production replay store', async () => {
  const bootstrap = createPaymentBootstrap(fakeResourceServer());
  await bootstrap.initialize();

  assert.throws(
    () => createProductionNanoPaymentGate(options(bootstrap, new MemoryPaymentStateStore())),
    /production-safe/i,
  );
});

test('production payment gate wires only a ready resource server into the Nano gate', async () => {
  const bootstrap = createPaymentBootstrap(fakeResourceServer());
  await bootstrap.initialize();

  const gate = createProductionNanoPaymentGate(options(bootstrap, new ProductionSafeTestStore()));
  const challenge = await gate.challenge({
    requestDigest: 'a'.repeat(64),
    resourceUrl: 'https://seller.example/api/lens',
  });

  assert.equal(challenge.x402Version, 2);
  const accepts = challenge.accepts as Array<Record<string, unknown>>;
  assert.equal(accepts.length, 1);
  assert.equal(accepts[0]?.scheme, 'exact');
  assert.equal(accepts[0]?.network, 'nano:mainnet');
  assert.equal(accepts[0]?.payTo, payTo);
});
