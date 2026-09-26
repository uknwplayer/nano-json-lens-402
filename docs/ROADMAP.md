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
- [ ] Confirm Nano x402 library/protocol.
- [ ] Confirm facilitator.
- [ ] Retrieve/confirm operator public Nano address.
- [ ] Freeze initial price.
- [ ] Select runtime/deployment.
- [ ] Define payload limits and error schema.
- [x] Produce testable implementation plan.
- [x] Operator approved direct execution of the plan.
- [x] Inspect official Nano x402 package and confirm npm 0.3.0 metadata.
- [x] Read live facilitator /supported for exact / nano:mainnet.

Block 004 evidence: [protocol validation](protocol/NANO_402_WIRE_EXAMPLES.md). Task 1 remains partial: address, runtime compatibility, exact dependency lock and recovery behavior are pending. Package discovery is not a passing payment integration test.

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
- [ ] Unpaid request returns correct 402 challenge.
- [ ] Include network, price, and payTo.
- [ ] Decode payment proof.
- [ ] Verify payment.
- [ ] Settle payment.
- [ ] Deliver result only after success.
- [ ] Failure/replay tests where supported by protocol.

## Phase 4 — Public Service
- [x] Local Fetch HTTP handler and 12 integration tests.
- [ ] Runtime bootstrap/adapter and real payment gate.
- [ ] `POST /api/lens`.
- [ ] `GET /health`.
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
