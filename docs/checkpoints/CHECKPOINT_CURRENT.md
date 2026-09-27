# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 018 — guarded challenge-only Worker deployment path GREEN / Workers authorization pending
**Overall state:** TASK 5 IN PROGRESS / REAL D1 GREEN / DEPLOYMENT WORKFLOW GREEN / WORKER NOT DEPLOYED / PAID TRAFFIC HARD-OFF / LIVE VERIFY-SETTLE NOT STARTED / MAIN UNTOUCHED

## Completed in this block
- Reconfirmed the reviewed branch head and the real D1-backed Worker configuration before deployment work.
- Rechecked current Cloudflare authorization guidance: Wrangler CI uses an API token plus account ID; deploying an existing Worker requires Workers deployment/edit authorization, while creating a new Worker can require broader Workers creation authorization. D1 permission is not required merely because the Worker has a D1 binding.
- Security ruling: do not broaden or reuse `CLOUDFLARE_D1_API_TOKEN` for Worker deployment. Keep D1 provisioning and Worker deployment credentials separated.
- Added `test/cloudflare-worker-deploy-workflow.test.ts` before the deployment workflow.
- TDD RED evidence: commit `b1179e7e7ccbd1b50413348c17d56221f9e8417f`, Actions run `36281170096`, job `108513125280`: 90 tests total, 89 passed, exactly one failed because `.github/workflows/cloudflare-worker-deploy.yml` did not exist.
- Added `.github/workflows/cloudflare-worker-deploy.yml` in commit `fb530c8526ca9f5af3900d02f7de9670186b0913`.
- The deployment workflow is manual-only, requires literal `DEPLOY_CHALLENGE_ONLY`, is guarded to `task5-production-nano-payment`, uses exact Wrangler `4.137.0`, checks the real D1 UUID, and rechecks `PAID_TRAFFIC_ENABLED === false` before any Cloudflare deployment call.
- The workflow requires a dedicated GitHub Actions secret named `CLOUDFLARE_WORKERS_API_TOKEN`; it does not use the D1 token for deployment.
- Before deploy, the workflow reruns tests, typecheck, and Wrangler dry-run.
- After deploy, it is designed to discover the public `workers.dev` URL and externally require `GET /health` = 200 and an unpaid `POST /api/lens` = 402 with exact Nano mainnet / XNO / expected amount / expected payTo and no protected result.
- The workflow contains no submitted payment proof and no direct `verifyPayment`/`settlePayment` action.
- First GREEN attempt exposed only a test-syntax assumption (`EXPECTED_STATUS=200` vs YAML `EXPECTED_STATUS: '200'`); production workflow behavior was unchanged.
- Test correction commit: `b96566c8625d46af416364e8c86babedecac6547`.
- GREEN evidence: Actions run `36281265524`, job `108513396694`: full tests, typecheck, Wrangler dry-run, dependency-tree validation, and production dependency audit all passed.

## Active payment and rollout rulings
- `PAID_TRAFFIC_ENABLED` remains source-controlled `false`; no environment setting may bypass this rollout gate.
- The real Cloudflare D1 database remains the intended production state backend.
- A submitted proof in challenge-only mode must never reach facilitator `verify` or `settle`.
- `requestDigest` is local service metadata, not cryptographic binding between Nano payment and submitted JSON.
- Stable replay identity is derived from validated Nano state-block material, not serialized envelope bytes.
- Facilitator verification and Nano settlement remain authoritative for payment validity/finality.
- Production payment-taking requires bootstrap `ready` and a `PaymentStateStore` with `productionSafe === true`.
- Settlement confirmation must atomically persist both `settled` state and bounded receipt.
- Stale or ambiguous settlement writes fail closed; do not add automatic settlement write retries.
- Cloudflare credentials remain only in GitHub Actions Secrets and must never be copied into chat or repository content.
- D1 and Workers tokens remain separate least-privilege credentials.
- No Nano seed/private key is stored or required.

## Deployment target and configuration
- Runtime: Cloudflare Workers Free.
- Persistent state: Cloudflare D1.
- Worker name: `nano-json-lens-402`.
- Worker entrypoint: `src/worker.ts`.
- Runtime adapter: `src/worker-runtime.ts`.
- D1 binding: `PAYMENT_DB`.
- D1 database: `nano-json-lens-402-payment-state`.
- D1 database ID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`.
- Remote migration `0001_payment_state.sql`: applied and validated.
- Deployment workflow: `.github/workflows/cloudflare-worker-deploy.yml`.
- Wrangler: `4.137.0`.

## Scope of evidence / explicit non-claims
Current direct evidence proves the real D1 backend and proves that the guarded challenge-only deployment workflow passes repository CI. It does **not** prove that the Worker has been deployed.

Therefore:
- real D1: GREEN;
- remote migration/state probe: GREEN;
- deployment workflow contract: GREEN;
- Worker deployment: WAITING ON WORKERS AUTHORIZATION;
- public `GET /health`: NOT YET LIVE;
- public unpaid `POST /api/lens` 402: NOT YET LIVE;
- live `verify` / `settle`: NOT STARTED;
- Nano transfer: NONE;
- Pursekeeper 14-day reachability window: NOT STARTED.

## Required operator action — do not paste the token into chat
Create a separate Cloudflare Workers deployment API token, scoped to the intended account and only the minimum Workers permission available for deployment. Start with the current equivalent of Workers Scripts Edit / Workers Editor rather than broadening the D1 token. Store it only as the GitHub Actions repository secret:

`CLOUDFLARE_WORKERS_API_TOKEN`

If Cloudflare rejects the first deployment specifically because `nano-json-lens-402` does not yet exist and creation requires a stronger Workers role, stop and record that evidence before increasing privilege. Do not grant broader permissions preemptively.

## Exact next step after that secret exists
1. verify the reviewed branch has not moved unexpectedly;
2. launch the guarded deployment through an isolated one-shot dispatcher because the permanent manual workflow is branch-only;
3. require the workflow to pass its pre-deploy checks before the Cloudflare mutation;
4. capture the authoritative public Worker URL from Wrangler;
5. externally validate `GET /health` = 200 and unpaid `POST /api/lens` = 402;
6. independently re-check the endpoint outside the deployment runner;
7. update checkpoint/security evidence;
8. only in a later explicitly authorized block consider any live payment proof, `verify`, or `settle` test.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep work blocks approximately 15 minutes and update this checkpoint at every block closure. `main` remains untouched until isolated Task 5 work is verified and explicitly integrated.
