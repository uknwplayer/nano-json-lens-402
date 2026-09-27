import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowPath = new URL('../.github/workflows/cloudflare-worker-deploy.yml', import.meta.url);

test('Cloudflare Worker deployment remains manual, isolated, and challenge-only', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(workflow, /DEPLOY_CHALLENGE_ONLY/);
  assert.match(workflow, /refs\/heads\/task5-production-nano-payment/);
  assert.match(workflow, /CLOUDFLARE_WORKERS_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /PAID_TRAFFIC_ENABLED = false as const/);
  assert.match(workflow, /8cbbea4c-b368-40e5-a7c0-9d72bce2567e/);
  assert.match(workflow, /wrangler@\$\{WRANGLER_VERSION\}.*deploy/);
  assert.match(workflow, /GET \/health/);
  assert.match(workflow, /POST \/api\/lens/);
  assert.match(workflow, /EXPECTED_STATUS:\s*['"]?200['"]?/);
  assert.match(workflow, /EXPECTED_STATUS:\s*['"]?402['"]?/);
  assert.match(workflow, /HEALTH_MAX_ATTEMPTS:\s*['"]?24['"]?/);
  assert.match(workflow, /for \(\( attempt=1; attempt<=HEALTH_MAX_ATTEMPTS; attempt\+\+ \)\); do/);
  assert.match(workflow, /sleep 5/);
  assert.match(workflow, /Health endpoint did not become ready/);
  assert.doesNotMatch(workflow, /payment-signature/i);
  assert.doesNotMatch(workflow, /verifyPayment|settlePayment/);
});
