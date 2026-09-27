# Execution ledger — plan: docs/superpowers/plans/2026-09-26-nano-json-lens-v1.md

This file is the current execution-ledger entry point.

The exact historical ledger for Blocks 005–015 is preserved byte-for-byte at:

`docs/execution-ledger/EXECUTION_LEDGER_005_015.md`

The split was made in Block 019 because the original ledger had stopped at Block 015 while checkpoints had continued. No historical entry was deleted or rewritten.

## Block 016 / Task 5 — guarded Cloudflare D1 provisioning automation
Branch: `task5-production-nano-payment`.

Added and tested the branch-guarded D1 provisioning workflow and JSONC finalization helper. The workflow uses only `CLOUDFLARE_ACCOUNT_ID` and dedicated `CLOUDFLARE_D1_API_TOKEN`, resolves/reuses exactly one intended database by name, applies migrations, performs a synthetic non-payment write/read/CAS/delete probe, and commits only the public database UUID after successful validation. It never deploys the Worker or contacts Pursekeeper verify/settle.

Ruling: Cloudflare credentials remain out of repository and conversation content. The D1 token is least-privilege and must not be broadened for Worker deployment.

## Block 017 / Task 5 — real D1 provisioned and remotely validated
Branch: `task5-production-nano-payment`.

Actions run `36280708030`, job `108511852925`, created/reused real Cloudflare D1 database `nano-json-lens-402-payment-state`, ID `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`, applied `0001_payment_state.sql`, queried `payment_operations`, and passed the synthetic remote insert/read/CAS/read/delete probe. Commit `21c86dfbdb5460bb1596f11cd2aefced6d443244` placed only the public D1 UUID into `wrangler.jsonc`.

No Worker deployment, payment proof, verify, settle, or Nano transfer occurred.

## Block 018 / Task 5 — guarded challenge-only Worker deployment path
Branch: `task5-production-nano-payment`.

Added test-first `.github/workflows/cloudflare-worker-deploy.yml`. The workflow is manual-only, requires `DEPLOY_CHALLENGE_ONLY`, is branch-guarded, validates the real D1 UUID and source-controlled `PAID_TRAFFIC_ENABLED === false`, uses exact Wrangler `4.137.0`, and requires a separate `CLOUDFLARE_WORKERS_API_TOKEN` rather than reusing the D1 credential.

TDD RED: commit `b1179e7e7ccbd1b50413348c17d56221f9e8417f`, Actions run `36281170096` — the deployment workflow did not yet exist. GREEN after workflow/test correction: Actions run `36281265524`, job `108513396694` — tests, typecheck, Wrangler dry-run, dependency tree, and audit passed.

No Worker deployment occurred in Block 018.

## Block 019 / Task 5 — public challenge-only Worker deployment
Branch: `task5-production-nano-payment`.

A dedicated Cloudflare Workers Scripts Edit token was stored only as `CLOUDFLARE_WORKERS_API_TOKEN`. Workers Admin escalation was not required.

