import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, compare, buildLensResult } from '../src/lens.ts';
import type { JsonValue } from '../src/request.ts';

test('canonicalizes keys and hashes exact UTF-8 bytes', () => {
  const a = analyze({ b: 2, a: 1 });
  assert.equal(a.canonicalJson, '{"a":1,"b":2}');
  assert.equal(a.sha256, '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777');
  assert.equal(a.utf8Bytes, 13);
  assert.equal(a.sha256, analyze({ a: 1, b: 2 }).sha256);
});
test('sorts numeric-looking and Unicode keys by code point', () => {
  assert.equal(analyze({ '2': 0, '10': 0, '\u{10000}': 1, '\uE000': 2 }).canonicalJson,
    '{"10":0,"2":0,"\uE000":2,"\u{10000}":1}');
});
test('preserves array order and JSON string escapes', () => {
  assert.equal(analyze([2, 1, '\n"\\']).canonicalJson, '[2,1,"\\n\\"\\\\"]');
  assert.notEqual(analyze([1, 2]).sha256, analyze([2, 1]).sha256);
  assert.equal(analyze('é').utf8Bytes, 4);
});
test('counts all values and escapes JSON pointers', () => {
  const a = analyze({ 'a/b': [null, { '~x': true }] });
  assert.equal(a.objects, 2); assert.equal(a.arrays, 1);
  assert.equal(a.keys, 2); assert.equal(a.maxDepth, 3);
  assert.deepEqual(a.paths, [
    { pointer: '', type: 'object' }, { pointer: '/a~1b', type: 'array' },
    { pointer: '/a~1b/0', type: 'null' }, { pointer: '/a~1b/1', type: 'object' },
    { pointer: '/a~1b/1/~0x', type: 'boolean' },
  ]);
});
test('supports primitive roots, empty containers and negative zero', () => {
  for (const value of [null, true, 12, 'x', [], {}]) {
    const a = analyze(value);
    assert.equal(a.maxDepth, 0); assert.equal(a.paths.length, 1);
    assert.equal(a.canonicalJson, JSON.stringify(value));
  }
  assert.equal(analyze(-0).canonicalJson, '0');
});
test('diff reports changed subtrees once without exposing values', () => {
  assert.deepEqual(compare({ gone: [1], c: 1, a: { private: 'before' } },
    { a: 0, c: 2, new: { secret: 'after' } }), [
    { pointer: '/a', kind: 'typeChanged', beforeType: 'object', afterType: 'number' },
    { pointer: '/c', kind: 'valueChanged', beforeType: 'number', afterType: 'number' },
    { pointer: '/gone', kind: 'removed', beforeType: 'array' },
    { pointer: '/new', kind: 'added', afterType: 'object' },
  ]);
});
test('comparison uses array indices and distinguishes missing from null', () => {
  assert.deepEqual(compare([null, 1], [null]), [{ pointer: '/1', kind: 'removed', beforeType: 'number' }]);
  assert.deepEqual(compare({}, { a: null }), [{ pointer: '/a', kind: 'added', afterType: 'null' }]);
  assert.deepEqual(compare(null, false), [{ pointer: '', kind: 'typeChanged', beforeType: 'null', afterType: 'boolean' }]);
  assert.deepEqual(compare({ b: 2, a: 1 }, { a: 1, b: 2 }), []);
});
test('bounds direct analysis and comparison calls by nodes and depth', () => {
  assert.equal(analyze(Array(999).fill(0)).paths.length, 1000);
  assert.throws(() => analyze(Array(1000).fill(0)), { status: 413, code: 'NODE_LIMIT' });
  let value: JsonValue = 0;
  for (let i = 0; i < 32; i++) value = [value];
  assert.equal(analyze(value).maxDepth, 32);
  assert.throws(() => analyze([value]), { status: 413, code: 'DEPTH_LIMIT' });
  assert.throws(() => compare(0, [value]), { status: 413, code: 'DEPTH_LIMIT' });
  assert.throws(() => analyze(Infinity), { status: 400, code: 'NUMBER_OUT_OF_RANGE' });
});
test('returns versioned single and comparison envelopes', () => {
  const single = buildLensResult({ mode: 'document', document: null });
  assert.equal(single.version, 1); assert.equal(single.mode, 'document');
  const pair = buildLensResult({ mode: 'compare', before: 1, after: 2 });
  assert.equal(pair.version, 1); assert.equal(pair.mode, 'compare');
  if (pair.mode === 'compare') assert.equal(pair.changes[0].pointer, '');
});
test('rejects amplified output above 128 KiB before it can be delivered', () => {
  const document = Object.fromEntries(Array.from({ length: 750 }, (_, i) => ['key' + i.toString().padStart(4, '0') + 'x'.repeat(65), 0]));
  assert.ok(Buffer.byteLength(JSON.stringify({ document })) < 65536);
  assert.throws(() => buildLensResult({ mode: 'document', document }), { status: 413, code: 'RESULT_TOO_LARGE' });
});
