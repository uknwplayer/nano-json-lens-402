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
The real D1 database and the challenge-only Worker are now deployed.

- Worker: `nano-json-lens-402`.
- Public endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Cloudflare version ID from first deployment: `36286ef2-2068-4c6c-a735-4d20f6e9b5ae`.
- `PAID_TRAFFIC_ENABLED` remains source-controlled `false`.
- Environment configuration cannot enable paid traffic.
- A submitted payment proof is blocked by challenge-only runtime before facilitator verify/settle.
- `GET /health` is independent of D1/x402 initialization.
- `/api/lens` requires HTTPS and the real `PAYMENT_DB` binding.
- D1 UUID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`.
- Migration `0001_payment_state.sql` is applied remotely.
- Remote synthetic write/read/CAS/delete validation passed before deployment.

## D1 Provisioning Evidence
- Actions run: `36280708030`;
- job: `108511852925`;
- database: `nano-json-lens-402-payment-state`;
- database ID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`;
- region reported by Wrangler: `ENAM`;
- migration: applied;
- synthetic state probe: passed and cleaned up;
- UUID commit: `21c86dfbdb5460bb1596f11cd2aefced6d443244`.

## Worker Deployment Evidence
First challenge-only deployment:
- Actions run: `36281960914`;
- job: `108515377275`;
- reviewed branch SHA: `92aa8971e227520195b58c088a7dfdd0d00f5204`;
- deployment step: success;
- Worker URL: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`;
- Cloudflare version ID: `36286ef2-2068-4c6c-a735-4d20f6e9b5ae`.

The first immediate health probe returned HTTP 404 / Cloudflare error 1042. The deployment was not changed. Diagnostic run `36282060561`, job `108515655977`, observed the same unchanged Worker returning HTTP 200 with the exact health body shortly afterward. This is operationally handled as bounded initial readiness/propagation rather than by adding a broad runtime compatibility relaxation.

Independent public-only verification:
- Actions run: `36282142586`;
- job: `108515889136`;
- Cloudflare credentials used by probe: none;
- `GET /health`: HTTP 200;
- unpaid `POST /api/lens`: HTTP 402;
- exact Nano mainnet / XNO / expected raw amount / expected payTo: passed;
- `payment-required` header: present;
- protected result in unpaid response: absent.

## Post-deploy Readiness Policy
The permanent deployment workflow `.github/workflows/cloudflare-worker-deploy.yml` uses a bounded health readiness loop after Wrangler reports deployment:
- maximum attempts: 24;
- delay between attempts: 5 seconds;
- failed/temporary HTTP responses are observed but do not cause an immediate false deployment failure;
- the workflow exits with failure if health never reaches 200 within the bounded window;
- after HTTP 200, the exact `status=ok` / `version=1` body contract is validated;
- only then is the unpaid 402 probe executed.

TDD evidence for this policy:
- RED run `36282176562` at commit `22f2a02e71add01ee564635ab639869a5cb59f4a`;
- GREEN run `36282271750` at commit `8f3a8b42e65d4d7f26cb1da4eae10db52fbe09ee`.

## Cloudflare Credential Handling
Repository Actions secrets are separated by function:
- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_D1_API_TOKEN` — D1 provisioning only;
- `CLOUDFLARE_WORKERS_API_TOKEN` — Worker deployment only.

Rules:
- never paste secret values into chat, source files, issues, workflow inputs, artifacts, or logs;
- keep the D1 token scoped to D1 edit/write operations for the intended account;
- keep the Workers token scoped to Workers Scripts Edit for the intended account;
- the first deployment proved Workers Scripts Edit was sufficient; do not escalate to Workers Admin without a new documented requirement;
- do not use global API keys.

## Persistent Payment State
`src/payment/d1-store.ts` is the production state adapter. `migrations/0001_payment_state.sql` defines its schema.

Operational rules:
- never fall back to `MemoryPaymentStateStore` in production;
- do not automatically retry ambiguous settlement writes;
- settlement state and receipt must be confirmed in one conditional database update;
- after Worker deployment/redeploy, confirm existing D1 state remains available before permitting a live payment test.

## Payment Rollout State
Public challenge generation is live, but payment-taking remains disabled.

Before any real proof is submitted:
1. perform the final deployed challenge-only/proof-header security review;
2. confirm Pursekeeper's submission and acceptance sequence;
3. define the first controlled payment test and reconciliation evidence;
4. require explicit operator authorization for the live payment block;
5. only then change the source-controlled paid-traffic gate if all prerequisites are GREEN.

No live payment proof, facilitator verify, facilitator settle, or Nano transfer occurred during initial deployment.

## Pursekeeper Window
The endpoint is publicly reachable, but the project does not infer the start of the Pursekeeper 14-day window from deployment alone. Record a window start only when the relevant Pursekeeper submission/acceptance condition is confirmed from client evidence.

## Changes During a Confirmed 14-Day Window
Avoid high-risk changes during the confirmed window. Urgent fixes should be small, tested, and documented.
