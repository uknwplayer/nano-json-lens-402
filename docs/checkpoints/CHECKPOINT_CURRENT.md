# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 022 — production paid traffic enabled / payment-capable Worker deployed GREEN / no valid live payment yet
**Overall state:** TASK 5 IN PROGRESS / REAL D1 GREEN / PAYMENT-CAPABLE PUBLIC WORKER GREEN / UNPAID 402 GREEN / MALFORMED-PROOF REJECTION GREEN / FIRST VALID LIVE PAYMENT NOT YET ATTEMPTED / PURSEKEEPER SUBMISSION NEXT / MAIN UNTOUCHED

## Completed in this block
- Received explicit operator authorization to enable `PAID_TRAFFIC_ENABLED` and deploy the payment-capable Worker.
- TDD RED: commit `8ea2c2a5f216ae08b9cecb6ab77e2425f686acfa`, Actions run `36285150057`, job `108524392146`: 93 tests total, 92 passed, exactly one failed because the production entrypoint still exported `PAID_TRAFFIC_ENABLED = false` while the new expectation required `true`.
- Changed only the source-controlled rollout constant in `src/worker.ts` from `false` to `true` plus its explanatory comment. Price, public payTo, facilitator URL, network, D1 binding, replay logic, verification logic, settlement logic, and protected-result logic were not changed.
- GREEN source commit: `1a34893a5fc9142645adf612af2a51601f5701bf`.
- Actions run `36285178793`, job `108524476873`, completed successfully with 93/93 tests, typecheck, Wrangler `4.137.0` dry-run using the real D1 binding, dependency-tree validation, and production audit.
- Diff review from Block 021 head `afc23b63e949125303333f3800ca630dfcdfdb7a` to the reviewed paid source changed only `src/worker.ts` and `test/worker-runtime.test.ts`.
- Because the repository default branch does not expose this branch-local manual workflow in the GitHub UI, an isolated one-shot launcher branch `work/payment-enabled-deploy-022` was created and pinned to reviewed source SHA `1a34893a5fc9142645adf612af2a51601f5701bf`.
- One-shot deployment evidence: Actions run `36285252016`, job `108524675284`, completed `success`.
- The launcher checked out exactly the reviewed source SHA, revalidated `PAID_TRAFFIC_ENABLED = true`, real D1 ID `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`, binding `PAYMENT_DB`, dedicated Workers credentials, and the complete verification suite before deployment.
- Cloudflare deployment succeeded for Worker `nano-json-lens-402` at `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- New Cloudflare version ID: `a6c0291a-b90e-447a-949c-8090f382837a`.
- Public post-deploy checks passed without spending Nano:
  - `GET /health` = HTTP 200 with bounded `status=ok`, `version=1` contract;
  - unpaid `POST /api/lens` = HTTP 402 with `payment-required` header and exact `nano:mainnet` / `exact` / `XNO` / expected raw amount / expected payTo terms;
  - deliberately malformed `payment-signature: AAAA` = HTTP 402 `PAYMENT_REJECTED`, no `payment-response`, and no protected result.
- No valid payment proof was generated or submitted by CI or by the operator in this block.
- No live successful facilitator verify, live successful settlement, or Nano transfer was observed in this block.
- After evidence capture, the temporary launcher branch was reset to the reviewed source SHA so the one-shot workflow is no longer present at its branch head.

## Active payment and rollout rulings
- `PAID_TRAFFIC_ENABLED` is now source-controlled `true` in `src/worker.ts`.
- The public Worker is payment-capable: a structurally valid external proof can now reach the real production verification/settlement path.
- The first valid live payment must remain Pursekeeper's own required seller-listing call; do not add a seller-side Nano seed/private key merely to self-pay.
- Unknown verify/settle transport state remains fail-closed. Never automatically re-settle after an ambiguous settlement outcome.
- Real production replay and settlement state remains Cloudflare D1; `MemoryPaymentStateStore` remains forbidden for production payment traffic.
- D1 and Workers credentials remain separate least-privilege GitHub Actions secrets.
- A malformed or structurally invalid proof is rejected locally before settlement and cannot release protected output.

## Deployment target and live configuration
- Runtime: Cloudflare Workers Free.
- Worker: `nano-json-lens-402`.
- Public endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Current Cloudflare version ID: `a6c0291a-b90e-447a-949c-8090f382837a` (payment-capable).
- Reviewed deployed source SHA: `1a34893a5fc9142645adf612af2a51601f5701bf`.
- Persistent state: Cloudflare D1.
- D1 binding: `PAYMENT_DB`.
- D1 database ID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`.
- Network/scheme: `nano:mainnet` / `exact`.
- Price: `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Explicit non-claims
- payment-capable Worker deployed: YES;
- valid live payment proof submitted: NO;
- successful live facilitator verify: NOT YET OBSERVED;
- successful live facilitator settle: NOT YET OBSERVED;
- Nano transfer through this endpoint: NONE OBSERVED;
- endpoint submitted to Pursekeeper: NO;
- seller listing accepted: NO;
- 10 XNO seller credit: NOT YET EARNED;
- 14-day seller-credit clock: NOT STARTED.

## Exact next step
Execute Task 5 of `docs/superpowers/plans/2026-09-26-paid-rollout-and-pursekeeper-submission.md`:
1. re-read the latest Pursekeeper seller eligibility thread immediately before submission;
2. if instructions are unchanged, reply in the existing thread with the live endpoint URL, repository URL, price `0.01 XNO`, and a concise description of the deterministic JSON Lens utility;
3. do not claim the seller checks have passed;
4. record the submission timestamp/message ID;
5. wait for Pursekeeper's own first paid listing call and treat it as the first controlled live payment;
6. on any ambiguous settlement state, reconcile D1 and Nano state before any retry.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep work blocks approximately 15 minutes and update this checkpoint at every block closure. `main` remains untouched until isolated Task 5 work is verified and explicitly integrated.
