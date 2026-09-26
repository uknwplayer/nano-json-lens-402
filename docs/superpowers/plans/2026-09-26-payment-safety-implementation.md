# Payment Safety Implementation Plan

> **Execution note:** Follow the repository's approved payment-safety specification and TDD. No real funds, public deployment, or main-branch merge is part of this plan.

**Goal:** Replace the current minimal PaymentGate contract with a request-bound, replay-resistant, idempotent payment orchestration layer, then validate the real Nano x402 adapter against a fake facilitator before any public deployment.

**Spec:** `docs/superpowers/specs/2026-09-26-payment-safety-design.md`

**Architecture:** Keep the Fetch `Request`/`Response` HTTP handler. Add pure identity/state modules first, then a durable-store interface with an in-memory test implementation, then payment orchestration, then the Nano adapter. Production durable storage remains a deployment gate; the in-memory implementation is test-only/local and MUST NOT be presented as production replay protection.

**Tech stack:** TypeScript, Node >=24, `node:test`, `@x402nano/exact` 0.3.0 candidate, `@x402/core` compatible version, fake HTTP facilitator for integration tests.

---

## Global constraints

- English only in repository artifacts and code.
- Fail closed: useful output only after confirmed settlement.
- Never blindly re-settle an ambiguous operation.
- Never store customer JSON merely for replay defense.
- No wallet seed/private key in repository or runtime design.
- No real Nano payments in tests.
- Every work block closes by updating roadmap, decisions, execution ledger, current checkpoint, and a historical checkpoint when material.

## Task 1 — Canonical security identities

**Files:**
- Create: `src/payment/identity.ts`
- Create: `test/payment-identity.test.ts`

**RED:** tests must prove deterministic length-prefixed/canonical encoding; field-boundary ambiguity cannot collide; method/route/payload hash/price/network/payTo changes alter `requestId`; payment identity changes alter `operationId`.

**GREEN:** implement only the canonical encoder, `deriveRequestId`, `deriveOperationId`, and proof digest helper required by tests using SHA-256.

**Verify:** targeted test, then full `npm test` and `npm run check`.

## Task 2 — Payment state machine

**Files:**
- Create: `src/payment/state.ts`
- Create: `test/payment-state.test.ts`

**RED:** test legal transitions `unverified -> verified -> settling -> settled -> fulfilled`; ambiguous settlement enters `settlement_unknown`; illegal skips fail; `settlement_unknown` cannot become fulfilled directly; settled entitlement survives delivery failure.

**GREEN:** implement explicit state union and transition validator. No network/storage logic.

**Verify:** targeted test + full suite/check.

## Task 3 — Durable-store contract and atomic ownership semantics

**Files:**
- Create: `src/payment/store.ts`
- Create: `src/payment/memory-store.ts`
- Create: `test/payment-store.test.ts`

**RED:** tests cover atomic paymentIdentity ownership, same payment/same request idempotency, same payment/different request rejection, operation compare-and-set, and simulated restart limitation of the memory implementation.

**GREEN:** define `PaymentStateStore`; implement `MemoryPaymentStateStore` for tests/local only. Mark it explicitly unsafe for production durability.

**Verify:** targeted test + full suite/check.

## Task 4 — Payment orchestration and replay/idempotency policy

**Files:**
- Create: `src/payment/orchestrator.ts`
- Create: `test/payment-orchestrator.test.ts`
- Modify: `src/server.ts`
- Modify: `test/server.test.ts`

**RED:** cover no proof -> challenge; invalid proof -> no useful output; same payment/different payload -> reject; simultaneous same payment -> one settlement owner; settled identical retry -> no second settlement; timeout during settlement -> `settlement_unknown`; `settlement_unknown` -> no automatic retry; failure after settled preserves entitlement.

**GREEN:** introduce an orchestration boundary around verification/settlement. Server computes canonical request identity after strict parse and before payment orchestration. Useful result remains buffered until settled.

**Ruling:** if the existing `PaymentGate` interface conflicts with the approved spec, replace it rather than preserve an unsafe compatibility layer. Tests are the migration boundary.

**Verify:** targeted tests + full suite/check.

## Task 5 — Nano x402 adapter against fake facilitator

**Files:**
- Create: `src/payment/nano-exact-adapter.ts`
- Create: `test/nano-exact-adapter.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example` only if public non-secret configuration names change.

**RED:** fake facilitator tests must validate `/verify` and `/settle` request shapes, successful settlement receipt mapping, verify rejection, settle rejection, malformed response, network error, and timeout/unknown classification. Assert no real Pursekeeper URL is contacted.

**GREEN:** install/pin the required Nano/x402 packages and implement the smallest adapter compatible with the upstream 0.3.0 candidate. Treat facilitator HTTP uncertainty as `settlement_unknown`, never as success and never as automatic retry.

**Important discovery gate:** inspect the actual adapter/facilitator response fields to determine the strongest stable `paymentIdentity`. If the protocol exposes no safe identity or no way to reconcile ambiguous settlement, record a production blocker; do not invent semantics.

**Verify:** adapter tests + full suite/check.

## Task 6 — Threat matrix regression suite

**Files:**
- Create: `test/payment-threats.test.ts`
- Modify implementation only when a new failing test exposes a gap.

Turn the specification's threat table into executable regressions: replay after state reload abstraction, concurrent copies, modified terms, malformed/oversized header, facilitator unavailable/malformed, failure after settlement, and ambiguous settlement behavior.

Production durability itself is not claimed until a real durable backend passes the same store contract.

**Verify:** full `npm test` + `npm run check`.

## Task 7 — Documentation and checkpoint closure

**Files:**
- Modify: `docs/SECURITY.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/EXECUTION_LEDGER.md`
- Modify: `docs/checkpoints/CHECKPOINT_CURRENT.md`
- Create: next `docs/checkpoints/history/2026-09-26_NNN.md`

Record exactly what is implemented versus still blocked. In particular, distinguish fake-facilitator validation from real Pursekeeper payment acceptance and distinguish the memory test store from production durable replay protection.

**Final verification:** run full suite and type check from the implementation branch. Record exact counts/results in checkpoint and ledger.

## Completion contract

This plan is complete only when Tasks 1–7 are implemented with RED->GREEN evidence, full tests/check pass, documentation is synchronized, and unresolved production blockers are explicit. It does **not** authorize public deployment, real payment testing, secret configuration, or merge to `main`.
