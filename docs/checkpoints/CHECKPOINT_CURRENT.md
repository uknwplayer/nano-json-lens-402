# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 014 — Cloudflare Workers + D1 selected / durable payment state GREEN
**Overall state:** TASK 5 IN PROGRESS / DURABLE D1 CONTRACT GREEN / REAL CLOUDFLARE PROVISIONING PENDING / LIVE VERIFY-SETTLE NOT STARTED / MAIN UNTOUCHED

## Completed in this block
- Selected **Cloudflare Workers Free + Cloudflare D1** as the V1 runtime/state target after reviewing current official free-tier limits and Node runtime compatibility.
- Added implementation plan `docs/superpowers/plans/2026-09-26-cloudflare-d1-payment-state.md`.
- Hardened `PaymentStateStore` with atomic `confirmSettlement(operationId, receipt)`.
- TDD RED for atomic settlement: commit `77fe69b99aecd388cded72a45475be7dc0a137ca`, Actions run `36272330443`: 73 tests, 71 passed, exactly 2 new failures because `confirmSettlement` did not exist.
- Changed the Nano payment gate so confirmed settlement state and entitlement receipt are committed by one store operation instead of two separate writes.
- Added D1 migration `migrations/0001_payment_state.sql`.
- Added `createD1PaymentStateStore` in `src/payment/d1-store.ts`, advertising `productionSafe === true`.
- D1 TDD RED: commit `2181891b66b823da137b068f6bd53d5412afbe05`; the new D1 suite failed because `src/payment/d1-store.ts` did not exist while prior tests remained green.
- The D1 store uses unique payment identity and operation ID constraints, conditional SQL updates for CAS, and one conditional SQL update for `settling -> settled` plus receipt persistence.
- D1 receipts are validated again when read.
- Test harness uses Node SQLite with the same migration/statement contract and proves state + receipt persist after closing and reopening the database.
- Production composition explicitly accepts the D1 store and continues to reject `MemoryPaymentStateStore`.
- GREEN evidence: commit `7c32b52fc898713539a92861ce89dbe34485792e`, Actions run `36272741695`: **78/78 tests passed**, typecheck passed, dependency tree passed, production audit reported 0 vulnerabilities.
- Updated Security, Operations, Roadmap, and Execution Ledger for the runtime/state decision and settlement atomicity rule.

## Active payment rulings
- `requestDigest` is local service metadata, not cryptographic binding between Nano payment and submitted JSON.
- Stable replay identity is derived from validated Nano state-block material, not serialized envelope bytes.
- Facilitator verification and Nano settlement remain authoritative for payment validity/finality.
- Production requires bootstrap `ready` and `PaymentStateStore.productionSafe === true`.
- `MemoryPaymentStateStore` remains test/development only.
- D1 payment identity and operation ID uniqueness are database-enforced.
- Settlement confirmation must atomically persist both `settled` state and bounded receipt.
- Stale or ambiguous settlement writes fail closed; do not add automatic settlement write retries.
- No Nano seed/private key is stored or required.

## Deployment decision
- Runtime target: Cloudflare Workers Free.
- Persistent state target: Cloudflare D1.
- Migration: `migrations/0001_payment_state.sql`.
- Production store: `src/payment/d1-store.ts`.
- The selected free-tier limits must be rechecked immediately before deployment because provider limits can change.

## Payment parameters
- Network: `nano:mainnet`.
- Scheme: `exact`.
- `@x402nano/exact`: `0.3.0` pinned.
- `@x402/core`: `2.24.0` pinned.
- Price: `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Scope of evidence
The D1 adapter and migration have been validated locally through a SQLite-backed D1 contract harness, including close/reopen persistence. **No real Cloudflare D1 database or Worker has been provisioned or deployed yet.** No payment proof was submitted. No live verify or settle call was made. No Nano transfer occurred. The 14-day reachability window has not started.

## Exact next step
Continue Task 5 on `task5-production-nano-payment`:
1. prepare the Cloudflare Worker entrypoint and deployment configuration without enabling paid traffic;
2. provision a real free D1 database and apply `0001_payment_state.sql`;
3. bind that D1 database to the Worker and validate state write/read/CAS against the real binding;
4. deploy and test `GET /health` and an unpaid `POST /api/lens` 402 externally;
5. rerun security/CI evidence after real runtime integration;
6. only after the real D1 binding and deployed 402 are GREEN consider the first controlled live verify/settle payment test.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep work blocks approximately 15 minutes and update this checkpoint at every block closure. `main` remains untouched until isolated Task 5 work is verified and explicitly integrated. Do not claim a deployed D1 service or Pursekeeper paid-call acceptance from local D1 contract tests.
