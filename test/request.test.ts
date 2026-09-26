import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLensRequest } from '../src/request.ts';

const bytes = (text: string) => new TextEncoder().encode(text);
const parse = (text: string, type = 'application/json') => parseLensRequest(bytes(text), type);
const fails = (text: string, status: number, code: string) =>
  assert.throws(() => parse(text), { status, code });

test('accepts all document roots including explicit null', () => {
  for (const document of [null, true, false, 0, 'hello', [], { a: [1, null] }]) {
    assert.deepEqual(parse(JSON.stringify({ document })), { mode: 'document', document });
  }
});

test('accepts comparison with two independent documents', () => {
  assert.deepEqual(parse('{"before":null,"after":{"a":1}}'), {
    mode: 'compare', before: null, after: { a: 1 },
  });
});

test('requires exactly one supported envelope', () => {
  for (const input of ['null', '[]', '1', '{}', '{"before":0}', '{"after":0}',
    '{"document":0,"after":1}', '{"document":0,"other":1}',
    '{"before":0,"after":1,"other":2}']) fails(input, 400, 'INVALID_REQUEST');
});

test('rejects non-JSON grammar rather than tolerating comments or trailing commas', () => {
  for (const input of ['', '{', '{"document":1,}', '{"document":[1,]}',
    '{/*comment*/"document":1}', '{"document":NaN}', '{"document":01}',
    '{"document":1} trailing', '{"document":"\n"}', '{"document":undefined}']) {
    fails(input, 400, 'INVALID_JSON');
  }
});

test('rejects duplicate keys including nested, escaped and envelope duplicates', () => {
  for (const input of ['{"document":1,"document":2}',
    '{"document":{"a":1,"a":2}}', '{"document":[{"a":1,"\\u0061":2}]}']) {
    fails(input, 400, 'DUPLICATE_KEY');
  }
});

test('allows the same key in separate objects', () => {
  assert.deepEqual(parse('{"document":[{"a":1},{"a":2}]}'),
    { mode: 'document', document: [{ a: 1 }, { a: 2 }] });
});

test('treats prototype-related keys as ordinary data', () => {
  const result = parse('{"document":{"__proto__":{"polluted":true},"constructor":1}}');
  assert.equal(result.mode, 'document');
  assert.deepEqual(result, { mode: 'document', document: JSON.parse('{"__proto__":{"polluted":true},"constructor":1}') });
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('accepts JSON content type with UTF-8 charset and rejects unsupported formats', () => {
  for (const type of ['application/json', 'Application/JSON; Charset=UTF-8', 'application/json; charset="utf-8"']) {
    assert.deepEqual(parse('{"document":1}', type), { mode: 'document', document: 1 });
  }
  for (const type of ['', 'text/plain', 'application/jsonp', 'application/json; charset=latin1']) {
    assert.throws(() => parse('{"document":1}', type), { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' });
  }
});

test('enforces the 64 KiB raw byte boundary including multibyte input', () => {
  const exact = '{"document":"' + 'a'.repeat(65521) + '"}';
  assert.equal(bytes(exact).length, 65536);
  assert.equal(parse(exact).mode, 'document');
  fails(exact + ' ', 413, 'PAYLOAD_TOO_LARGE');
  fails('{"document":"' + 'é'.repeat(32761) + '"}', 413, 'PAYLOAD_TOO_LARGE');
});

test('rejects invalid UTF-8 rather than replacing bytes', () => {
  assert.throws(() => parseLensRequest(new Uint8Array([123, 255, 125]), 'application/json'),
    { status: 400, code: 'INVALID_UTF8' });
});

test('enforces depth 32 from the analyzed root and bounds pathological nesting', () => {
  const atDepth = (depth: number) => '{"document":' + '['.repeat(depth) + '0' + ']'.repeat(depth) + '}';
  assert.equal(parse(atDepth(32)).mode, 'document');
  fails(atDepth(33), 413, 'DEPTH_LIMIT');
  fails(atDepth(5000), 413, 'DEPTH_LIMIT');
});

test('enforces 1000 nodes per document and counts comparison sides separately', () => {
  const accepted = Array(999).fill(0);
  assert.equal(parse(JSON.stringify({ document: accepted })).mode, 'document');
  fails(JSON.stringify({ document: Array(1000).fill(0) }), 413, 'NODE_LIMIT');
  assert.equal(parse(JSON.stringify({ before: accepted, after: accepted })).mode, 'compare');
});

test('rejects numbers that overflow the finite number representation', () => {
  fails('{"document":1e400}', 400, 'NUMBER_OUT_OF_RANGE');
});

test('errors expose only safe English metadata, without submitted values', () => {
  try { parse('{"document":{"sensitive-marker":1,"sensitive-marker":2}}'); }
  catch (error) {
    assert.equal((error as { code: string }).code, 'DUPLICATE_KEY');
    assert.ok(!String(error).includes('sensitive-marker'));
    return;
  }
  assert.fail('Expected duplicate input to be rejected');
});
