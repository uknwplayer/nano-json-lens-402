# Cloudflare D1 Payment State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the production payment gate durable across Worker restarts/redeploys using Cloudflare Workers Free + D1, without permitting a live payment until durable state and settlement receipt recording are fail-closed.

**Architecture:** Run the Fetch service on Cloudflare Workers and bind one D1 database as the authoritative payment-operation store. Use a unique payment identity row plus operation-id uniqueness, atomic conditional SQL updates for state transitions, and one atomic settlement-confirmation update that records the receipt together with the `settled` transition. Keep D1 behind the existing `PaymentStateStore` interface so the payment gate remains portable.

**Tech Stack:** TypeScript, Node 24 test runner, Cloudflare Workers runtime, Cloudflare D1/SQLite, `@x402/core` 2.24.0, `@x402nano/exact` 0.3.0.

**Spec:** `docs/specs/V1_TECHNICAL_SPEC.md`

## Global Constraints
- Repository artifacts and code are English; operator conversation is Portuguese.
- Zero-cost runtime/state option only.
- No Nano seed/private key is stored or required.
- No real verify/settle/payment during this plan.
- Production payment composition must fail closed if durable state is unavailable.
- `main` remains untouched.
- Every block closes with checkpoint/roadmap/ledger updates.

## Review Focus
- Two concurrent claims for one payment identity must produce one owner and one idempotent existing result, never two owners.
- The same payment identity must never bind to two request digests.
- CAS must reject stale state transitions.
- Settlement confirmation must persist state and receipt atomically, eliminating a crash gap between `settled` and receipt persistence.
- A newly constructed store client over the same database must recover state and confirmed receipt.

---

### Task 1: Atomic settlement contract

**Files:**
- Modify: `src/payment/store.ts`
- Modify: `src/payment/memory-store.ts`
- Modify: `src/payment.ts`
- Test: `test/payment-store.test.ts`
- Test: `test/payment.test.ts`

**Interfaces:**
- Consumes: existing payment states and `SettlementReceipt`.
- Produces: `confirmSettlement(operationId, receipt): Promise<boolean>` on `PaymentStateStore`.

- [ ] **Step 1:** Add failing tests proving settlement confirmation changes `settling -> settled` and stores the receipt as one store operation, while stale states fail.
- [ ] **Step 2:** Run the full suite and verify the new tests fail for the missing method/behavior.
- [ ] **Step 3:** Implement the method in the memory store and change `createNanoPaymentGate` to use it instead of separate state-CAS + receipt-save writes.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`; both must pass.
- [ ] **Step 5:** Commit.

### Task 2: D1 production PaymentStateStore

**Files:**
- Create: `src/payment/d1-store.ts`
- Create: `migrations/0001_payment_state.sql`
- Create: `test/d1-payment-store.test.ts`
- Create: `test/support/sqlite-d1.ts`

**Interfaces:**
- Consumes: `PaymentStateStore`, `PaymentState`, `SettlementReceipt`.
- Produces: `createD1PaymentStateStore(database): PaymentStateStore` with `productionSafe === true`.

- [ ] **Step 1:** Add failing contract tests for claim ownership/idempotency/conflict, CAS, atomic settlement confirmation, receipt recovery, and reconstruction against the same SQLite database.
- [ ] **Step 2:** Run the suite and verify RED because the D1 store does not exist.
- [ ] **Step 3:** Implement the migration and minimal structural D1 binding adapter using prepared statements and conditional updates; do not add automatic write retries.
- [ ] **Step 4:** Run `npm test`, `npm run typecheck`, `npm ls --all`, and production audit.
- [ ] **Step 5:** Commit.

### Task 3: Production composition evidence and continuity

**Files:**
- Modify: `docs/SECURITY.md`
- Modify: `docs/OPERATIONS.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/EXECUTION_LEDGER.md`
- Modify: `docs/checkpoints/CHECKPOINT_CURRENT.md`
- Create: `docs/checkpoints/history/2026-09-26_014.md`

**Interfaces:**
- Consumes: production-safe D1 store and existing `createProductionNanoPaymentGate`.
- Produces: documented Cloudflare Workers + D1 deployment decision and next deployment boundary.

- [ ] **Step 1:** Verify a D1-backed store is accepted by production composition while memory store remains rejected.
- [ ] **Step 2:** Run the complete CI suite on the final code/doc HEAD.
- [ ] **Step 3:** Record the zero-cost runtime/state decision, free-tier limits, fail-closed behavior, and remaining deployment/account provisioning work.
- [ ] **Step 4:** Stop before deployment or any real verify/settle/payment.
