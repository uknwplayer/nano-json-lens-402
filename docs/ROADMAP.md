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
- [x] Confirm the pinned production bootstrap can synchronize live Pursekeeper capabilities read-only.

Block 004 established protocol/facilitator discovery. Block 011 pinned `@x402nano/exact` 0.3.0 with `@x402/core` 2.24.0 and validated the real resource-server construction API. Block 012 added a fail-closed initialization boundary and successfully synchronized the real Pursekeeper supported capabilities. Block 013 proved the actual initialized HTTP 402 challenge path. Task 1 remains partial because runtime/deployment and persistent production state storage are still pending.

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
- [x] Unpaid request returns correct production 402 challenge.
- [x] Include production network, price, and payTo through initialized pinned adapter.
- [x] Decode and structurally validate local payment proof envelope.
- [ ] Verify payment through initialized pinned real x402 adapter.
- [ ] Settle payment through initialized pinned real x402 adapter.
- [x] Deliver protected result only after a successful gate outcome in local HTTP integration tests.
- [x] Local concurrency, replay, idempotency and settlement-uncertainty tests.
- [x] Stable replay identity derived from Nano state-block material rather than serialized proof bytes.
- [x] Pin `@x402nano/exact` 0.3.0 and compatible `@x402/core` dependency tree.
- [x] Construct and test the production `resourceServer` adapter offline.
- [x] Add and test explicit fail-closed facilitator initialization/bootstrap boundary.
- [x] Validate live read-only Pursekeeper supported synchronization through the pinned production bootstrap.
- [x] Wire only a ready production bootstrap into the production Nano `PaymentGate` composition.
- [x] Reject non-production replay state from production gate composition.
- [x] Generate and inspect the actual initialized production HTTP 402 challenge without submitting payment.
- [ ] Select a persistent state backend compatible with the final free deployment runtime.
- [ ] Implement and test a truly `productionSafe` persistent `PaymentStateStore`.
- [ ] Prove replay/settlement state survives process restart or redeploy according to the selected backend guarantees.
- [ ] Wire that persistent store into the payment-taking production startup path.

Blocks 008–010 established and hardened the local PaymentGate. Block 011 moved the project onto the pinned real x402 packages. Block 012 added the bootstrap state machine and proved live read-only capability synchronization against Pursekeeper. Block 013 added a strict production composition boundary and proved a real initialized `POST /api/lens` request returns the expected 402 challenge: x402 v2, `exact`, `nano:mainnet`, `XNO`, `0.01 XNO`, expected payTo, matching request digest metadata, and matching `payment-required` header/body. The local suite is 71/71 GREEN with typecheck, dependency-tree validation, and production dependency audit GREEN. Live `verify` and `settle` have still not been called. Payment-taking production traffic remains blocked until persistent replay/settlement state exists.

## Phase 4 — Public Service
- [x] Local Fetch HTTP handler and 12 integration tests.
- [ ] Runtime bootstrap/adapter and real payment gate with persistent production state.
- [ ] `POST /api/lens` live.
- [ ] `GET /health` live.
- [ ] HTTPS deployment.
- [ ] External 402 test against the deployed endpoint.
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
