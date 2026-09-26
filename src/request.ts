import { createScanner, parseTree, SyntaxKind } from 'jsonc-parser';
import type { Node, ParseError } from 'jsonc-parser';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type LensRequest =
  | { mode: 'document'; document: JsonValue }
  | { mode: 'compare'; before: JsonValue; after: JsonValue };

export class LensError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'LensError';
    this.status = status;
    this.code = code;
  }
}

const invalidJson = () => new LensError(400, 'INVALID_JSON', 'The request must contain valid JSON.');
const depthError = () => new LensError(413, 'DEPTH_LIMIT', 'Document depth exceeds the limit of 32.');

/** Bound recursive library parsing before constructing its syntax tree. */
function guardNesting(text: string): void {
  const scanner = createScanner(text);
  let nesting = 0;
  for (let token = scanner.scan(); token !== SyntaxKind.EOF; token = scanner.scan()) {
    if (scanner.getTokenError() !== 0) throw invalidJson();
    if (token === SyntaxKind.OpenBraceToken || token === SyntaxKind.OpenBracketToken) {
      // Envelope + containers at document depths 0 through 32.
      if (++nesting > 34) throw depthError();
    } else if (token === SyntaxKind.CloseBraceToken || token === SyntaxKind.CloseBracketToken) {
      if (--nesting < 0) throw invalidJson();
    }
  }
}

/** The syntax tree preserves decoded member names before JSON.parse can discard duplicates. */
function validateTree(node: Node): void {
  if (node.type === 'object') {
    const names = new Set<string>();
    for (const property of node.children ?? []) {
      const name: string = property.children![0].value;
      if (names.has(name)) {
        throw new LensError(400, 'DUPLICATE_KEY', 'Object member names must be unique.');
      }
      names.add(name);
    }
  }
  if (node.type === 'number' && !Number.isFinite(node.value)) {
    throw new LensError(400, 'NUMBER_OUT_OF_RANGE', 'Numbers must have a finite representation.');
  }
  for (const child of node.children ?? []) validateTree(child);
}

function validateDocument(root: JsonValue): void {
  let nodes = 0;
  function visit(value: JsonValue, depth: number): void {
    if (depth > 32) throw depthError();
    if (++nodes > 1000) {
      throw new LensError(413, 'NODE_LIMIT', 'A document may contain at most 1000 nodes.');
    }
    if (value !== null && typeof value === 'object') {
      for (const child of Object.values(value)) visit(child, depth + 1);
    }
  }
  visit(root, 0);
}

/** Parse one bounded UTF-8 JSON request without performing network or payment operations. */
export function parseLensRequest(raw: Uint8Array, contentType: string): LensRequest {
  if (raw.byteLength > 65536) {
    throw new LensError(413, 'PAYLOAD_TOO_LARGE', 'The request body may contain at most 65536 bytes.');
  }
  if (!/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?$/i.test(contentType.trim())) {
    throw new LensError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json with UTF-8 encoding.');
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
  } catch {
    throw new LensError(400, 'INVALID_UTF8', 'The request body must be valid UTF-8.');
  }
  guardNesting(text);
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, {
    disallowComments: true, allowTrailingComma: false, allowEmptyContent: false,
  });
  if (!tree || errors.length) throw invalidJson();
  validateTree(tree);

  let envelope: unknown;
  try { envelope = JSON.parse(text); }
  catch { throw invalidJson(); }
  if (envelope === null || Array.isArray(envelope) || typeof envelope !== 'object') {
    throw new LensError(400, 'INVALID_REQUEST', 'Provide document, or both before and after.');
  }
  const fields = envelope as Record<string, JsonValue>;
  const keys = Object.keys(fields);
  if (keys.length === 1 && Object.hasOwn(fields, 'document')) {
    validateDocument(fields.document);
    return { mode: 'document', document: fields.document };
  }
  if (keys.length === 2 && Object.hasOwn(fields, 'before') && Object.hasOwn(fields, 'after')) {
    validateDocument(fields.before);
    validateDocument(fields.after);
    return { mode: 'compare', before: fields.before, after: fields.after };
  }
  throw new LensError(400, 'INVALID_REQUEST', 'Provide document, or both before and after.');
}
