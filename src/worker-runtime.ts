import type { ResourceServerLike } from './payment.ts';
import { createHandler, type PaymentGate } from './server.ts';
import type { InitializableResourceServer, PaymentBootstrap } from './payment/bootstrap.ts';
import { createD1PaymentStateStore, type D1DatabaseLike } from './payment/d1-store.ts';
import { createProductionNanoPaymentGate } from './payment/production-gate.ts';

type WorkerResourceServer = ResourceServerLike & InitializableResourceServer;

export interface CloudflareWorkerEnv {
  readonly PAYMENT_DB: D1DatabaseLike;
}

export interface CloudflareWorkerRuntimeOptions<T extends WorkerResourceServer> {
  readonly bootstrap: PaymentBootstrap<T>;
  readonly payTo: string;
  readonly priceXno: string;
  readonly facilitatorUrl: string;
  readonly allowPaidTraffic: boolean;
}

export interface CloudflareWorkerRuntime {
  fetch(request: Request, env: CloudflareWorkerEnv): Promise<Response>;
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

const unavailableGate: PaymentGate = Object.freeze({
  async challenge() {
    throw new Error('Payment infrastructure is unavailable for this route.');
  },
  async verifyAndSettle() {
    throw new Error('Payment infrastructure is unavailable for this route.');
  },
});

function challengeOnlyGate(gate: PaymentGate): PaymentGate {
  return Object.freeze({
    challenge: gate.challenge.bind(gate),
    async verifyAndSettle() {
      throw new Error('Paid traffic is disabled for this deployment stage.');
    },
  });
}

/**
 * Cloudflare Worker runtime adapter.
 *
 * Non-payment routes stay independent of x402/D1 readiness. The protected route
 * initializes the shared fail-closed payment bootstrap lazily, requires a D1
 * binding, and can be held in challenge-only mode so submitted payment proofs can
 * never reach facilitator verify/settle before an explicit later code change.
 */
export function createCloudflareWorkerRuntime<T extends WorkerResourceServer>(
  options: CloudflareWorkerRuntimeOptions<T>,
): CloudflareWorkerRuntime {
  return Object.freeze({
    async fetch(request: Request, env: CloudflareWorkerEnv): Promise<Response> {
      const incoming = new URL(request.url);
      const resourceUrl = new URL('/api/lens', incoming.origin).href;

      // Health and unrelated routes must not depend on payment infrastructure.
      if (incoming.pathname !== '/api/lens') {
        return createHandler({ resourceUrl, paymentGate: unavailableGate })(request);
      }

      if (incoming.protocol !== 'https:') {
        return jsonError(400, 'HTTPS_REQUIRED', 'The paid resource requires HTTPS.');
      }
      if (!env?.PAYMENT_DB || typeof env.PAYMENT_DB.prepare !== 'function') {
        return jsonError(503, 'PAYMENT_UNAVAILABLE', 'Payment state storage is unavailable.');
      }

      try {
        await options.bootstrap.initialize();
        const stateStore = createD1PaymentStateStore(env.PAYMENT_DB);
        const productionGate = createProductionNanoPaymentGate({
          bootstrap: options.bootstrap,
          stateStore,
          payTo: options.payTo,
          priceXno: options.priceXno,
          facilitatorUrl: options.facilitatorUrl,
        });
        const paymentGate = options.allowPaidTraffic
          ? productionGate
          : challengeOnlyGate(productionGate);
        return createHandler({ resourceUrl, paymentGate })(request);
      } catch {
        return jsonError(503, 'PAYMENT_UNAVAILABLE', 'Payment service is unavailable.');
      }
    },
  });
}
