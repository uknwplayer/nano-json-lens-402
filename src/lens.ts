import { createHash } from 'node:crypto';
import { LensError } from './request.ts';
import type { JsonValue, LensRequest } from './request.ts';

type JsonType = 'null' | 'boolean' | 'number' | 'string' | 'object' | 'array';
export interface Analysis {
  canonicalJson: string; sha256: string; utf8Bytes: number;
  maxDepth: number; objects: number; arrays: number; keys: number;
  paths: { pointer: string; type: JsonType }[];
}
export interface Change {
  pointer: string;
  kind: 'added' | 'removed' | 'typeChanged' | 'valueChanged';
  beforeType?: JsonType; afterType?: JsonType;
}
export type LensResult =
  | { version: 1; mode: 'document'; analysis: Analysis }
  | { version: 1; mode: 'compare'; before: Analysis; after: Analysis; changes: Change[] };
const MAX_OUTPUT = 131072;
const encoder = new TextEncoder();
const size = (text: string) => encoder.encode(text).byteLength;
const tooLarge = () => new LensError(413, 'RESULT_TOO_LARGE', 'The result exceeds the limit of 131072 bytes.');

/** Locale-independent ordering, including supplementary Unicode code points. */
function order(a: string, b: string): number {
  const left = a[Symbol.iterator](), right = b[Symbol.iterator]();
  while (true) {
    const x = left.next(), y = right.next();
    if (x.done || y.done) return x.done ? (y.done ? 0 : -1) : 1;
    const delta = x.value.codePointAt(0)! - y.value.codePointAt(0)!;
    if (delta) return delta;
  }
}
function typeOf(value: JsonValue): JsonType {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value as JsonType;
}
function pointer(parent: string, key: string): string {
  if (parent.length + key.length > MAX_OUTPUT) throw tooLarge();
  const result = parent + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1');
  if (result.length > MAX_OUTPUT) throw tooLarge();
  return result;
}
function boundedString(value: string): string {
  if (value.length > MAX_OUTPUT) throw tooLarge();
  return JSON.stringify(value);
}

export function analyze(value: JsonValue): Analysis {
  const result: Analysis = { canonicalJson: '', sha256: '', utf8Bytes: 0,
    maxDepth: 0, objects: 0, arrays: 0, keys: 0, paths: [] };
  const chunks: string[] = [];
  let canonicalBytes = 0, pathBytes = 0, nodes = 0;
  function append(text: string): void {
    canonicalBytes += size(text);
    if (canonicalBytes > MAX_OUTPUT) throw tooLarge();
    chunks.push(text);
  }
  function visit(current: JsonValue, path: string, depth: number): void {
    if (depth > 32) throw new LensError(413, 'DEPTH_LIMIT', 'Document depth exceeds the limit of 32.');
    if (++nodes > 1000) throw new LensError(413, 'NODE_LIMIT', 'A document may contain at most 1000 nodes.');
    const type = typeOf(current);
    const entry = { pointer: path, type };
    pathBytes += size(JSON.stringify(entry)) + 1;
    if (pathBytes > MAX_OUTPUT) throw tooLarge();
    result.paths.push(entry);
    result.maxDepth = Math.max(result.maxDepth, depth);
    if (type === 'array') {
      result.arrays++;
      append('[');
      (current as JsonValue[]).forEach((child, index) => {
        if (index) append(',');
        visit(child, pointer(path, String(index)), depth + 1);
      });
      append(']');
    } else if (type === 'object') {
      result.objects++;
      const object = current as Record<string, JsonValue>;
      const keys = Object.keys(object).sort(order);
      result.keys += keys.length;
      append('{');
      keys.forEach((key, index) => {
        if (index) append(',');
        append(boundedString(key)); append(':');
        visit(object[key], pointer(path, key), depth + 1);
      });
      append('}');
    } else {
      if (type === 'number' && !Number.isFinite(current)) {
        throw new LensError(400, 'NUMBER_OUT_OF_RANGE', 'Numbers must have a finite representation.');
      }
      append(type === 'string' ? boundedString(current as string) : JSON.stringify(current));
    }
  }
  visit(value, '', 0);
  result.canonicalJson = chunks.join('');
  result.utf8Bytes = canonicalBytes;
  result.sha256 = createHash('sha256').update(result.canonicalJson, 'utf8').digest('hex');
  result.paths.sort((a, b) => order(a.pointer, b.pointer));
  if (size(JSON.stringify(result)) > MAX_OUTPUT) throw tooLarge();
  return result;
}

/** Inputs have already passed analysis, so recursion and output are bounded. */
function diff(before: JsonValue, after: JsonValue): Change[] {
  const changes: Change[] = [];
  let outputBytes = 0;
  function add(change: Change): void {
    outputBytes += size(JSON.stringify(change)) + 1;
    if (outputBytes > MAX_OUTPUT) throw tooLarge();
    changes.push(change);
  }
  function visit(a: JsonValue, b: JsonValue, path: string): void {
    const beforeType = typeOf(a), afterType = typeOf(b);
    if (beforeType !== afterType) {
      add({ pointer: path, kind: 'typeChanged', beforeType, afterType }); return;
    }
    if (beforeType === 'array' || beforeType === 'object') {
      const left = a as Record<string, JsonValue>, right = b as Record<string, JsonValue>;
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      for (const key of keys) {
        const childPath = pointer(path, key);
        if (!Object.hasOwn(left, key)) add({ pointer: childPath, kind: 'added', afterType: typeOf(right[key]) });
        else if (!Object.hasOwn(right, key)) add({ pointer: childPath, kind: 'removed', beforeType: typeOf(left[key]) });
        else visit(left[key], right[key], childPath);
      }
    } else if (a !== b) add({ pointer: path, kind: 'valueChanged', beforeType, afterType });
  }
  visit(before, after, '');
  return changes.sort((a, b) => order(a.pointer, b.pointer) || order(a.kind, b.kind));
}
export function compare(before: JsonValue, after: JsonValue): Change[] {
  analyze(before); analyze(after);
  return diff(before, after);
}
export function buildLensResult(request: LensRequest): LensResult {
  const result: LensResult = request.mode === 'document'
    ? { version: 1, mode: 'document', analysis: analyze(request.document) }
    : { version: 1, mode: 'compare', before: analyze(request.before), after: analyze(request.after),
      changes: diff(request.before, request.after) };
  if (size(JSON.stringify(result)) > MAX_OUTPUT) throw tooLarge();
  return result;
}
