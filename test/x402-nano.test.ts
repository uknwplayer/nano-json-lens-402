import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { Nano } from 'nano-sdk';
import { createX402NanoProtocolAdapter } from '../src/x402-nano.ts';
import type { NanoPaymentRequirement } from '../src/payment.ts';

const PAY_TO = 'nano_1h56yw7cb3mb1ojkcfsjbryg68r4436suedtbwsoz9jwwd4stgzr744ft7es';
const PAYER = 'nano_1dz4mfgu5a1iq1zmnfcui1kwuno3nw9togicmmszm4ci7w51nqjd3sbej48e';
const PRICE_RAW = '6000000000000000000000000000';
const TX = 'E2FB233EF4554077A7BF1AA85851D5BF0B36965D2B0FB504B2BC778AB89917D3';
const RESOURCE = 'https://lens.example.test/api/lens';
const REQUEST_ID = 'ab'.repeat(32);

const BLOCK = {
  type: 'state' as const,
  account: PAYER,
  previous: '8AEF920ABA234F23259B018F4AF945E849477A8171C5116FAF45736817D838A4',
  representative: 'nano_3chartsi6ja8ay1qq9xg3xegqnbg1qx76nouw6jedyb8wx3r4wu94rxap7hg',
  balance: '91258410000000000000000000000',
  link: '3C64F70AA4866905632537314E3CE21B0210499DB17A4F335F9E3CE2C59D3BF8',
  link_as_account: PAY_TO,
  work: 'dfbc0fe36423277a',
  signature: 'D7A2146B4EDB0AD3975337580919A9FBECC570A2E554556E9C84257C9D0E6F49D055300B0C747059C1B7BFB224B7635A24CB150FC16B975EF29873F776264906',
};

const REQUIREMENT: NanoPaymentRequirement = {
  scheme: 'exact',
  network: 'nano:mainnet',
  asset: 'XNO',
  amount: PRICE_RAW,
  payTo: PAY_TO,
  extra: { requestId: REQUEST_ID },
};

async function readJson(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function startFakeFacilitator() {
  const calls = { supported: 0, verify: [] as Record<string, unknown>[], settle: [] as Record<string, unknown>[] };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    res.setHeader('content-type', 'application/json');

    if (req.method === 'GET' && url.pathname === '/supported') {
      calls.supported += 1;
      res.end(JSON.stringify({
        kinds: [{ x402Version: 2, scheme: 'exact', network: 'nano:mainnet' }],
        extensions: [],
        signers: { 'nano:*': [] },
      }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/verify') {
      calls.verify.push(await readJson(req));
      res.end(JSON.stringify({ isValid: true, payer: PAYER }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/settle') {
      calls.settle.push(await readJson(req));
      res.end(JSON.stringify({ success: true, transaction: TX, network: 'nano:mainnet', payer: PAYER }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake facilitator did not bind');
  return {
    calls,
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      server.close();
      await once(server, 'close');
    },
  };
}

function makeProof(accepted: unknown) {
  const paymentPayload = {
    x402Version: 2,
    resource: { url: RESOURCE },
    accepted,
    payload: { block: BLOCK },
  };
  return Buffer.from(JSON.stringify(paymentPayload), 'utf8').toString('base64');
}

test('adapter builds SDK-native challenge with raw XNO terms and request binding', async (t) => {
  const fake = await startFakeFacilitator();
  t.after(() => fake.close());
  const adapter = await createX402NanoProtocolAdapter({ facilitatorUrl: fake.url });

  const challenge = await adapter.buildChallenge(REQUIREMENT, RESOURCE);
  assert.equal(challenge.x402Version, 2);
  assert.deepEqual(challenge.resource, {
    url: RESOURCE,
    description: 'Deterministic JSON analysis',
    mimeType: 'application/json',
  });
  const accepts = challenge.accepts as Array<Record<string, unknown>>;
  assert.equal(accepts.length, 1);
  assert.equal(accepts[0].scheme, 'exact');
  assert.equal(accepts[0].network, 'nano:mainnet');
  assert.equal(accepts[0].asset, 'XNO');
  assert.equal(accepts[0].amount, PRICE_RAW);
  assert.equal(accepts[0].payTo, PAY_TO);
  assert.equal((accepts[0].extra as Record<string, unknown>).requestId, REQUEST_ID);
  assert.equal(fake.calls.supported, 1);
});

test('adapter decodes strict base64 proof and derives stable Nano block identity', async (t) => {
  const fake = await startFakeFacilitator();
  t.after(() => fake.close());
  const adapter = await createX402NanoProtocolAdapter({ facilitatorUrl: fake.url });
  const challenge = await adapter.buildChallenge(REQUIREMENT, RESOURCE);
  const accepted = (challenge.accepts as unknown[])[0];

  const decoded = adapter.decodeProof(makeProof(accepted));
  assert.equal(decoded.paymentIdentity.toUpperCase(), Nano.Crypto.hashBlock({ block: BLOCK }).toUpperCase());
  assert.deepEqual(decoded.accepted, accepted);
  assert.throws(() => adapter.decodeProof('***not-base64***'));
  assert.throws(() => adapter.decodeProof(Buffer.from('{bad json').toString('base64')));
});

test('adapter sends verification and settlement through the pinned x402 client', async (t) => {
  const fake = await startFakeFacilitator();
  t.after(() => fake.close());
  const adapter = await createX402NanoProtocolAdapter({ facilitatorUrl: fake.url });
  const challenge = await adapter.buildChallenge(REQUIREMENT, RESOURCE);
  const decoded = adapter.decodeProof(makeProof((challenge.accepts as unknown[])[0]));

  const verified = await adapter.verify(decoded.payload, REQUIREMENT);
  assert.deepEqual(verified, { isValid: true, payer: PAYER });
  assert.equal(fake.calls.verify.length, 1);

  const settled = await adapter.settle(decoded.payload, REQUIREMENT);
  assert.deepEqual(settled, { success: true, transaction: TX, network: 'nano:mainnet', payer: PAYER });
  assert.equal(fake.calls.settle.length, 1);
});
