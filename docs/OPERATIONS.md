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

## Worker Rollout State
The Worker code and deployment bundle are now prepared, but **no Cloudflare account-side resource has been provisioned or deployed yet**.

Current rollout safeguards:
- `src/worker.ts` exports the production Worker module;
- `PAID_TRAFFIC_ENABLED` is a source-controlled `false` constant;
- environment configuration cannot enable paid traffic in this stage;
- a submitted `payment-signature` is rejected before facilitator `verify` or `settle` can run;
- `GET /health` does not require D1 or x402 initialization;
- `/api/lens` requires HTTPS and a valid `PAYMENT_DB` binding;
- missing D1 state fails closed with 503;
- the production resource URL is normalized to the request origin plus `/api/lens`;
- `wrangler.jsonc` contains a deliberate zero UUID placeholder and is not a real D1 binding yet.

CI validates the Worker bundle with exactly:

```sh
npx --yes wrangler@4.137.0 deploy --dry-run
```

The dry-run must remain green before any account-side deployment step.

## D1 Provisioning Procedure
Do not run these commands until authenticated to the intended Cloudflare account and ready to record the resulting resource identifiers.

1. Create the remote D1 database:

```sh
npx --yes wrangler@4.137.0 d1 create nano-json-lens-402-payment-state
```

2. Copy the returned real `database_id` into `wrangler.jsonc`, replacing only:

```text
00000000-0000-0000-0000-000000000000
```

3. Review remote migration status:

```sh
npx --yes wrangler@4.137.0 d1 migrations list nano-json-lens-402-payment-state --remote
```

4. Apply the committed migration:

```sh
npx --yes wrangler@4.137.0 d1 migrations apply nano-json-lens-402-payment-state --remote
```

5. Validate the real binding with controlled non-payment state operations before deployment. The test must cover write/read/CAS and state persistence without any facilitator verify/settle call.

6. Deploy **challenge-only**:

```sh
npx --yes wrangler@4.137.0 deploy
```

7. Externally verify:
- `GET /health` returns 200;
- a valid unpaid `POST /api/lens` returns the expected 402 challenge;
- a request that includes a payment proof still cannot reach verify/settle while `PAID_TRAFFIC_ENABLED === false`.

Only after the real D1 binding, migration, deployed health path, deployed 402 path, and security checks are independently GREEN may a later block propose changing the source-controlled paid-traffic gate.

## Persistent Payment State
`src/payment/d1-store.ts` is the production state adapter. `migrations/0001_payment_state.sql` defines its schema.

Operational rules:
- apply the migration before enabling payment-taking traffic;
- bind exactly the intended D1 database to the Worker;
- never fall back to `MemoryPaymentStateStore` in production;
- do not automatically retry ambiguous settlement writes;
- settlement state and receipt must be confirmed in one conditional database update;
- after deployment/redeploy, verify existing D1 state remains readable before permitting a live payment test.

## Changes During the 14-Day Window
Avoid high-risk changes during the 14-day window. Urgent fixes should be small, tested, and documented.
