# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 020 — deployed proof-header fail-closed review GREEN / paid-rollout plan prepared
**Overall state:** TASK 5 IN PROGRESS / REAL D1 GREEN / PUBLIC CHALLENGE-ONLY WORKER GREEN / DEPLOYED PROOF-HEADER FAIL-CLOSED GREEN / PURSEKEEPER SEQUENCE CONFIRMED / PAID TRAFFIC HARD-OFF / LIVE VERIFY-SETTLE NOT STARTED / MAIN UNTOUCHED

## Completed in this block
- Revalidated `task5-production-nano-payment` at commit `c242f52459bf0de32d16fa4dad415eea96be7f52` before the public security probe.
- Created isolated temporary branch `work/public-worker-security-review` only to launch a public-only probe against the already-deployed Worker.
- The probe checked out the reviewed production branch, pinned its exact SHA, and rechecked both `PAID_TRAFFIC_ENABLED = false` and the challenge-only paid-traffic blocker before sending any request.
- Public security evidence: Actions run `36282801732`, job `108517755618`, completed `success`.
- A request carrying a deliberately non-payment `payment-signature` returned HTTP 503 fail-closed.
- The blocked-proof response retained `cache-control: no-store` and `x-content-type-options: nosniff`.
- The blocked-proof response contained no `payment-response`, no failed-proof `payment-required`, and no protected `analysis`, `canonicalJson`, or `sha256` output.
- The bounded error code was `PAYMENT_UNAVAILABLE`.
- Immediately after the blocked proof, public `GET /health` remained HTTP 200.
- A subsequent unpaid `POST /api/lens` remained HTTP 402.
- The public security probe used no Cloudflare credential and no real Nano proof; no facilitator `verify` or `settle` and no Nano transfer occurred.
- Compared deployed source commit `92aa8971e227520195b58c088a7dfdd0d00f5204` through Block 019 head `c242f52459bf0de32d16fa4dad415eea96be7f52`: intervening changes were workflow/test/docs only; no `src/` runtime file changed.
- Re-read the direct Pursekeeper eligibility thread. Pursekeeper explicitly instructed that seller listings need no hold and the endpoint should be sent when it is live.
- Confirmed the seller checks include: unpaid 402 terms, one paid call by Pursekeeper that completes and delivers the promised utility, and continued availability.
- Ruling: the current challenge-only deployment must not yet be submitted as acceptance-ready because the required paid call is intentionally blocked.
- Ruling: do not introduce a seller-side/self-test Nano seed or private key merely to self-pay. Pursekeeper's own required listing call will be the first controlled real payment after paid mode is proven, explicitly authorized, and deployed.
- Created `docs/superpowers/plans/2026-09-26-paid-rollout-and-pursekeeper-submission.md` covering local paid-runtime proof, separate payment-enable deployment automation, explicit enablement authorization, non-spending post-deploy validation, submission, and first-payment reconciliation.
- Updated `docs/PURSEKEEPER_ACCEPTANCE.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`, and `docs/EXECUTION_LEDGER.md` with the Block 020 rulings/evidence.

## Active payment and rollout rulings
- `PAID_TRAFFIC_ENABLED` remains source-controlled `false`.
- Environment configuration cannot bypass the source rollout gate.
- The deployed Worker remains challenge-only and publicly reachable.
- Do not submit the endpoint to Pursekeeper while challenge-only, because the required paid listing call would fail by design.
- Before changing the rollout gate: prove the `allowPaidTraffic: true` runtime path locally, add a separate guarded payment-enable deployment workflow, run fresh full CI, and obtain explicit operator authorization for the source change/deploy.
- Do not store or expose a Nano seed/private key for a self-payment test.
- Unknown settlement state remains fail-closed with no automatic re-settlement.
- Production state remains the real D1 backend; memory state remains forbidden for payment-taking production.
- D1 and Workers Cloudflare credentials remain separate least-privilege GitHub Actions secrets.

## Deployment target and live configuration
- Runtime: Cloudflare Workers Free.
- Worker: `nano-json-lens-402`.
- Public endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Deployed Cloudflare version ID: `36286ef2-2068-4c6c-a735-4d20f6e9b5ae`.
- Persistent state: Cloudflare D1.
- D1 binding: `PAYMENT_DB`.
- D1 database ID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`.
- Network/scheme: `nano:mainnet` / `exact`.
- Price: `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Pursekeeper sequence now confirmed
1. Finish local/payment-enable rollout preparation while the public Worker stays challenge-only.
2. Obtain explicit authorization and deploy the payment-capable Worker.
3. Re-check public health, unpaid 402 terms, and malformed-proof rejection without spending Nano.
4. Send the endpoint to Pursekeeper in the existing eligibility thread; no hold is required.
5. Pursekeeper performs its own required first paid call.
6. Record listing and the 10 XNO prepaid-call credit only after the checks pass.
7. Start the 14-day record from the first Pursekeeper-confirmed listing/reachability-probe date unless Pursekeeper explicitly states another start time.

## Explicit non-claims
- paid traffic: HARD-OFF;
- endpoint submitted to Pursekeeper: NO;
- live facilitator verify: NOT STARTED;
- live facilitator settle: NOT STARTED;
- Nano transfer through this endpoint: NONE;
- seller listing accepted: NO;
- 10 XNO seller credit: NOT YET EARNED;
- 14-day seller-credit clock: NOT STARTED.

## Exact next step
Continue Task 5 on `task5-production-nano-payment` by executing **Task 1** of `docs/superpowers/plans/2026-09-26-paid-rollout-and-pursekeeper-submission.md`:
1. parameterize the Worker test harness for `allowPaidTraffic: true` without changing the production entrypoint;
2. add a valid Nano state-block proof fixture for the Worker-level test;
3. establish RED for the payment-enabled runtime behavior;
4. prove one valid local proof reaches verify/settle exactly once and releases output only after confirmed settlement;
5. prove malformed proof remains safe;
6. run full CI and update this checkpoint;
7. keep `PAID_TRAFFIC_ENABLED = false` throughout that next block.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep work blocks approximately 15 minutes and update this checkpoint at every block closure. `main` remains untouched until isolated Task 5 work is verified and explicitly integrated.
