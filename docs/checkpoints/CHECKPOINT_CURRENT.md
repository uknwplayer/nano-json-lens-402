# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 016 — guarded Cloudflare D1 provisioning automation GREEN / remote authentication pending
**Overall state:** TASK 5 IN PROGRESS / PROVISIONING AUTOMATION GREEN / REAL D1 PROVISIONING WAITING ON OPERATOR AUTH / WORKER NOT DEPLOYED / LIVE VERIFY-SETTLE NOT STARTED / MAIN UNTOUCHED

## Completed in this block
- Confirmed that no Cloudflare account connector is available in this ChatGPT session and that the connected GitHub app does not expose repository Actions secrets.
- Ruling: Cloudflare credentials must never be pasted into chat, source files, workflow inputs, issues, commits, or logs. The remote step must use GitHub Actions Secrets.
- Added implementation plan `docs/superpowers/plans/2026-09-26-cloudflare-d1-provisioning.md`.
- Added `test/cloudflare-provisioning.test.ts` before implementation.
- TDD RED evidence: commit `690bfd18e1aca4cbf196828210d820c722b16a72`, Actions run `36275355302`, job `108496925525`: 85 tests total, 84 passed, exactly one failed with `ERR_MODULE_NOT_FOUND` because `scripts/cloudflare/d1-config.ts` did not exist.
- Added `scripts/cloudflare/d1-config.ts` using `jsonc-parser` so the provisioning workflow can preserve comments while changing only the expected D1 UUID.
- The helper requires exactly one `PAYMENT_DB` / `nano-json-lens-402-payment-state` pair, accepts only a valid non-placeholder UUID, permits zero-placeholder -> real UUID and same-ID idempotency, and refuses rebinding one real UUID to another.
- GREEN evidence after helper + plan: commit `7c488b260b1693e7b79b31953baf30d85b0a8b57`, Actions run `36275413118`, job `108497080943`: tests, typecheck, Wrangler dry-run, dependency-tree validation, and production audit passed.
- Added manual workflow `.github/workflows/cloudflare-d1-provision.yml`.
- The workflow runs only by `workflow_dispatch`, requires literal `PROVISION_D1`, and refuses execution outside `task5-production-nano-payment`.
- Required GitHub Actions secrets are `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_API_TOKEN`.
- The workflow verifies `PAID_TRAFFIC_ENABLED === false` before remote mutation.
- It uses exact Wrangler `4.137.0`, reuses exactly one intended D1 database by name if present, otherwise creates it, validates its UUID, and updates only the expected D1 binding through the tested helper.
- It lists/applies the committed remote migration, validates the `payment_operations` table, and performs a synthetic non-payment write/read/CAS/read/delete probe.
- Synthetic probe cleanup is attempted on failure and success paths.
- The workflow refuses to replace a different already-real D1 UUID and refuses to push its public UUID commit if the branch moved during execution.
- The workflow does not deploy the Worker and does not call Pursekeeper verify/settle.
- Workflow implementation commit `b1f62ec48ba6c2927182b70fbe64ebc6228271ed` passed normal Task 5 CI in Actions run `36275520755`.
- Added `test/cloudflare-provision-workflow.test.ts` to lock manual-only, explicit-confirmation, isolated-branch, dedicated-secret, challenge-only, migration, remote-probe, and no-deploy guardrails.
- Updated Operations, Security, Roadmap, provisioning plan, and historical checkpoint `docs/checkpoints/history/2026-09-26_016.md`.
- The cumulative `docs/EXECUTION_LEDGER.md` currently remains through Block 015; checkpoint 016 is the authoritative Block 016 execution record until that cumulative document is appended/compacted in a later documentation-only maintenance pass.