One-shot deployment run `36281960914`, job `108515377275`, pinned reviewed SHA `92aa8971e227520195b58c088a7dfdd0d00f5204`, revalidated the hard-off payment gate and full CI, then successfully deployed:
- Worker: `nano-json-lens-402`;
- URL: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`;
- Cloudflare version ID: `36286ef2-2068-4c6c-a735-4d20f6e9b5ae`;
- D1 binding: real `PAYMENT_DB`.

The first immediate `/health` request returned Cloudflare HTTP 404 / error 1042. No Worker code or compatibility flag was changed. Diagnostic run `36282060561`, job `108515655977`, observed the exact unchanged deployment returning HTTP 200 with `{"status":"ok","version":"1"}` shortly afterward.

Independent public-only run `36282142586`, job `108515889136`, used no Cloudflare credentials and passed:
- public `GET /health` = 200;
- unpaid `POST /api/lens` = 402;
- exact / nano:mainnet / XNO;
- amount `10000000000000000000000000000` raw;
- expected public payTo;
- `payment-required` header present;
- no protected result/analysis.

Ruling: the observed initial failure is handled as bounded deployment readiness/propagation, not by broadening Worker fetch behavior. The permanent deployment workflow was hardened test-first with at most 24 health attempts spaced 5 seconds apart, then terminal failure.

Readiness RED: commit `22f2a02e71add01ee564635ab639869a5cb59f4a`, Actions run `36282176562`, 90 total / 89 passed / one intended workflow-contract failure. GREEN: commit `8f3a8b42e65d4d7f26cb1da4eae10db52fbe09ee`, Actions run `36282271750`, job `108516259954`: 90/90 tests, typecheck, Wrangler dry-run, dependency tree, and production audit passed.

Security status at block close: `PAID_TRAFFIC_ENABLED` remains `false`; no payment proof was submitted; no live facilitator verify/settle occurred; no Nano transfer occurred. Public reachability is proven, but the Pursekeeper 14-day window is not claimed as started until its client-side submission/acceptance trigger is confirmed.

## Block 020 / Task 5 — deployed proof-header review and paid-rollout plan
Branch: `task5-production-nano-payment`.

Revalidated the branch at `c242f52459bf0de32d16fa4dad415eea96be7f52` before probing the public deployment.

A one-shot public-only security workflow on temporary branch `work/public-worker-security-review` performed no Cloudflare-authenticated action and submitted no valid Nano payment proof. Actions run `36282801732`, job `108517755618`, completed successfully and proved:
- a deliberately non-payment `payment-signature` returned HTTP 503;
- `cache-control: no-store` and `x-content-type-options: nosniff` remained present;
- no `payment-response` header appeared;
- no failed-proof `payment-required` header appeared;
- no protected `analysis`, `canonicalJson`, or `sha256` appeared;
- the bounded error code was `PAYMENT_UNAVAILABLE`;
- `/health` remained HTTP 200 immediately afterward;
- a subsequent unpaid `/api/lens` request still returned HTTP 402.

The probe pinned the reviewed source and checked both the source-controlled `PAID_TRAFFIC_ENABLED = false` gate and the challenge-only `verifyAndSettle` blocker. No Cloudflare credential, payment seed/private key, facilitator verify, facilitator settle, or Nano transfer was used.

Compared deployed source commit `92aa8971e227520195b58c088a7dfdd0d00f5204` to Block 019 head `c242f52459bf0de32d16fa4dad415eea96be7f52`: the nine intervening commits changed workflow/tests/docs only and did not change `src/` runtime code. This supports the local/deployed correspondence for the challenge-only security behavior.

Reviewed the direct Pursekeeper eligibility thread. Pursekeeper explicitly instructed: send the endpoint when it is live; seller listings need no hold. The required seller checks are unpaid 402 terms, one paid call by Pursekeeper that completes and delivers the promised utility, and continued availability. Therefore the current challenge-only Worker must not yet be submitted as acceptance-ready because its required paid call is intentionally blocked.

Ruling: the project will not introduce a Nano buyer seed/private key merely to self-pay. The first controlled real payment should be Pursekeeper's own required listing call after a separately guarded payment-enabled deployment is proven and explicitly authorized.

Created implementation plan `docs/superpowers/plans/2026-09-26-paid-rollout-and-pursekeeper-submission.md`. It separates: local paid-runtime proof, guarded payment-enable deployment automation, explicit source enablement authorization, non-spending post-deploy validation, seller submission, and first paid-call reconciliation.

Seller timing ruling: do not backdate the 14-day clock to the Block 019 challenge-only deployment. Record the clock from the first Pursekeeper-confirmed listing/reachability-probe date after the paid checks pass unless Pursekeeper explicitly provides another start time.

Task 5 remains IN PROGRESS. `PAID_TRAFFIC_ENABLED` is still `false`; the endpoint has not been submitted to Pursekeeper; no live verify/settle or Nano transfer has occurred.

## Block 021 / Task 5 — paid rollout preparation, production still hard-off
Branch: `task5-production-nano-payment`.

The previously delayed Block 020 closing CI, Actions run `36283176906`, eventually completed successfully with tests, typecheck, Wrangler dry-run, dependency-tree validation and production audit all GREEN.

Task 1 ruling: the paid-rollout plan expected newly added Worker payment-mode assertions to establish RED before implementation, but `createCloudflareWorkerRuntime` already contained the `allowPaidTraffic: true` branch. The new assertions therefore passed immediately and proved existing behavior. No production behavior was changed merely to manufacture RED.

Commit `4987076673b7ab70afc54579c49236c107976f22`, Actions run `36284474392`, job `108522484660`: 92/92 tests passed. Worker-level regression coverage proves a structurally valid local Nano state-block proof reaches exactly one verify and one settle in payment-enabled mode, returns HTTP 200 with `payment-response`, and releases the promised JSON analysis only after confirmed settlement. Malformed proof returns 402 without protected output, without `payment-response`, and without settlement. Typecheck, Wrangler `4.137.0` dry-run, dependency-tree validation and production audit all passed.

Task 2 TDD RED evidence: commit `2120abfbca6b1c713157dc4694322c3e1b2e853d`, Actions run `36284519752`, job `108522615350`: 93 tests total, 92 passed, exactly one failed with `ENOENT` because `.github/workflows/cloudflare-worker-payment-enable.yml` did not yet exist.

Added a distinct guarded payment-enable workflow in commit `7714311ad89e08ba97e0be24ad193fbcdb507a0a`. It is manual-only, requires literal `ENABLE_PAID_TRAFFIC`, is restricted to `task5-production-nano-payment`, requires the real D1 UUID and `PAYMENT_DB`, uses only the separate Workers deployment credential, and refuses to deploy unless source contains `PAID_TRAFFIC_ENABLED = true as const`. Before deployment it runs tests, typecheck, Wrangler dry-run, dependency tree and production audit. After deployment it runs only non-spending health, unpaid 402 and malformed-proof checks; it contains no valid payment proof and no direct `verifyPayment` or `settlePayment` call.

Task 2 GREEN evidence: Actions run `36284707142`, job `108523139758`: 93/93 tests passed, typecheck passed, Wrangler dry-run passed, dependency tree passed, and production audit reported 0 vulnerabilities.

A temporary repository-write probe created while the connector rejected a direct workflow-file write was removed in the workflow commit. It contained no credential or operational data.

No payment-capable deployment occurred. `PAID_TRAFFIC_ENABLED` remains `false`; the currently public Worker remains challenge-only; no live facilitator verify/settle and no Nano transfer occurred.

Ruling: Task 3 is the first source-level action that can make valid external proofs reach live facilitator verification and settlement. It requires explicit operator authorization specifically to enable paid traffic and deploy. A generic continuation signal is not sufficient for this gate.

## Block 022 / Task 5 — payment-capable production deployment
Branch: `task5-production-nano-payment`.

The operator explicitly authorized enabling `PAID_TRAFFIC_ENABLED` and deploying the payment-capable Worker.

Task 3 TDD RED: commit `8ea2c2a5f216ae08b9cecb6ab77e2425f686acfa`, Actions run `36285150057`, job `108524392146`: 93 tests total, 92 passed, exactly one failed because the production entrypoint still exported `false` while the new expectation required `true`.

The minimal rollout change was then made in commit `1a34893a5fc9142645adf612af2a51601f5701bf`: only the source-controlled gate/comment in `src/worker.ts` and the matching test expectation changed. Price, payTo, facilitator, network, D1 binding, verification, settlement, replay, and delivery algorithms did not change.

GREEN source verification: Actions run `36285178793`, job `108524476873`, completed successfully with 93/93 tests, typecheck, Wrangler `4.137.0` dry-run against the real D1 binding, dependency-tree validation, and 0-vulnerability production audit. Diff review from Block 021 head `afc23b63e949125303333f3800ca630dfcdfdb7a` showed only `src/worker.ts` and `test/worker-runtime.test.ts` changed.

Because GitHub does not expose the branch-local manual workflow from the default-branch Actions UI, an isolated one-shot launcher branch `work/payment-enabled-deploy-022` was used. It pinned exact source SHA `1a34893a5fc9142645adf612af2a51601f5701bf`, rechecked the source gate and real D1 binding, reran the full verification suite, and used only the dedicated Workers deployment secret.

Deployment evidence: Actions run `36285252016`, job `108524675284`, completed `success` and deployed:
- Worker: `nano-json-lens-402`;
- URL: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`;
- Cloudflare version ID: `a6c0291a-b90e-447a-949c-8090f382837a`;
- D1 binding: real `PAYMENT_DB`.

Public non-spending checks after deployment passed:
- `/health` = HTTP 200 with the expected bounded body;
- unpaid `/api/lens` = HTTP 402 with exact / nano:mainnet / XNO, expected raw amount and payTo, and no protected output;
- malformed `payment-signature: AAAA` = HTTP 402 `PAYMENT_REJECTED`, no `payment-response`, and no protected output.

No valid payment proof was generated or submitted in this block, so no successful live facilitator verify/settle or Nano transfer is claimed. Pursekeeper's seller-listing call remains the intended first controlled valid payment.

After evidence capture, the one-shot launcher branch was reset to the reviewed source SHA, removing the launcher workflow from its branch head.

Ruling: the endpoint is now payment-capable and ready for seller submission, but listing acceptance, 10 XNO credit, and the 14-day clock must not be claimed until Pursekeeper confirms the corresponding client-side checks/event.
