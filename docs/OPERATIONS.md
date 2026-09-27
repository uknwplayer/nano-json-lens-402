# Operations and Availability

## Initial Availability Goal
Keep the public endpoint functional throughout any Pursekeeper-required window, with margin beyond the 14-day period once its confirmed start event is known.

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
7. determine whether Pursekeeper must be informed or any confirmed reachability window must restart.

For any payment ambiguity, do not automatically retry settlement. Reconcile D1 state and Nano/facilitator evidence first.

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
The real D1 database and payment-capable Worker are deployed.

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
- Remote synthetic write/read/CAS/delete validation passed before deployment.
- Valid external payment proofs may now reach production verify/settle. Treat live payment attempts as stateful financial operations.

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

Independent public-only challenge verification:
- Actions run: `36282142586`;
- job: `108515889136`;
- `GET /health`: HTTP 200;
- unpaid `POST /api/lens`: HTTP 402;
- exact Nano mainnet / XNO / expected raw amount / expected payTo: passed;
- `payment-required` header: present;
- protected result in unpaid response: absent.

## Payment-Capable Deployment Evidence
Block 022 received explicit operator authorization before source-level payment enablement.

Source transition:
- RED commit: `8ea2c2a5f216ae08b9cecb6ab77e2425f686acfa`;
- RED Actions run: `36285150057`, job `108524392146` — exactly one intended `false !== true` entrypoint failure;
- GREEN paid source: `1a34893a5fc9142645adf612af2a51601f5701bf`;
- GREEN source CI: `36285178793`, job `108524476873` — 93/93 tests, typecheck, Wrangler dry-run, dependency tree, and audit passed.

Production deployment:
- one-shot Actions run: `36285252016`;
- job: `108524675284`;
- source pinned exactly to `1a34893a5fc9142645adf612af2a51601f5701bf`;
- deployment: success;
- Worker URL: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`;
- Cloudflare version ID: `a6c0291a-b90e-447a-949c-8090f382837a`;
- D1 binding: real `PAYMENT_DB`.

Post-deploy non-spending validation:
- `GET /health`: HTTP 200;
- unpaid `POST /api/lens`: HTTP 402 with expected exact Nano terms;
- malformed `payment-signature: AAAA`: HTTP 402 with `PAYMENT_REJECTED`;
- malformed-proof `payment-response`: absent;
- protected output on unpaid/malformed paths: absent;
- valid payment proof generated/submitted: no.

The one-shot launcher branch was reset to the reviewed source SHA after evidence capture, removing the launcher workflow from its branch head.

## Post-deploy Readiness Policy
Deployment automation uses a bounded health readiness loop after Wrangler reports deployment:
- maximum attempts: 24;
- delay between attempts: 5 seconds;
- failed/temporary HTTP responses are observed but do not cause an immediate false deployment failure;
- deployment fails if health never reaches 200 within the bounded window;
- after HTTP 200, the exact `status=ok` / `version=1` body contract is validated;
- only then are public endpoint probes executed.

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

## Payment Rollout State
Public payment-taking is now enabled, but the first valid live payment has not yet been attempted.

Before submission to Pursekeeper:
1. re-read the latest seller eligibility thread;
2. ensure instructions have not changed;
3. submit the payment-capable endpoint in the existing thread;
4. do not claim checks have passed;
5. treat Pursekeeper's own paid listing call as the first controlled valid payment;
6. on any verify/settle ambiguity, reconcile before any retry.

Do not introduce a seller-side Nano seed/private key merely to self-pay.

## Pursekeeper Window
The endpoint is publicly reachable and payment-capable, but the project does not infer the start of the Pursekeeper 14-day window from deployment alone. Record a window start only when the relevant Pursekeeper listing/reachability condition is confirmed from client evidence.

## Changes During a Confirmed 14-Day Window
Avoid high-risk changes during the confirmed window. Urgent fixes should be small, tested, and documented.
