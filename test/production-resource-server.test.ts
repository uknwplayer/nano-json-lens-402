import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProductionNanoResourceServer } from '../src/payment/production-resource-server.ts';

const payTo = 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt';

test('constructs the production Nano resource server and builds exact mainnet requirements offline', async () => {
  const resourceServer = createProductionNanoResourceServer({
    facilitatorUrl: 'https://facilitator.pursekeeper.dev',
  });

  const requirements = await resourceServer.buildPaymentRequirements({
    scheme: 'exact',
    network: 'nano:mainnet',
    price: '0.01',
    payTo,
    description: 'Deterministic JSON structural analysis',
    mimeType: 'application/json',
    extra: { requestDigest: 'a'.repeat(64) },
  });

  assert.equal(requirements.length, 1);
  assert.equal(requirements[0]?.scheme, 'exact');
  assert.equal(requirements[0]?.network, 'nano:mainnet');
  assert.equal(requirements[0]?.asset, 'XNO');
  assert.equal(requirements[0]?.amount, '10000000000000000000000000000');
  assert.equal(requirements[0]?.payTo, payTo);
  assert.equal(requirements[0]?.extra?.requestDigest, 'a'.repeat(64));
});
