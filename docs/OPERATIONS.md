# Operations and Availability

## Active Availability Goal
Keep the public endpoint functional throughout the confirmed Pursekeeper 14-day reachability window and with reasonable margin afterward.

Confirmed window:
- start: `2026-09-27`;
- second-stage date identified by Pursekeeper: `2026-10-11`;
- requirement: continue answering the reachability probe and keep the payment-taking code public.

## Health
Endpoint: `GET /health`

Live endpoint:

`https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev/health`

The Worker runtime keeps health independent of x402 bootstrap and D1 readiness. A facilitator or payment-state outage must not make the process health check fail.

Expected body:

```json
{"status":"ok","version":"1"}
```

## Incident Procedure
If an outage occurs:
1. record the approximate time;
2. identify the cause;
3. restore service;
4. test health;
5. test the unpaid 402 challenge;
6. update the checkpoint;
7. determine whether Pursekeeper must be informed or whether the reachability condition may have been affected.

For any payment ambiguity, do not automatically retry settlement. Reconcile D1 state and Nano/facilitator evidence first.

If the public `payTo` or the paid route changes, notify Pursekeeper the same day. Pursekeeper explicitly warned that otherwise the seller listing may become stale.

## Deployment Target
V1 target: **Cloudflare Workers Free + Cloudflare D1**.

The service uses a Fetch Worker module, the D1-backed production state adapter, and Wrangler `4.137.0`. Provider limits are external and must be rechecked before material traffic changes.

Official references:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/d1/wrangler-commands/

## Current Worker Rollout State
The real D1 database and payment-capable Worker are deployed and have completed a real paid Pursekeeper seller-check call.

- Worker: `nano-json-lens-402`.
- Public endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Current Cloudflare version ID: `a6c0291a-b90e-447a-949c-8090f382837a`.
- Reviewed deployed source SHA: `1a34893a5fc9142645adf612af2a51601f5701bf`.
- `PAID_TRAFFIC_ENABLED` is source-controlled `true`.
- Environment configuration cannot independently change paid traffic state.
- `GET /health` remains independent of D1/x402 initialization.
- `/api/lens` requires HTTPS and the real `PAYMENT_DB` binding.
- D1 UUID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`.
- Migration `0001_payment_state.sql` is applied remotely.
- Valid external payment proofs may reach production verify/settle.

## Real Paid Seller-Check Evidence
Pursekeeper acceptance email: Gmail message ID `1a0e124b3218e1af`, timestamp `2026-09-27T04:34:30Z`.

Pursekeeper reported checks ran at 04:28–04:30 UTC:
- unpaid `POST /api/lens` returned HTTP 402 with the expected `PAYMENT-REQUIRED` terms;
- its paid call settled through the Pursekeeper facilitator;
- the paid route returned HTTP 200 with canonical output, SHA-256, size/depth metrics, and path information;
- `/health` answered and the paid route remained reachable under probe.

First paid-call send block:
`BB290B0B406FF6705B42430C4B0082EF9DEC3792FA34825BDE06DC9CADAF635E`

Seller listing: `uknwplayer-json-lens`.

First-stage credit: 10 XNO, Pursekeeper ledger entry 260.

Pursekeeper stated that nothing else is currently required from the operator except same-day notice if the payTo or route changes.

## D1 Provisioning Evidence
- Actions run: `36280708030`;
- job: `108511852925`;
- database: `nano-json-lens-402-payment-state`;
- database ID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`;
- region reported by Wrangler: `ENAM`;
- migration: applied;
- synthetic state probe: passed and cleaned up;
- UUID commit: `21c86dfbdb5460bb1596f11cd2aefced6d443244`.

## Challenge-Only Deployment Evidence
First challenge-only deployment:
- Actions run: `36281960914`;
- job: `108515377275`;
- reviewed branch SHA: `92aa8971e227520195b58c088a7dfdd0d00f5204`;
- Worker URL: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`;
- Cloudflare version ID: `36286ef2-2068-4c6c-a735-4d20f6e9b5ae`.

The first immediate health probe after that initial deployment returned HTTP 404 / Cloudflare error 1042. No runtime relaxation was added. Diagnostic run `36282060561`, job `108515655977`, observed the same unchanged Worker returning HTTP 200 shortly afterward. This is handled as bounded initial readiness/propagation.

## Payment-Capable Deployment Evidence
Block 022 received explicit operator authorization before source-level payment enablement.

Source transition:
- RED commit: `8ea2c2a5f216ae08b9cecb6ab77e2425f686acfa`;
- RED Actions run: `36285150057`, job `108524392146`;
- GREEN paid source: `1a34893a5fc9142645adf612af2a51601f5701bf`;
- GREEN source CI: `36285178793`, job `108524476873` — 93/93 tests, typecheck, Wrangler dry-run, dependency tree, and audit passed.

Production deployment:
- one-shot Actions run: `36285252016`;
- job: `108524675284`;
- source pinned exactly to `1a34893a5fc9142645adf612af2a51601f5701bf`;
- Worker URL: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`;
- Cloudflare version ID: `a6c0291a-b90e-447a-949c-8090f382837a`;
- D1 binding: real `PAYMENT_DB`.

## Cloudflare Credential Handling
Repository Actions secrets are separated by function:
- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_D1_API_TOKEN` — D1 provisioning only;
- `CLOUDFLARE_WORKERS_API_TOKEN` — Worker deployment only.

Rules:
- never paste secret values into chat, source files, issues, workflow inputs, artifacts, or logs;
- keep the D1 token scoped to D1 edit/write operations for the intended account;
- keep the Workers token scoped to Workers Scripts Edit for the intended account;
- Workers Scripts Edit has been sufficient; do not escalate to Workers Admin without a documented requirement;
- do not use global API keys.

## Persistent Payment State
`src/payment/d1-store.ts` is the production state adapter. `migrations/0001_payment_state.sql` defines its schema.

Operational rules:
- never fall back to `MemoryPaymentStateStore` in production;
- do not automatically retry ambiguous settlement writes;
- settlement state and receipt must be confirmed in one conditional database update;
- after deploy/redeploy, confirm the same D1 binding is present before allowing a live payment attempt.

## Active 14-Day Window Rules
1. Keep the endpoint and current paid route reachable.
2. Keep payment-taking code public in this repository.
3. Avoid unnecessary production changes during the window.
4. If a change is necessary, keep it small, tested, documented, and compatible with the listing.
5. Notify Pursekeeper the same day if the payTo or route changes.
6. Record any outage or meaningful reachability incident immediately.
7. On/after 2026-10-11, verify the second-stage result and record the 15 XNO evidence before claiming completion.
