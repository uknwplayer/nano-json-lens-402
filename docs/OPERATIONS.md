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
The Worker code and deployment bundle are prepared, but **the real D1 database and Worker are not yet provisioned/deployed unless the latest checkpoint explicitly records successful remote evidence**.

Current rollout safeguards:
- `src/worker.ts` exports the production Worker module;
- `PAID_TRAFFIC_ENABLED` is a source-controlled `false` constant;
- environment configuration cannot enable paid traffic in this stage;
- a submitted `payment-signature` is rejected before facilitator `verify` or `settle` can run;
- `GET /health` does not require D1 or x402 initialization;
- `/api/lens` requires HTTPS and a valid `PAYMENT_DB` binding;
- missing D1 state fails closed with 503;
- the production resource URL is normalized to the request origin plus `/api/lens`;
- until provisioning succeeds, `wrangler.jsonc` may still contain the deliberate zero UUID placeholder.

CI validates the Worker bundle with exactly:

```sh
npx --yes wrangler@4.137.0 deploy --dry-run
```

The dry-run must remain green before any account-side deployment step.

## D1 Provisioning Workflow
Remote D1 provisioning is intentionally separated from normal push CI. The repository contains a manual workflow:

```text
.github/workflows/cloudflare-d1-provision.yml
```

It can run only through `workflow_dispatch`, requires the literal confirmation `PROVISION_D1`, and is guarded to the isolated `task5-production-nano-payment` branch.

### Required GitHub Actions secrets
Create these only in the GitHub repository Actions secret store. Never paste their values into chat, commits, issues, workflow inputs, or logs.

- `CLOUDFLARE_ACCOUNT_ID` — the intended Cloudflare account ID.
- `CLOUDFLARE_D1_API_TOKEN` — a dedicated least-privilege token for D1 provisioning/migration operations. The workflow maps this to Wrangler's `CLOUDFLARE_API_TOKEN` only for the remote D1 steps.

Prefer a dedicated token scoped to the intended account and D1 write/edit operations rather than a global API key or a broad deployment token.

### What the manual provisioning workflow does
1. confirms the isolated branch and `PROVISION_D1` input before remote mutation;
2. fails before remote calls if either required secret is missing;
3. verifies `PAID_TRAFFIC_ENABLED === false` in source;
4. lists remote D1 databases with exact Wrangler `4.137.0`;
5. reuses exactly one database named `nano-json-lens-402-payment-state` if present, otherwise creates it;
6. resolves and validates the real public D1 UUID;
7. updates only the expected `PAYMENT_DB` entry in `wrangler.jsonc` through the tested JSONC helper;
8. lists and applies `migrations/0001_payment_state.sql` to the remote database;
9. validates the migrated `payment_operations` table;
10. runs a synthetic non-payment insert/read/CAS/read probe and removes the probe row;
11. refuses to overwrite a different already-real D1 UUID;
12. refuses to push the public UUID if the branch moved during provisioning;
13. commits only the public D1 UUID after all remote validation succeeds;
14. does **not** deploy the Worker and does **not** contact the Pursekeeper verify/settle paths.

Cloudflare documents that non-interactive CI authentication uses an API token plus account ID. Cloudflare also documents that remote D1 migrations can be applied with `wrangler d1 migrations apply ... --remote`; in CI the confirmation prompt is skipped while migration rollback/backup behavior remains handled by D1/Wrangler.

### Operator action
From GitHub Actions, choose **Provision Cloudflare D1**, select branch `task5-production-nano-payment`, enter `PROVISION_D1`, and run the workflow only after both repository secrets exist.

A successful run is evidence for D1 provisioning/migration and the remote synthetic state probe. It is **not** evidence that the Worker was deployed or that payment verify/settle works.

### Manual fallback
If the workflow cannot be used, the equivalent manual Wrangler sequence is:

```sh
npx --yes wrangler@4.137.0 d1 list --json
npx --yes wrangler@4.137.0 d1 create nano-json-lens-402-payment-state
npx --yes wrangler@4.137.0 d1 migrations list nano-json-lens-402-payment-state --remote
npx --yes wrangler@4.137.0 d1 migrations apply nano-json-lens-402-payment-state --remote
```

Any manual path must still follow the same UUID/rebinding, migration, remote probe, checkpoint, and no-paid-traffic rules.

## Persistent Payment State
`src/payment/d1-store.ts` is the production state adapter. `migrations/0001_payment_state.sql` defines its schema.

Operational rules:
- apply the migration before enabling payment-taking traffic;
- bind exactly the intended D1 database to the Worker;
- never fall back to `MemoryPaymentStateStore` in production;
- do not automatically retry ambiguous settlement writes;
- settlement state and receipt must be confirmed in one conditional database update;
- after deployment/redeploy, verify existing D1 state remains readable before permitting a live payment test.

## Deployment After D1 Provisioning
Provisioning the database does not deploy the service. A later controlled block must still:
1. verify the committed real D1 UUID and migration evidence;
2. run fresh full CI and Wrangler dry-run;
3. deploy while `PAID_TRAFFIC_ENABLED === false`;
4. externally verify `GET /health` and an unpaid `POST /api/lens` 402;
5. confirm proof-bearing requests still cannot reach verify/settle;
6. update the checkpoint before any paid-traffic proposal.

## Changes During the 14-Day Window
Avoid high-risk changes during the 14-day window. Urgent fixes should be small, tested, and documented.
