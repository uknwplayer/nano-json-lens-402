import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowPath = new URL('../.github/workflows/cloudflare-worker-payment-enable.yml', import.meta.url);

test('payment-enable deployment is manual, guarded, least-privilege, and never carries a real proof', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(workflow, /ENABLE_PAID_TRAFFIC/);
  assert.match(workflow, /refs\/heads\/task5-production-nano-payment/);
  assert.match(workflow, /WRANGLER_VERSION:\s*['"]4\.137\.0['"]/);
  assert.match(workflow, /8cbbea4c-b368-40e5-a7c0-9d72bce2567e/);
  assert.match(workflow, /CLOUDFLARE_WORKERS_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_D1_API_TOKEN/);
  assert.match(workflow, /PAID_TRAFFIC_ENABLED = true as const/);
  assert.match(workflow, /wrangler@\$\{WRANGLER_VERSION\}.*deploy/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /deploy --dry-run/);
  assert.match(workflow, /GET \/health/);
  assert.match(workflow, /unpaid POST \/api\/lens/);
  assert.match(workflow, /malformed proof/i);
  assert.doesNotMatch(workflow, /seed|private key/i);
  assert.doesNotMatch(workflow, /verifyPayment|settlePayment/);
  assert.doesNotMatch(workflow, /payment-signature:\s*[A-Za-z0-9+/]{40,}/i);
});
