import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/server.ts';
import type { PaymentGate } from '../src/server.ts';

const resourceUrl = 'https://lens.example/api/lens';
const receipt = { success: true as const, transaction: 'A'.repeat(64), network: 'nano:mainnet' as const };
function setup(options: { reject?: boolean; fail?: boolean } = {}) {
  const calls: string[] = [];
  const gate: PaymentGate = {
    async challenge(context) {
      calls.push('challenge');
      assert.equal(context.resourceUrl, resourceUrl);
      assert.match(context.requestDigest, /^[0-9a-f]{64}$/);
      return { x402Version: 2, resource: { url: context.resourceUrl }, accepts: [
        { scheme: 'exact', network: 'nano:mainnet', asset: 'XNO', amount: '10000000000000000000000000000', payTo: 'test-only' },
      ] };
    },
    async verifyAndSettle(context, proof) {
      calls.push('payment');
      assert.equal(proof, 'local-test-proof');
      assert.equal(context.resourceUrl, resourceUrl);
      if (options.fail) throw new Error('sensitive-facilitator-detail');
      return options.reject ? { settled: false } : { settled: true, receipt };
    },
  };
  return { handler: createHandler({ resourceUrl, paymentGate: gate }), calls };
}
const request = (body = '{"document":{"b":2,"a":1}}', paid = false) => new Request(resourceUrl, {
  method: 'POST', headers: { 'content-type': 'application/json', ...(paid ? { 'payment-signature': 'local-test-proof' } : {}) }, body,
});

test('health is free and reports only process availability', async () => {
  const { handler, calls } = setup();
  const response = await handler(new Request('https://lens.example/health'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', version: '1' });
  assert.deepEqual(calls, []);
});
test('valid unpaid request returns an encoded challenge without analysis', async () => {
  const { handler, calls } = setup();
  const response = await handler(request());
  assert.equal(response.status, 402);
  const challenge = JSON.parse(Buffer.from(response.headers.get('payment-required')!, 'base64').toString());
  assert.equal(challenge.accepts[0].network, 'nano:mainnet');
  assert.equal(challenge.accepts[0].amount, '10000000000000000000000000000');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.text();
  assert.ok(!body.includes('canonicalJson')); assert.ok(!body.includes('sha256'));
  assert.deepEqual(calls, ['challenge']);
});
test('paid response delivers useful analysis and settlement metadata', async () => {
  const { handler } = setup();
  const response = await handler(request(undefined, true));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).analysis.canonicalJson, '{"a":1,"b":2}');
  assert.deepEqual(JSON.parse(Buffer.from(response.headers.get('payment-response')!, 'base64').toString()), receipt);
});
test('invalid and oversized input is rejected before payment', async () => {
  const { handler, calls } = setup();
  for (const [body, status] of [['{', 400], ['{"document":1,"document":2}', 400], ['x'.repeat(65537), 413]] as const) {
    const response = await handler(request(body, true));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('payment-response'), null);
  }
  const media = await handler(new Request(resourceUrl, { method: 'POST', body: '{}', headers: { 'content-type': 'text/plain' } }));
  assert.equal(media.status, 415); assert.deepEqual(calls, []);
});
test('failed or unavailable payment never returns protected content', async () => {
  for (const [options, status] of [[{ reject: true }, 402], [{ fail: true }, 503]] as const) {
    const { handler } = setup(options);
    const response = await handler(request(undefined, true));
    assert.equal(response.status, status);
    const text = await response.text();
    assert.ok(!text.includes('canonicalJson')); assert.ok(!text.includes('sensitive-facilitator-detail'));
    assert.equal(response.headers.get('payment-response'), null);
  }
});
test('does not release the result while settlement is pending', async () => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const handler = createHandler({ resourceUrl, paymentGate: {
    async challenge() { return {}; },
    async verifyAndSettle() { await pending; return { settled: true, receipt }; },
  } });
  let completed = false;
  const response = handler(request(undefined, true)).then(value => { completed = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false);
  release(); assert.equal((await response).status, 200);
});
test('enforces route methods and returns JSON for unknown paths', async () => {
  const { handler, calls } = setup();
  const wrong = await handler(new Request(resourceUrl));
  assert.equal(wrong.status, 405); assert.equal(wrong.headers.get('allow'), 'POST');
  assert.equal((await handler(new Request('https://lens.example/absent'))).status, 404);
  assert.deepEqual(calls, []);
});
test('bounds streamed bodies without trusting Content-Length', async () => {
  const { handler, calls } = setup();
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new Uint8Array(40000)); controller.enqueue(new Uint8Array(30000)); controller.close();
  } });
  const req = new Request(resourceUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '1' }, body: stream, duplex: 'half' } as RequestInit);
  assert.equal((await handler(req)).status, 413); assert.deepEqual(calls, []);
});
test('rejects oversized proof before invoking the gate', async () => {
  const { handler, calls } = setup(); const req = request();
  req.headers.set('payment-signature', 'x'.repeat(16385));
  assert.equal((await handler(req)).status, 400); assert.deepEqual(calls, []);
});
test('logs only bounded outcome metadata and survives logger failure', async () => {
  const entries: unknown[] = [];
  const handler = createHandler({ resourceUrl, paymentGate: {
    async challenge() { return {}; }, async verifyAndSettle() { return { settled: false }; },
  }, log(entry) { entries.push(entry); throw new Error('logger'); } });
  assert.equal((await handler(request('{"document":"private-value"}'))).status, 402);
  assert.equal(entries.length, 1); assert.ok(!JSON.stringify(entries).includes('private-value'));
});
test('requires explicit payment configuration at construction', () => {
  assert.throws(() => createHandler({ resourceUrl } as Parameters<typeof createHandler>[0]));
});

test('expires stalled request bodies before calling the payment gate', async () => {
  let timer: ReturnType<typeof setTimeout>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { timer = setTimeout(() => { controller.enqueue(new TextEncoder().encode('{"document":1}')); controller.close(); }, 40); },
    cancel() { clearTimeout(timer); },
  });
  let called = false;
  const handler = createHandler({ resourceUrl, bodyTimeoutMs: 5, paymentGate: {
    async challenge() { called = true; return {}; },
    async verifyAndSettle() { called = true; return { settled: false }; },
  } });
  const req = new Request(resourceUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit);
  const response = await handler(req);
  assert.equal(response.status, 408); assert.equal(called, false);
});
