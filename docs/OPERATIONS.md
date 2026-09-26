# Operations and Availability

## Initial Availability Goal
Keep the public endpoint functional throughout the Pursekeeper-required window, with margin beyond the 14-day period.

## Health
Planned endpoint: `GET /health`

Minimum response should expose:
- status;
- version/build;
- server timestamp if useful.

It must not require payment.

## Incident Procedure
If an outage occurs:
1. record the approximate time;
2. identify the cause;
3. restore service;
4. test health;
5. test the 402 challenge;
6. update the checkpoint;
7. determine whether Pursekeeper must be informed or the reachability window must restart.

## Deployment
V1 deployment target selected on 2026-09-26: **Cloudflare Workers Free + Cloudflare D1**.

Reasons:
- the service already uses a portable Fetch handler suitable for Workers;
- the current Workers compatibility model supports the Node APIs used by this project when an appropriate current compatibility date is configured;
- Workers Free has no application sleep/wake server lifecycle to manage;
- D1 supplies persistent SQLite-backed state and conditional SQL writes for the replay/settlement store;
- the selected free-tier capacity is far above the expected initial service traffic, but limits must be rechecked immediately before deployment.

As documented by Cloudflare when this decision was made, the relevant free-plan allowances included 100,000 Worker requests/day and D1 allowances of 5 million rows read/day, 100,000 rows written/day, and 5 GB total storage. These are external service limits, not project guarantees, and may change.

Official references:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/

### Deployment is not complete
Selection and local contract validation do not mean a Cloudflare Worker or D1 database exists yet. Account-side provisioning, D1 migration application, Worker binding/configuration, deployment, and external reachability tests remain future controlled steps.

## Persistent Payment State
`src/payment/d1-store.ts` is the production state adapter. `migrations/0001_payment_state.sql` defines its schema.

Operational rules:
- apply the migration before enabling payment-taking traffic;
- bind exactly the intended D1 database to the Worker;
- never fall back to `MemoryPaymentStateStore` in production;
- do not automatically retry ambiguous settlement writes;
- settlement state and receipt must be confirmed in one conditional database update;
- after deployment/redeploy, verify the existing D1 state remains readable before permitting a live payment test.

## Changes During the 14-Day Window
Avoid high-risk changes during the 14-day window. Urgent fixes should be small, tested, and documented.
