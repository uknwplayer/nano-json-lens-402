import { createHash, randomUUID } from 'node:crypto';
import { parseLensRequest, LensError } from './request.ts';
import { buildLensResult } from './lens.ts';

export interface PaymentContext {
  readonly resourceUrl: string;
  readonly requestDigest: string;
}
export interface SettlementReceipt {
  success: true;
  transaction: string;
  network: 'nano:mainnet';
  payer?: string;
}
export type PaymentOutcome = { settled: false } | { settled: true; receipt: SettlementReceipt };
export interface PaymentGate {
  challenge(context: PaymentContext): Promise<Record<string, unknown>>;
  verifyAndSettle(context: PaymentContext, proof: string): Promise<PaymentOutcome>;
}
export interface OutcomeLog {
  requestId: string; status: number; durationMs: number; version: '1';
}
export interface HandlerOptions {
  resourceUrl: string;
  bodyTimeoutMs?: number;
  paymentGate: PaymentGate;
  log?: (entry: OutcomeLog) => void;
}
const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra,
  } });
}
function error(status: number, code: string, message: string, extra: Record<string, string> = {}): Response {
  return json({ error: { code, message } }, status, extra);
}
async function readBody(request: Request, timeoutMs: number): Promise<Uint8Array> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new LensError(408, 'REQUEST_TIMEOUT', 'The request body was not received in time.'));
      void reader.cancel().catch(() => {});
    }, timeoutMs);
  });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      length += value.byteLength;
      if (length > 65536) {
        void reader.cancel().catch(() => {});
        throw new LensError(413, 'PAYLOAD_TOO_LARGE', 'The request body may contain at most 65536 bytes.');
      }
      chunks.push(value);
    }
  } catch (cause) {
    if (cause instanceof LensError) throw cause;
    throw new LensError(400, 'BODY_READ_FAILED', 'The request body could not be read.');
  } finally { clearTimeout(timer!); reader.releaseLock(); }
  const raw = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
  return raw;
}

/** Portable Fetch handler. Payment implementations are explicit dependencies; none is built in. */
export function createHandler(options: HandlerOptions): (request: Request) => Promise<Response> {
  if (!options.paymentGate || typeof options.paymentGate.challenge !== 'function' ||
      typeof options.paymentGate.verifyAndSettle !== 'function') {
    throw new Error('An explicit payment gate is required.');
  }
  const configured = new URL(options.resourceUrl);
  if (!['http:', 'https:'].includes(configured.protocol) || configured.pathname !== '/api/lens' ||
      configured.search || configured.hash || configured.username || configured.password) {
    throw new Error('Configure an absolute HTTP(S) resource URL ending in /api/lens.');
  }
  const bodyTimeoutMs = options.bodyTimeoutMs ?? 5000;
  if (!Number.isFinite(bodyTimeoutMs) || bodyTimeoutMs <= 0 || bodyTimeoutMs > 60000) {
    throw new Error('Body timeout must be between 0 and 60000 milliseconds.');
  }
  const resourceUrl = configured.href;
  const gate = options.paymentGate;
  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      if (request.method !== 'GET') return error(405, 'METHOD_NOT_ALLOWED', 'Use GET for this resource.', { allow: 'GET' });
      return json({ status: 'ok', version: '1' }, 200);
    }
    if (url.pathname !== '/api/lens') return error(404, 'NOT_FOUND', 'The resource was not found.');
    if (request.method !== 'POST') return error(405, 'METHOD_NOT_ALLOWED', 'Use POST for this resource.', { allow: 'POST' });
    if (url.search) return error(400, 'INVALID_REQUEST', 'Query parameters are not supported.');
    const proof = request.headers.get('payment-signature');
    if (proof !== null && (proof.length === 0 || proof.length > 16384)) {
      return error(400, 'INVALID_PAYMENT_HEADER', 'The payment header is empty or too large.');
    }
    const raw = await readBody(request, bodyTimeoutMs);
    const input = parseLensRequest(raw, request.headers.get('content-type') ?? '');
    // Complete bounded computation before settlement, and keep the result private until success.
    const result = buildLensResult(input);
    const context: PaymentContext = Object.freeze({ resourceUrl,
      requestDigest: createHash('sha256').update(raw).digest('hex') });
    if (proof === null) {
      let challenge: Record<string, unknown>;
      try { challenge = await gate.challenge(context); }
      catch { return error(503, 'PAYMENT_UNAVAILABLE', 'Payment service is unavailable.'); }
      return json({ error: { code: 'PAYMENT_REQUIRED', message: 'Payment is required.' }, paymentRequirements: challenge },
        402, { 'payment-required': encode(challenge) });
    }
    let outcome: PaymentOutcome;
    try { outcome = await gate.verifyAndSettle(context, proof); }
    catch { return error(503, 'PAYMENT_UNAVAILABLE', 'Payment status could not be confirmed.'); }
    if (!outcome.settled) return error(402, 'PAYMENT_REJECTED', 'Payment could not be accepted.');
    // Check the adapter's output as a second boundary before delivering the result.
    if (outcome.receipt.success !== true || outcome.receipt.network !== 'nano:mainnet' ||
        !/^[0-9a-f]{64}$/i.test(outcome.receipt.transaction)) {
      return error(503, 'PAYMENT_UNAVAILABLE', 'Payment status could not be confirmed.');
    }
    return json(result, 200, { 'payment-response': encode(outcome.receipt) });
  }
  return async (request: Request): Promise<Response> => {
    const start = performance.now();
    const requestId = randomUUID();
    let response: Response;
    try { response = await handle(request); }
    catch (cause) {
      response = cause instanceof LensError
        ? error(cause.status, cause.code, cause.message)
        : error(500, 'INTERNAL_ERROR', 'The request could not be completed.');
    }
    response.headers.set('x-request-id', requestId);
    try { options.log?.({ requestId, status: response.status, durationMs: Math.max(0, performance.now() - start), version: '1' }); }
    catch { /* Logging failure must not alter an already settled response. */ }
    return response;
  };
}