## Active payment and rollout rulings
- `requestDigest` is local service metadata, not cryptographic binding between Nano payment and submitted JSON.
- Stable replay identity is derived from validated Nano state-block material, not serialized envelope bytes.
- Facilitator verification and Nano settlement remain authoritative for payment validity/finality.
- Production requires bootstrap `ready` and `PaymentStateStore.productionSafe === true`.
- `MemoryPaymentStateStore` remains test/development only.
- D1 payment identity and operation ID uniqueness are database-enforced.
- Settlement confirmation must atomically persist both `settled` state and bounded receipt.
- Stale or ambiguous settlement writes fail closed; do not add automatic settlement write retries.
- `PAID_TRAFFIC_ENABLED` remains source-controlled `false`; no environment setting can bypass this rollout gate.
- Provisioning automation must not deploy the Worker or invoke payment verify/settle.
- Cloudflare credentials live only in GitHub Actions Secrets; do not copy them into chat or repository content.
- Prefer a dedicated least-privilege D1 token for the intended Cloudflare account.
- A real D1 UUID may be committed because it is a public configuration identifier, but only after migration + remote synthetic state validation succeeds.
- No Nano seed/private key is stored or required.

## Deployment target and configuration
- Runtime target: Cloudflare Workers Free.
- Persistent state target: Cloudflare D1.
- Worker entrypoint: `src/worker.ts`.
- Runtime adapter: `src/worker-runtime.ts`.
- Migration: `migrations/0001_payment_state.sql`.
- Production store: `src/payment/d1-store.ts`.
- Wrangler config: `wrangler.jsonc`.
- D1 binding: `PAYMENT_DB`.
- D1 database name: `nano-json-lens-402-payment-state`.
- Provisioning workflow: `.github/workflows/cloudflare-d1-provision.yml`.
- Wrangler version: `4.137.0`.
- Compatibility date: `2026-09-26`.

## Payment parameters
- Network: `nano:mainnet`.
- Scheme: `exact`.
- `@x402nano/exact`: `0.3.0` pinned.
- `@x402/core`: `2.24.0` pinned.
- Price: `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Required operator action — do not paste secret values into ChatGPT
1. In the intended Cloudflare account, identify the **Account ID**.
2. Create a dedicated least-privilege Cloudflare API token that can perform the D1 create/list/migration/query operations needed by this provisioning workflow for that account.
3. In GitHub repository settings, create two **Actions repository secrets**:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_D1_API_TOKEN`
4. Go to **Actions → Provision Cloudflare D1 → Run workflow**.
5. Select branch `task5-production-nano-payment`.
6. Enter confirmation `PROVISION_D1` and run it.
7. Return to the assistant with `Feito`, `Próximo`, or the workflow result. The assistant should inspect the run directly through GitHub before accepting any remote state claim.

## Scope of evidence / explicit non-claims
The provisioning workflow and its guardrails have been implemented and normal CI has passed on the workflow implementation commit. **At this checkpoint no successful manual Cloudflare provisioning run has been observed.** Therefore:
- no real Cloudflare D1 database is claimed as created;
- no real D1 UUID is claimed as committed;
- no remote migration is claimed as applied;
- no remote synthetic D1 probe is claimed as passed;
- no Worker has been deployed;
- no payment proof has reached the facilitator;
- no live verify or settle call was made;
- no Nano transfer occurred;
- the Pursekeeper 14-day reachability window has not started.

## Exact next step after operator authentication
1. inspect the manual `Provision Cloudflare D1` Actions run;
2. verify database creation/reuse evidence and the committed UUID;
3. verify migration + synthetic write/read/CAS cleanup evidence;
4. run fresh full Task 5 CI on the resulting branch head;
5. only after those checks are GREEN prepare a separate challenge-only Worker deployment block;
6. keep `PAID_TRAFFIC_ENABLED === false` during deployment and external health/402 validation.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep work blocks approximately 15 minutes and update this checkpoint at every block closure. `main` remains untouched until isolated Task 5 work is verified and explicitly integrated. Do not claim a remote D1, deployed Worker, Pursekeeper paid-call acceptance, or start of the 14-day window from provisioning automation alone.
