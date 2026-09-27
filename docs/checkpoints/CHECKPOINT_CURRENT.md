# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 021 — local paid runtime GREEN / guarded payment-enable workflow GREEN / production payment still hard-off
**Overall state:** TASK 5 IN PROGRESS / REAL D1 GREEN / PUBLIC CHALLENGE-ONLY WORKER GREEN / LOCAL PAID RUNTIME GREEN / PAID-ENABLE DEPLOYMENT PATH GREEN / PAID TRAFFIC HARD-OFF / LIVE VERIFY-SETTLE NOT STARTED / EXPLICIT OPERATOR AUTHORIZATION REQUIRED / MAIN UNTOUCHED

## Completed in this block
- Rechecked the Block 020 closing CI after it had previously appeared stuck in `npm ci`: Actions run `36283176906` eventually completed `success` with tests, typecheck, Wrangler dry-run, dependency-tree validation, and production audit all GREEN.
- Began execution of `docs/superpowers/plans/2026-09-26-paid-rollout-and-pursekeeper-submission.md` without changing the production rollout constant.
- Task 1 added Worker-level regression coverage for `allowPaidTraffic: true` using the existing durable D1 contract and a structurally valid local Nano state-block proof fixture.
- Ruling: the plan expected the new paid-runtime assertions to establish RED before implementation, but the paid branch already existed in `createCloudflareWorkerRuntime`. The new tests passed immediately, proving existing behavior. No production code was changed merely to manufacture a failing test.
- Task 1 evidence: commit `4987076673b7ab70afc54579c49236c107976f22`, Actions run `36284474392`, job `108522484660`: 92/92 tests passed, typecheck passed, Wrangler `4.137.0` dry-run passed with the real `PAYMENT_DB` binding, dependency tree passed, and production audit reported 0 vulnerabilities.
- The new paid-runtime tests prove that a structurally valid local proof in payment-enabled mode reaches exactly one verify and one settle, returns HTTP 200 with `payment-response`, and releases the promised JSON analysis only after confirmed settlement.
- The same Worker-level suite proves malformed proof material in payment-enabled mode returns HTTP 402 without protected analysis, without `payment-response`, and without a settlement call.
- Task 2 TDD RED evidence: commit `2120abfbca6b1c713157dc4694322c3e1b2e853d`, Actions run `36284519752`, job `108522615350`: 93 total tests, 92 passed, exactly one failed with `ENOENT` because `.github/workflows/cloudflare-worker-payment-enable.yml` did not yet exist.
- Added `.github/workflows/cloudflare-worker-payment-enable.yml` as a distinct payment-enable deployment path; the existing challenge-only deployment workflow remains unchanged.
- The payment-enable workflow is `workflow_dispatch` only, requires literal `ENABLE_PAID_TRAFFIC`, is restricted to `task5-production-nano-payment`, uses Wrangler `4.137.0`, validates the real D1 UUID and `PAYMENT_DB` binding, uses only the separate Workers deployment credential, and explicitly refuses to deploy unless source contains `PAID_TRAFFIC_ENABLED = true as const`.
- Before any deployment mutation, that workflow reruns tests, typecheck, Wrangler dry-run, dependency-tree validation, and production audit.
- After deployment it is limited to non-spending checks: bounded health readiness, unpaid exact Nano 402 terms, and deliberately malformed proof rejection. It contains no valid payment proof and no direct `verifyPayment` or `settlePayment` invocation.
- Task 2 GREEN evidence: commit `7714311ad89e08ba97e0be24ad193fbcdb507a0a`, Actions run `36284707142`, job `108523139758`: 93/93 tests passed, typecheck passed, Wrangler dry-run passed, dependency tree passed, and production audit reported 0 vulnerabilities.
- A temporary repository-write probe used while the connector rejected a direct workflow-file write was removed from the current tree in the workflow commit; it contained no credential or operational data.

## Active payment and rollout rulings
- `PAID_TRAFFIC_ENABLED` remains source-controlled `false` in `src/worker.ts`.
- The currently deployed Worker remains the Block 019 challenge-only version. No payment-capable Worker was deployed in Block 021.
- The new payment-enable workflow is intentionally inert against the current source state: its source guard requires `PAID_TRAFFIC_ENABLED = true as const`, so it cannot be used to bypass the explicit rollout change.
- Task 3 is a security-sensitive source change and deployment gate. Do not perform it from a generic continuation signal; obtain explicit operator authorization to enable paid traffic and deploy the payment-capable Worker.
- Do not introduce a Nano buyer seed/private key for a self-payment test. Pursekeeper's required listing call remains the intended first valid live payment.
- Unknown verify/settle transport state remains fail-closed. Do not automatically re-settle after ambiguity.
- Real production replay/settlement state remains Cloudflare D1; `MemoryPaymentStateStore` remains forbidden in payment-taking production.
- D1 and Workers Cloudflare credentials remain separate least-privilege GitHub Actions secrets.

## Deployment target and live configuration
- Runtime: Cloudflare Workers Free.
- Worker: `nano-json-lens-402`.
- Public endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Currently deployed Cloudflare version ID: `36286ef2-2068-4c6c-a735-4d20f6e9b5ae` (challenge-only).
- Persistent state: Cloudflare D1.
- D1 binding: `PAYMENT_DB`.
- D1 database ID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`.
- Network/scheme: `nano:mainnet` / `exact`.
- Price: `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Explicit non-claims
- production paid traffic: HARD-OFF;
- payment-capable Worker deployed: NO;
- endpoint submitted to Pursekeeper: NO;
- live facilitator verify: NOT STARTED;
- live facilitator settle: NOT STARTED;
- Nano transfer through this endpoint: NONE;
- seller listing accepted: NO;
- 10 XNO seller credit: NOT YET EARNED;
- 14-day seller-credit clock: NOT STARTED.

## Exact next step — requires explicit operator authorization
Task 3 of the controlled rollout plan is now the next gate. Before changing anything, obtain an explicit authorization equivalent to:

`Authorize enabling PAID_TRAFFIC_ENABLED and deploying the payment-capable Worker.`

After that authorization only:
1. change the production-entrypoint expectation test from `false` to `true` first and record RED;
2. change exactly `PAID_TRAFFIC_ENABLED` to `true as const` in `src/worker.ts` without changing price, payTo, facilitator, network, D1 binding, or payment algorithms;
3. run the complete verification suite and review the source diff;
4. deploy only through `.github/workflows/cloudflare-worker-payment-enable.yml` with `ENABLE_PAID_TRAFFIC`;
5. perform only non-spending public health/402/malformed-proof checks after deploy;
6. do not submit the endpoint to Pursekeeper until the payment-capable deployment is independently GREEN.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep work blocks approximately 15 minutes and update this checkpoint at every block closure. `main` remains untouched until isolated Task 5 work is verified and explicitly integrated.
