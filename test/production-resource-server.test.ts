import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProductionNanoResourceServer } from '../src/payment/production-resource-server.ts';

test('constructs the production Nano resource server offline with exact mainnet registered', () => {
  const resourceServer = createProductionNanoResourceServer({
    facilitatorUrl: 'https://facilitator.pursekeeper.dev',
  });

  assert.equal(resourceServer.hasRegisteredScheme('nano:mainnet', 'exact'), true);
  assert.equal(typeof resourceServer.initialize, 'function');
  assert.equal(typeof resourceServer.buildPaymentRequirements, 'function');
  assert.equal(typeof resourceServer.createPaymentRequiredResponse, 'function');
  assert.equal(typeof resourceServer.verifyPayment, 'function');
  assert.equal(typeof resourceServer.settlePayment, 'function');
});
