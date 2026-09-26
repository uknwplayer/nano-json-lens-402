# Roadmap

## Operating Rule
**Every work block ends by updating `docs/checkpoints/CHECKPOINT_CURRENT.md`.**  
When a material milestone is reached, also create a historical snapshot under `docs/checkpoints/history/`.

## Phase 0 — Documentation Foundation
- [x] Create public repository.
- [x] Initial README.
- [x] Initial whitepaper.
- [x] Initial architecture.
- [x] Document Pursekeeper criteria.
- [x] Continuity rules.
- [x] Initial security and operations documents.
- [x] Current checkpoint.
- [x] Establish English as the official project language.
- [x] Approve technical specification before implementation.

## Phase 1 — Specification
- [ ] Freeze V1 HTTP contract.
- [x] Confirm Nano x402 library/protocol.
- [x] Confirm facilitator.
- [x] Retrieve/confirm operator public Nano address.
- [x] Freeze initial price.
- [ ] Select runtime/deployment.
- [x] Define payload limits and error schema.
- [x] Produce testable implementation plan.
- [x] Operator approved direct execution of the plan.
- [x] Inspect official Nano x402 package and confirm npm 0.3.0 metadata.
- [x] Read live facilitator /supported for exact / nano:mainnet.
- [x] Pin production x402 dependency versions and integrity lock.

Block 004 established protocol/facilitator discovery. Block 011 pinned `@x402nano/exact` 0.3.0 with `@x402/core` 2.24.0 and validated the real resource-server construction API. Task 1 remains partial because runtime selection, bootstrap initialization, deployment compatibility, and final live integration evidence are still pending.

## Phase 2 — JSON Lens Core
- [x] Strict UTF-8 request parser and envelope validation.
- [x] Duplicate-key, byte, depth and node limit tests (14 tests).
- [x] Deterministic canonicalization.
- [x] SHA-256.
- [x] Structural metrics.
- [x] Path/type map.
- [x] Before/after diff.
- [x] Unit tests and edge cases.

## Phase 3 — Nano 402
- [ ] Unpaid request returns correct production 402 challenge.
- [ ] Include production network, price, and payTo through initialized pinned adapter.
- [x] Decode and structurally validate local payment proof envelope.
- [ ] Verify payment through initialized pinned real x402 adapter.
- [ ] Settle payment through initialized pinned real x402 adapter.
- [x] Deliver protected result only after a successful gate outcome in local HTTP integration tests.
- [x] Local concurrency, replay, idempotency and settlement-uncertainty tests.
- [x] Stable replay identity derived from Nano state-block material rather than serialized proof bytes.
- [x] Pin `@x402nano/exact` 0.3.0 and compatible `@x402/core` dependency tree.
- [x] Construct and test the production `resourceServer` adapter offline.
- [ ] Add and test explicit facilitator initialization/bootstrap boundary.
- [ ] Validate initialized production challenge against controlled Pursekeeper capability synchronization.

Blocks 008–010 established and hardened the local PaymentGate. Block 011 moved the project onto the pinned real x402 packages and validated production resource-server construction. The current suite is 65/65 GREEN with typecheck, dependency-tree validation, and production dependency audit GREEN. This does **not** yet prove live payment compatibility: `resourceServer.initialize()` has not been executed against Pursekeeper in Block 011, and no real verify/settle operation has occurred.

## Phase 4 — Public Service
- [x] Local Fetch HTTP handler and 12 integration tests.
- [ ] Runtime bootstrap/adapter and real payment gate.
- [ ] `POST /api/lens` live.
- [ ] `GET /health` live.
- [ ] HTTPS deployment.
- [ ] External 402 test.
- [ ] Logging/security review.

## Phase 5 — Pursekeeper: 10 XNO
- [ ] Submit endpoint to Pursekeeper.
- [ ] Pursekeeper confirms 402 challenge.
- [ ] First paid call delivers a real result.
- [ ] Confirm listing/online state.
- [ ] Record evidence of credit/prepayment.

## Phase 6 — 14-Day Window / +15 XNO
- [ ] Payment-taking code remains public.
- [ ] Endpoint remains reachable.
- [ ] Record start of window.
- [ ] Track incidents.
- [ ] Confirm 14-day completion.
- [ ] Record second tranche.

## Phase 7 — Post-validation
- [ ] V1 tag/release.
- [ ] Final report.
- [ ] Evaluate additional consumers and extensions without unnecessary risk expansion.
