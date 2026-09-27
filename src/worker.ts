import { createProductionNanoPaymentBootstrap } from './payment/production-resource-server.ts';
import { createCloudflareWorkerRuntime, type CloudflareWorkerEnv } from './worker-runtime.ts';

const FACILITATOR_URL = 'https://facilitator.pursekeeper.dev';
const PAY_TO = 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt';
const PRICE_XNO = '0.01';

/**
 * Security rollout gate.
 *
 * Payment traffic is enabled only after the real Cloudflare D1 binding,
 * deployed challenge path, local paid-runtime behavior, guarded deployment
 * workflow, and explicit operator authorization have all been verified.
 * Environment configuration cannot change this source-controlled decision.
 */
export const PAID_TRAFFIC_ENABLED = true as const;

const bootstrap = createProductionNanoPaymentBootstrap({ facilitatorUrl: FACILITATOR_URL });
const runtime = createCloudflareWorkerRuntime({
  bootstrap,
  payTo: PAY_TO,
  priceXno: PRICE_XNO,
  facilitatorUrl: FACILITATOR_URL,
  allowPaidTraffic: PAID_TRAFFIC_ENABLED,
});

export default Object.freeze({
  fetch(request: Request, env: CloudflareWorkerEnv): Promise<Response> {
    return runtime.fetch(request, env);
  },
});
