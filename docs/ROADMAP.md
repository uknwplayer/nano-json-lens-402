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
- [x] Select runtime/deployment target: Cloudflare Workers Free + D1.
- [x] Define payload limits and error schema.
- [x] Produce testable implementation plan.
- [x] Operator approved direct execution of the plan.
- [x] Inspect official Nano x402 package and confirm npm 0.3.0 metadata.
- [x] Read live facilitator /supported for exact / nano:mainnet.
- [x] Pin production x402 dependency versions and integrity lock.
- [x] Confirm the pinned production bootstrap can synchronize live Pursekeeper capabilities read-only.

Blocks 004 and 011–016 established protocol discovery, pinned package integration, fail-closed bootstrap, the real unpaid 402 path, D1 persistence architecture, a challenge-only Cloudflare Worker bundle, and guarded remote D1 provisioning automation. Cloudflare account-side provisioning remains pending until operator authentication/secrets are supplied and the manual workflow succeeds.

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
- [x] Isolate the concrete x402 SDK behind a validated production adapter boundary.
- [x] Add and test explicit fail-closed facilitator initialization/bootstrap boundary.
- [x] Validate live read-only Pursekeeper supported synchronization through the pinned production bootstrap.
- [x] Wire only a ready production bootstrap into the production Nano `PaymentGate` composition.
- [x] Reject non-production replay state from production gate composition.
- [x] Generate and inspect the actual initialized production HTTP 402 challenge without submitting payment.
- [x] Select persistent state backend compatible with the free deployment target: Cloudflare D1.
- [x] Add atomic settlement-confirmation contract so state and receipt are not split across writes.
- [x] Implement and test a `productionSafe` D1 `PaymentStateStore`.
- [x] Prove SQL replay/settlement state and receipt survive closing/reopening the test database.
- [x] Prove production composition accepts the D1 store while continuing to reject memory state.
- [x] Add the challenge-only Cloudflare Worker runtime around ready bootstrap + D1 composition.
- [x] Hard-disable paid traffic in source while preserving unpaid production 402 challenge generation.
- [x] Add a manual, branch-guarded, idempotent remote D1 provisioning/migration workflow.
- [x] Add tested protection against silently rebinding an already-real D1 UUID.
- [ ] Provision/reuse the real Cloudflare D1 database and apply migration `0001_payment_state.sql` via the guarded workflow.
- [ ] Validate synthetic write/read/CAS against the real remote D1 database.
- [ ] Enable payment-taking startup only after deployed state/runtime prerequisites are independently GREEN.

Block 014 selected Cloudflare Workers Free + D1 and implemented the durable store/migration. Block 015 added the Worker runtime/entrypoint, hard-disabled paid traffic, and proved the bundle with Wrangler 4.137.0 dry-run. Block 016 added a tested JSONC finalizer and a manual provisioning workflow that requires GitHub-held Cloudflare credentials, explicit `PROVISION_D1` confirmation, exact branch isolation, migration application, a synthetic remote state probe, cleanup, and branch-movement protection before committing the public D1 UUID. Remote provisioning itself is not complete until that workflow is successfully dispatched with valid account credentials. Live `verify`/`settle` have still not been called.

## Phase 4 — Public Service
- [x] Local Fetch HTTP handler and 12 integration tests.
- [x] Add Cloudflare Worker runtime/entrypoint and D1 binding contract.
- [x] Add Wrangler configuration with an intentionally non-production placeholder D1 ID.
- [x] Prove the current Worker bundle with `wrangler deploy --dry-run`.
- [x] Add guarded remote D1 provisioning/migration automation.
- [ ] Provision/apply the real remote D1 migration.
- [ ] Validate the real D1 database before deployment.
- [ ] Deploy challenge-only Worker.
- [ ] `POST /api/lens` live.
- [ ] `GET /health` live.
- [ ] HTTPS deployment externally verified.
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
