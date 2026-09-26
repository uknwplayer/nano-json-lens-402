import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowPath = new URL('../.github/workflows/cloudflare-d1-provision.yml', import.meta.url);

test('Cloudflare D1 provisioning workflow remains manual and challenge-only', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(workflow, /PROVISION_D1/);
  assert.match(workflow, /refs\/heads\/task5-production-nano-payment/);
  assert.match(workflow, /CLOUDFLARE_D1_API_TOKEN/);
  assert.match(workflow, /PAID_TRAFFIC_ENABLED = false as const/);
  assert.match(workflow, /wrangler@\$\{WRANGLER_VERSION\}/);
  assert.match(workflow, /d1 migrations apply/);
  assert.match(workflow, /Remote synthetic write\/read\/CAS probe: passed and cleaned up/);
  assert.doesNotMatch(workflow, /wrangler@[^\n]*\sdeploy\b/);
});
