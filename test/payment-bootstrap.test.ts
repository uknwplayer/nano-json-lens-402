import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentBootstrap } from '../src/payment/bootstrap.ts';

function deferred() {
  let resolve!: () => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('payment bootstrap stays unavailable until initialization succeeds', async () => {
  const pending = deferred();
  let initializeCalls = 0;
  const resourceServer = {
    async initialize() {
      initializeCalls += 1;
      await pending.promise;
    },
  };

  const bootstrap = createPaymentBootstrap(resourceServer);
  assert.equal(bootstrap.status(), 'cold');
  assert.equal(bootstrap.isReady(), false);
  assert.throws(() => bootstrap.getReadyResourceServer(), /not ready/i);

  const first = bootstrap.initialize();
  const second = bootstrap.initialize();
  await Promise.resolve();

  assert.equal(initializeCalls, 1);
  assert.equal(bootstrap.status(), 'initializing');
  assert.equal(bootstrap.isReady(), false);
  assert.throws(() => bootstrap.getReadyResourceServer(), /not ready/i);

  pending.resolve();
  assert.equal(await first, resourceServer);
  assert.equal(await second, resourceServer);
  assert.equal(bootstrap.status(), 'ready');
  assert.equal(bootstrap.isReady(), true);
  assert.equal(bootstrap.getReadyResourceServer(), resourceServer);
});

test('initialization failure is fail-closed and is not retried inside one bootstrap', async () => {
  let initializeCalls = 0;
  const resourceServer = {
    async initialize() {
      initializeCalls += 1;
      throw new Error('private facilitator detail');
    },
  };

  const bootstrap = createPaymentBootstrap(resourceServer);

  await assert.rejects(() => bootstrap.initialize(), /initialization failed/i);
  assert.equal(initializeCalls, 1);
  assert.equal(bootstrap.status(), 'failed');
  assert.equal(bootstrap.isReady(), false);
  assert.throws(() => bootstrap.getReadyResourceServer(), /not ready/i);

  await assert.rejects(() => bootstrap.initialize(), /initialization failed/i);
  assert.equal(initializeCalls, 1);
});
