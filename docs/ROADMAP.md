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

Blocks 004 and 011–021 established protocol discovery, pinned package integration, fail-closed bootstrap, durable real D1 state, challenge-only Worker runtime and deployment, public security review, local payment-enabled runtime evidence, and a guarded payment-enable deployment path. Production paid traffic remains source-disabled pending explicit operator authorization.

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
- [x] Provision the real Cloudflare D1 database `nano-json-lens-402-payment-state`.
- [x] Apply remote migration `0001_payment_state.sql`.
- [x] Validate synthetic write/read/CAS/delete against the real remote D1 database.
- [x] Add a guarded challenge-only Worker deployment workflow with dedicated Workers credential separation and public 200/402 post-deploy probes.
- [x] Deploy the challenge-only Worker with the real D1 binding.
- [x] Independently verify the live unpaid exact Nano 402 challenge without submitting a proof.
- [x] Perform deployed proof-bearing fail-closed review while paid traffic remains disabled.
- [x] Confirm no Worker runtime/source drift occurred after the deployed version; post-deploy changes through Block 019 were docs/workflow/test only.
- [x] Prove the payment-enabled Worker runtime locally without changing the production entrypoint.
- [x] Add a separate guarded payment-enable deployment workflow.
- [ ] Enable payment-taking startup only after explicit operator authorization and fresh full CI.

Block 020 externally submitted a deliberately non-payment `payment-signature` to the deployed challenge-only Worker. Public-only Actions run `36282801732`, job `108517755618`, confirmed HTTP 503 fail-closed, no `payment-response`, no protected analysis, health 200 afterward, and a subsequent unpaid request still returning 402. No Cloudflare credential and no real Nano proof were used.

Block 021 added local payment-enabled Worker regression evidence without changing the production rollout constant. Actions run `36284474392`, job `108522484660`, passed 92/92 tests and proved exactly one verify/settle plus protected delivery only after confirmed settlement for a structurally valid local proof; malformed proof remained non-settling and non-leaking. Task 2 then established RED at run `36284519752` because the dedicated paid-deploy workflow did not exist, and GREEN at run `36284707142`, job `108523139758`, with 93/93 tests after adding the manual `ENABLE_PAID_TRAFFIC` workflow. No payment-capable deployment occurred.

## Phase 4 — Public Service
- [x] Local Fetch HTTP handler and 12 integration tests.
- [x] Add Cloudflare Worker runtime/entrypoint and D1 binding contract.
- [x] Add Wrangler configuration.
- [x] Prove the current Worker bundle with `wrangler deploy --dry-run`.
- [x] Add guarded remote D1 provisioning/migration automation.
- [x] Provision/apply the real remote D1 migration.
- [x] Validate the real D1 database before deployment.
- [x] Add guarded challenge-only Worker deployment automation and external validation contract.
- [x] Create separate least-privilege Workers deployment authorization in GitHub Actions Secrets.
- [x] Deploy challenge-only Worker.
- [x] `POST /api/lens` live in challenge-only mode.
- [x] `GET /health` live.
- [x] HTTPS deployment externally verified.
- [x] External unpaid 402 test against the deployed endpoint.
- [x] Deployed proof-bearing fail-closed/security review.
- [ ] Final paid-mode logging/security review before payment enablement.

## Phase 5 — Pursekeeper: 10 XNO
- [x] Confirm endpoint submission sequence and acceptance terms against direct Pursekeeper evidence.
- [x] Confirm seller listings need no hold and the endpoint should be sent only when live/payment-capable.
- [x] Confirm the first real paid listing call is expected to be made by Pursekeeper.
- [x] Complete local paid-mode proof and guarded paid deployment path.
- [ ] Explicitly authorize and deploy payment-capable Worker.
- [ ] Submit endpoint to Pursekeeper.
- [ ] Pursekeeper confirms 402 challenge.
- [ ] First paid call delivers a real result.
- [ ] Confirm listing/online state.
- [ ] Record evidence of 10 XNO prepaid-call credit.

## Phase 6 — 14-Day Window / +15 XNO
- [x] Establish conservative clock rule: do not backdate to challenge-only deployment; start from first Pursekeeper-confirmed listing/reachability-probe date unless explicitly told otherwise.
- [ ] Payment-taking code remains public.
- [ ] Endpoint remains reachable.
- [ ] Record start of window from confirmed client criteria.
- [ ] Track incidents.
- [ ] Confirm 14-day completion.
- [ ] Record second tranche.

## Phase 7 — Post-validation
- [ ] V1 tag/release.
- [ ] Final report.
- [ ] Evaluate additional consumers and extensions without unnecessary risk expansion.
