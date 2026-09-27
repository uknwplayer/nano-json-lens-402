import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createPaymentBootstrap } from '../src/payment/bootstrap.ts';
import { createCloudflareWorkerRuntime } from '../src/worker-runtime.ts';
import workerEntrypoint, { PAID_TRAFFIC_ENABLED } from '../src/worker.ts';
import { SQLiteD1Database } from './support/sqlite-d1.ts';

const payTo = 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt';
const facilitatorUrl = 'https://facilitator.pursekeeper.dev';
const migration = readFileSync(new URL('../migrations/0001_payment_state.sql', import.meta.url), 'utf8');

function fakeResourceServer() {
  let initializeCalls = 0;
  let verifyCalls = 0;
  let settleCalls = 0;

  return {
    counters: {
      get initializeCalls() { return initializeCalls; },
      get verifyCalls() { return verifyCalls; },
      get settleCalls() { return settleCalls; },
    },
    async initialize(): Promise<void> { initializeCalls += 1; },
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
    async createPaymentRequiredResponse(requirements: unknown[], resource: Record<string, unknown>) {
      return { x402Version: 2, accepts: requirements, resource };
    },
    async verifyPayment() {
      verifyCalls += 1;
      return { isValid: true };
    },
    async settlePayment() {
      settleCalls += 1;
      return {
        success: true,
        transaction: 'a'.repeat(64),
        network: 'nano:mainnet',
      };
    },
  };
}

function database(): SQLiteD1Database {
  const db = new SQLiteD1Database();
  db.exec(migration);
  return db;
}

function runtime(allowPaidTraffic = false, resourceServer = fakeResourceServer()) {
  return {
    resourceServer,
    worker: createCloudflareWorkerRuntime({
      bootstrap: createPaymentBootstrap(resourceServer),
      payTo,
      priceXno: '0.01',
      facilitatorUrl,
      allowPaidTraffic,
    }),
  };
}

const body = JSON.stringify({ document: { hello: 'world' } });
const requestDigest = createHash('sha256').update(body, 'utf8').digest('hex');
const nanoBlock = Object.freeze({
  type: 'state',
  account: payTo,
  previous: 'A'.repeat(64),
  representative: payTo,
  balance: '123456789',
  link: 'B'.repeat(64),
  signature: 'C'.repeat(128),
  work: 'D'.repeat(16),
});

function paymentProof(): string {
  return Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: {
      scheme: 'exact',
      network: 'nano:mainnet',
      asset: 'XNO',
      amount: '10000000000000000000000000000',
      payTo,
      extra: { requestDigest },
    },
    payload: { block: nanoBlock },
  }), 'utf8').toString('base64');
}

function lensRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://nano-json-lens-402.example/api/lens', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

test('production Worker entrypoint is explicitly challenge-only', () => {
  assert.equal(PAID_TRAFFIC_ENABLED, false);
  assert.equal(typeof workerEntrypoint.fetch, 'function');
});

test('health stays independent of payment bootstrap and D1', async () => {
  const { worker, resourceServer } = runtime();

  const response = await worker.fetch(new Request('https://nano-json-lens-402.example/health'), {} as never);

  assert.equal(response.status, 200);
  assert.equal(resourceServer.counters.initializeCalls, 0);
});

test('first unpaid lens request initializes once and returns a normalized production 402 challenge', async () => {
  const { worker, resourceServer } = runtime();
  const db = database();

  const first = await worker.fetch(lensRequest(), { PAYMENT_DB: db });
  const second = await worker.fetch(lensRequest(), { PAYMENT_DB: db });

  assert.equal(first.status, 402);
  assert.equal(second.status, 402);
  assert.equal(resourceServer.counters.initializeCalls, 1);

  const payload = await first.json() as Record<string, unknown>;
  const requirements = payload.paymentRequirements as Record<string, unknown>;
  const resource = requirements.resource as Record<string, unknown>;
  assert.equal(resource.url, 'https://nano-json-lens-402.example/api/lens');
  db.close();
});

test('missing D1 binding fails closed for the paid resource without breaking health', async () => {
  const { worker, resourceServer } = runtime();

  const response = await worker.fetch(lensRequest(), {} as never);

  assert.equal(response.status, 503);
  assert.equal(resourceServer.counters.initializeCalls, 0);
});

test('non-HTTPS production resource origin is rejected before payment bootstrap', async () => {
  const { worker, resourceServer } = runtime();
  const db = database();
  const request = new Request('http://nano-json-lens-402.example/api/lens', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

  const response = await worker.fetch(request, { PAYMENT_DB: db });

  assert.equal(response.status, 400);
  assert.equal(resourceServer.counters.initializeCalls, 0);
  db.close();
});

test('challenge-only runtime never reaches verify or settle when a proof is submitted', async () => {
  const { worker, resourceServer } = runtime();
  const db = database();

  const response = await worker.fetch(lensRequest({ 'payment-signature': 'AAAA' }), { PAYMENT_DB: db });

  assert.equal(response.status, 503);
  assert.equal(resourceServer.counters.verifyCalls, 0);
  assert.equal(resourceServer.counters.settleCalls, 0);
  db.close();
});

test('payment-enabled runtime verifies and settles one valid proof before releasing analysis', async () => {
  const { worker, resourceServer } = runtime(true);
  const db = database();

  const response = await worker.fetch(lensRequest({ 'payment-signature': paymentProof() }), { PAYMENT_DB: db });

  assert.equal(response.status, 200);
  assert.equal(resourceServer.counters.initializeCalls, 1);
  assert.equal(resourceServer.counters.verifyCalls, 1);
  assert.equal(resourceServer.counters.settleCalls, 1);
  assert.ok(response.headers.get('payment-response'));
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(payload.mode, 'document');
  assert.equal((payload.analysis as Record<string, unknown>).canonicalJson, '{"hello":"world"}');
  db.close();
});

test('payment-enabled runtime rejects malformed proof without protected output or settlement', async () => {
  const { worker, resourceServer } = runtime(true);
  const db = database();

  const response = await worker.fetch(lensRequest({ 'payment-signature': 'AAAA' }), { PAYMENT_DB: db });

  assert.equal(response.status, 402);
  assert.equal(resourceServer.counters.verifyCalls, 0);
  assert.equal(resourceServer.counters.settleCalls, 0);
  assert.equal(response.headers.get('payment-response'), null);
  const payload = await response.json() as Record<string, unknown>;
  assert.equal((payload.error as Record<string, unknown>).code, 'PAYMENT_REJECTED');
  assert.equal('analysis' in payload, false);
  db.close();
});
