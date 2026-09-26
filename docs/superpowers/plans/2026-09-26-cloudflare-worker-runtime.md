# Cloudflare Worker Runtime Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cloudflare Workers production entrypoint that uses the durable D1 payment state store, serves the existing Fetch handler, and remains challenge-only until a later explicit paid-traffic enablement change.

**Architecture:** Keep the existing HTTP handler, x402 bootstrap, production gate, and D1 store unchanged as reusable components. Add a thin Worker runtime adapter that lazily initializes the production payment bootstrap, constructs a D1-backed production gate per request, derives the protected resource URL from the incoming HTTPS origin, and wraps the gate so live verify/settle is unreachable while this rollout block is challenge-only. Add a Wrangler configuration with an intentionally non-deployable placeholder D1 UUID until the real database is provisioned.

**Tech Stack:** TypeScript, Cloudflare Workers Fetch runtime, Cloudflare D1, Wrangler 4.137.0, Node 24 CI, existing `@x402/core` 2.24.0 and `@x402nano/exact` 0.3.0.

**Spec:** `docs/checkpoints/CHECKPOINT_CURRENT.md`

## Global Constraints
- Repository artifacts are English.
- `main` remains untouched.
- No payment proof, live verify, live settle, Nano transfer, or Pursekeeper paid-call test in this block.
- Production paid traffic stays disabled by code, not merely by operator convention.
- Production state must use `PaymentStateStore.productionSafe === true`; memory state remains forbidden.
- No Nano seed/private key is required or stored.
- The Worker must fail closed if bootstrap initialization or required runtime bindings are unavailable.
- Cloudflare compatibility date: `2026-09-26`.
- Wrangler validation uses exact version `4.137.0`.

## Review Focus
- Concurrent cold-start requests must share the existing bootstrap initialization rather than trigger multiple facilitator capability synchronizations.
- A request carrying `payment-signature` while paid traffic is disabled must never reach `verifyPayment` or `settlePayment`.
- Missing D1 binding must fail closed without serving a misleading payment-ready challenge.
- Production resource URLs must be HTTPS and normalized to `/api/lens` without carrying attacker-controlled query or fragment data.
- A Wrangler dry-run must bundle the actual Worker entrypoint with the D1 binding declaration.

---

### Task 1: Worker runtime adapter

**Files:**
- Create: `test/worker-runtime.test.ts`
- Create: `src/worker-runtime.ts`

**Interfaces:**
- Consumes: `PaymentBootstrap`, `createD1PaymentStateStore`, `createProductionNanoPaymentGate`, and `createHandler`.
- Produces: `createCloudflareWorkerRuntime(options)` with a `fetch(request, env)` method and `CloudflareWorkerEnv` containing `PAYMENT_DB`.

- [x] **Step 1: Write failing tests** for lazy bootstrap initialization, unpaid 402 generation, missing D1 fail-closed behavior, HTTPS resource normalization, and proof rejection without verify/settle while paid traffic is disabled.
- [x] **Step 2: Run CI and verify RED** because `src/worker-runtime.ts` does not exist.
- [x] **Step 3: Implement the minimal runtime adapter** with `allowPaidTraffic: false` required by the production caller.
- [x] **Step 4: Run the full suite and typecheck; require GREEN.**
- [x] **Step 5: Commit runtime implementation.**

### Task 2: Production Worker entrypoint

**Files:**
- Create: `src/worker.ts`
- Modify: `test/worker-runtime.test.ts`

**Interfaces:**
- Consumes: `createProductionNanoPaymentBootstrap` and `createCloudflareWorkerRuntime`.
- Produces: the default Cloudflare Worker module export.

- [x] **Step 1: Add a failing import/contract test** proving the exported Worker exposes `fetch` and the production composition is hard-coded challenge-only.
- [x] **Step 2: Verify RED.**
- [x] **Step 3: Implement the entrypoint** with fixed facilitator, payTo, and price parameters already approved by project checkpoints and `allowPaidTraffic: false`.
- [x] **Step 4: Run full tests/typecheck and require GREEN.**
- [x] **Step 5: Commit entrypoint.**

### Task 3: Wrangler configuration and bundle validation

**Files:**
- Create: `wrangler.jsonc`
- Modify: `.github/workflows/task5-ci.yml`
- Modify: `docs/OPERATIONS.md`

**Interfaces:**
- Consumes: `src/worker.ts` and `migrations/0001_payment_state.sql`.
- Produces: deploy configuration for Workers + D1, deliberately blocked from real deployment by a zero UUID placeholder until provisioning.

- [x] **Step 1: Add `wrangler.jsonc`** with `name`, `main`, `compatibility_date`, `workers_dev`, D1 binding `PAYMENT_DB`, database name, placeholder UUID, and `migrations_dir`.
- [x] **Step 2: Add exact `npx --yes wrangler@4.137.0 deploy --dry-run` CI validation.**
- [x] **Step 3: Run CI and require bundle dry-run GREEN without Cloudflare credentials.**
- [x] **Step 4: Document the explicit provisioning commands and the requirement to replace the placeholder UUID before deployment.**
- [x] **Step 5: Commit configuration/operations changes.**

### Task 4: Block closure

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/EXECUTION_LEDGER.md`
- Modify: `docs/checkpoints/CHECKPOINT_CURRENT.md`
- Create: `docs/checkpoints/history/2026-09-26_015.md`

- [x] **Step 1: Record RED/GREEN CI evidence and runtime security rulings.**
- [x] **Step 2: Mark Worker adapter/configuration complete but real D1 provisioning/deployment pending.**
- [ ] **Step 3: Run final HEAD CI and require tests, typecheck, dependency checks, audit, and Wrangler dry-run GREEN.**
- [ ] **Step 4: Archive checkpoint 015.**
