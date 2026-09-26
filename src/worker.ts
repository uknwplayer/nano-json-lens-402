import { createProductionNanoPaymentBootstrap } from './payment/production-resource-server.ts';
import { createCloudflareWorkerRuntime, type CloudflareWorkerEnv } from './worker-runtime.ts';

const FACILITATOR_URL = 'https://facilitator.pursekeeper.dev';
const PAY_TO = 'nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt';
const PRICE_XNO = '0.01';

/**
 * Security rollout gate.
 *
 * This must remain a source-controlled `false` until the real Cloudflare D1
 * binding, deployed 402 path, and controlled payment test prerequisites are all
 * independently verified. Environment configuration cannot enable paid traffic.
 */
export const PAID_TRAFFIC_ENABLED = false as const;

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
