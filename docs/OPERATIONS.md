# Operations and Availability

## Initial Availability Goal
Keep the public endpoint functional throughout the Pursekeeper-required window, with margin beyond the 14-day period.

## Health
Endpoint: `GET /health`

The Worker runtime intentionally keeps health independent of x402 bootstrap and D1 readiness. A facilitator or payment-state outage must not make the process health check fail.

Minimum response should expose only bounded availability metadata. It must not require payment.

## Incident Procedure
If an outage occurs:
1. record the approximate time;
2. identify the cause;
3. restore service;
4. test health;
5. test the 402 challenge;
6. update the checkpoint;
7. determine whether Pursekeeper must be informed or the reachability window must restart.

## Deployment Target
V1 deployment target selected on 2026-09-26: **Cloudflare Workers Free + Cloudflare D1**.

Reasons:
- the service uses a Fetch handler and now has a dedicated Worker module entrypoint;
- the selected Workers compatibility date supports the Node APIs used by this project;
- Workers Free avoids an application sleep/wake server lifecycle;
- D1 supplies persistent SQLite-backed state and conditional SQL writes for replay/settlement state;
- the selected free-tier capacity was far above expected initial traffic when reviewed, but provider limits must be rechecked immediately before deployment.

External service limits are not project guarantees and may change. Recheck the official Cloudflare Workers/D1 limits and pricing immediately before a production deployment.

Official references:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/d1/wrangler-commands/

## Worker Rollout State
The real D1 database is now provisioned and remotely validated. **The Worker itself is still not deployed.**

Current rollout state and safeguards:
- `src/worker.ts` exports the production Worker module;
- `PAID_TRAFFIC_ENABLED` is a source-controlled `false` constant;
- environment configuration cannot enable paid traffic in this stage;
- a submitted `payment-signature` is rejected before facilitator `verify` or `settle` can run;
- `GET /health` does not require D1 or x402 initialization;
- `/api/lens` requires HTTPS and a valid `PAYMENT_DB` binding;
- missing D1 state fails closed with 503;
- the production resource URL is normalized to the request origin plus `/api/lens`;
- `wrangler.jsonc` now contains the real public D1 UUID `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`;
- migration `0001_payment_state.sql` has been applied remotely;
- remote synthetic write/read/CAS/delete validation has passed;
- no Worker deployment has occurred yet.

CI validates the Worker bundle with exactly:

```sh
npx --yes wrangler@4.137.0 deploy --dry-run
```

The dry-run must remain green before account-side Worker deployment.

## D1 Provisioning Evidence
Permanent provisioning workflow:

```text
.github/workflows/cloudflare-d1-provision.yml
```

The permanent workflow is `workflow_dispatch`-only, requires literal `PROVISION_D1`, is guarded to `task5-production-nano-payment`, verifies `PAID_TRAFFIC_ENABLED === false`, and never deploys the Worker.

GitHub does not surface branch-only `workflow_dispatch` workflows in the default-branch Actions UI. For the actual first provisioning, a one-shot push-triggered launcher was therefore created on an isolated temporary branch. That launcher:
- checked out the reviewed `task5-production-nano-payment` head;
- required that the remote target branch still matched the reviewed base SHA before Cloudflare mutation;
- used only GitHub Actions Secrets for Cloudflare authentication;
- performed the same D1 provisioning/migration/probe sequence;
- refused to push the UUID if the target branch moved during provisioning;
- pushed only the public D1 UUID to the reviewed branch;
- did not deploy the Worker or contact payment verify/settle paths.

Successful remote evidence:
- Actions run: `36280708030`;
- job: `108511852925`;
- D1 database: `nano-json-lens-402-payment-state`;
- D1 database ID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`;
- region reported by Wrangler: `ENAM`;
- migration `0001_payment_state.sql`: applied successfully;
- synthetic insert/read/CAS/read/delete: passed;
- UUID commit: `21c86dfbdb5460bb1596f11cd2aefced6d443244`.

The temporary launcher branches were normalized back to the reviewed post-provisioning commit so the one-shot workflow is no longer present at their heads.

## Cloudflare Credential Handling
The repository uses these GitHub Actions secrets for D1 provisioning:
- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_D1_API_TOKEN`.

Rules:
- never paste secret values into chat, source files, issues, workflow inputs, artifacts, or logs;
- keep the D1 token scoped to the intended account and D1 write/edit operations;
- do not reuse a global API key;
- do not broaden this D1 token merely to deploy the Worker; use a separate least-privilege Workers authorization path if required.

The D1 database UUID is public configuration and is intentionally committed after successful remote validation.

## Persistent Payment State
`src/payment/d1-store.ts` is the production state adapter. `migrations/0001_payment_state.sql` defines its schema.

Operational rules:
- the migration is now applied remotely;
- bind exactly the intended D1 database to the Worker;
- never fall back to `MemoryPaymentStateStore` in production;
- do not automatically retry ambiguous settlement writes;
- settlement state and receipt must be confirmed in one conditional database update;
- after Worker deployment/redeploy, verify existing D1 state remains readable before permitting a live payment test.

## Challenge-Only Worker Deployment — Next Stage
D1 readiness does not deploy the service. A separate controlled block must still:
1. run fresh full CI and Wrangler dry-run against the committed real D1 binding;
2. obtain or use a least-privilege Workers deployment authorization path without broadening the D1-only token unnecessarily;
3. deploy while `PAID_TRAFFIC_ENABLED === false`;
4. externally verify `GET /health` returns 200;
5. externally verify a valid unpaid `POST /api/lens` returns the expected 402;
6. verify proof-bearing requests still cannot reach `verify`/`settle`;
7. update checkpoint/security evidence before any paid-traffic proposal.

## Changes During the 14-Day Window
Avoid high-risk changes during the 14-day window. Urgent fixes should be small, tested, and documented.
