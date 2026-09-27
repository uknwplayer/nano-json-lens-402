# Security

## Principles
- Never store a Nano seed or private key.
- Never commit deployment or facilitator credentials.
- The Nano receiving address is public and may be configured separately.
- Validate payloads before processing.
- Enforce size and depth limits.
- Never execute client-submitted code.
- Do not fetch client-provided URLs in V1.
- Do not use `eval`.
- Avoid persisting submitted documents.
- Sanitize logs.

## Payment Gate
The paid result must not be delivered before successful payment verification. Payment failures must be explicit and must never silently fall back to free access.

Production composition is stricter than the generic test/development gate:
- the production payment bootstrap must already be in `ready` state;
- a `PaymentStateStore` must be present and must explicitly advertise `productionSafe === true`;
- `MemoryPaymentStateStore` is never acceptable for payment-taking production traffic because its replay and settlement state disappears on process restart or redeploy;
- a cold, initializing, or failed bootstrap must not construct a payment-ready production gate;
- supported-capability synchronization and 402 challenge generation do not constitute payment finality.

`requestDigest` remains local service metadata used to detect request/payment mismatches. It must not be described as cryptographic binding between the Nano block and submitted JSON. Nano settlement remains authoritative for actual payment finality; the local state store is a mandatory production defense for replay, idempotency, concurrency, entitlement recovery, and settlement uncertainty.

## Worker Rollout Gate
The deployed Cloudflare Worker has now crossed the explicit source-level rollout gate:
- `PAID_TRAFFIC_ENABLED` is a source-controlled `true` constant in `src/worker.ts`;
- environment variables or account configuration cannot independently change the rollout state;
- the protected route requires HTTPS;
- the protected route requires the real D1 binding with the expected statement API;
- a missing or invalid binding fails closed with 503 before x402 bootstrap;
- malformed or structurally invalid proofs are rejected before settlement and before protected output can be released;
- `GET /health` remains independent of D1 and facilitator readiness;
- the production resource URL is derived from the incoming origin plus fixed `/api/lens`, not arbitrary client-provided URL data.

This source-level enablement was authorized explicitly by the operator in Block 022 after local paid-runtime proof, guarded deployment-path proof, fresh full CI, and public challenge-only security review were all GREEN.

## Cloudflare Credentials
Cloudflare credentials stay outside repository content and ChatGPT conversation data.

D1 provisioning uses:
- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_D1_API_TOKEN`.

Worker deployment uses a separate token:
- `CLOUDFLARE_WORKERS_API_TOKEN`.

Security rules:
- never paste secret values into chat, source files, issues, commits, workflow inputs, artifacts, or logs;
- keep the D1 token scoped to the intended account and D1 write/edit operations;
- keep the Workers token scoped to the intended account and Workers Scripts Edit operations;
- do not reuse a global API key;
- do not broaden the D1-only token for Worker deployment;
- do not grant Workers Admin unless a documented operation actually requires it;
- Workers Scripts Edit has been sufficient for both challenge-only and payment-capable deployment;
- the permanent provisioning and deployment workflows are manual-only and branch-guarded;
- one-shot launcher workflows are permitted only on isolated temporary branches with a pinned reviewed target SHA and must be removed from branch heads after evidence capture.

The D1 database UUID and workers.dev endpoint are public configuration identifiers, not secrets.

## Real D1 Evidence
Actions run `36280708030` established direct remote evidence for:
- creation of `nano-json-lens-402-payment-state`;
- public database ID `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`;
- application of `0001_payment_state.sql`;
- successful remote query of `payment_operations`;
- synthetic insert/read/CAS/read/delete behavior;
- stale CAS exclusion (`unverified -> settling` made zero changes after the successful `unverified -> verified` transition).

## Public Worker Evidence
Challenge-only deployment evidence:
- Actions run `36281960914`, job `108515377275`;
- Worker `nano-json-lens-402`;
- endpoint `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`;
- challenge-only Cloudflare version ID `36286ef2-2068-4c6c-a735-4d20f6e9b5ae`;
- real `PAYMENT_DB` binding present.

The first immediate health request after the initial deployment returned Cloudflare error 1042. No runtime relaxation was added. Diagnostic run `36282060561` observed the exact unchanged Worker returning HTTP 200 shortly afterward. Independent public-only run `36282142586` then passed both health 200 and the expected unpaid Nano 402 challenge.

Ruling: treat initial post-deploy reachability as a bounded readiness/propagation problem unless persistent evidence demonstrates an application defect. Deployment automation waits for health within a bounded readiness window and still fails closed if readiness is not achieved.

## Deployed Challenge-Only Proof-Header Review
Block 020 added a public-only security probe against the then-challenge-only Worker without Cloudflare credentials and without a valid Nano payment proof.

Actions run `36282801732`, job `108517755618`, confirmed that a request carrying a deliberately non-payment `payment-signature`:
- returned HTTP 503 fail-closed while paid traffic was still disabled;
- returned `cache-control: no-store` and `x-content-type-options: nosniff`;
- exposed no `payment-response` header;
- exposed no protected `analysis`, `canonicalJson`, or `sha256` output.

The same run confirmed `/health` remained HTTP 200 and a subsequent unpaid `/api/lens` request still returned HTTP 402. No real payment proof or Nano transfer was used.

## Paid-Rollout Security Ruling
Do not self-pay merely to create a live test if doing so would require introducing a buyer seed/private key into GitHub, repository content, CI logs, or ChatGPT conversation data.

The controlled rollout plan is `docs/superpowers/plans/2026-09-26-paid-rollout-and-pursekeeper-submission.md`. It requires:
- local proof of the `allowPaidTraffic: true` runtime path;
- a separate guarded payment-enable deployment workflow;
- explicit operator authorization before source-level enablement;
- post-deploy health, unpaid 402, and malformed-proof checks without spending Nano;
- submission to Pursekeeper only after the Worker is genuinely payment-capable;
- Pursekeeper's own first paid listing call as the first controlled real payment;
- reconciliation before any retry after an ambiguous settlement outcome.

## Paid-Enable Guard Evidence
Block 021 completed the two prerequisites immediately before source-level payment enablement.

Local runtime evidence: Actions run `36284474392`, job `108522484660`, passed 92/92 tests and proves that payment-enabled mode releases protected output only after one confirmed local verify/settle sequence. Malformed proof remains non-settling and non-leaking.

Dedicated workflow evidence: Actions run `36284707142`, job `108523139758`, passed 93/93 tests plus typecheck, Wrangler dry-run, dependency-tree validation and production audit. `.github/workflows/cloudflare-worker-payment-enable.yml`:
- is manual-only and branch-guarded;
- requires literal `ENABLE_PAID_TRAFFIC` confirmation;
- requires source-level `PAID_TRAFFIC_ENABLED = true as const` before deployment;
- validates the real D1 binding;
- uses only the separate Workers deployment token;
- reruns the complete verification suite before deployment;
- generates no valid payment proof in CI;
- performs only health, unpaid 402, and malformed-proof checks after deployment;
- contains no direct `verifyPayment` or `settlePayment` call.

## Payment-Capable Deployment Evidence
Block 022 crossed the source-level rollout gate only after explicit operator authorization.

TDD RED evidence: commit `8ea2c2a5f216ae08b9cecb6ab77e2425f686acfa`, Actions run `36285150057`, job `108524392146`, failed only because production still exported `PAID_TRAFFIC_ENABLED = false` while the new test expected `true`.

Reviewed paid source commit `1a34893a5fc9142645adf612af2a51601f5701bf` changed only the rollout constant/comment in `src/worker.ts` and the matching test expectation. Actions run `36285178793`, job `108524476873`, passed 93/93 tests, typecheck, Wrangler dry-run, dependency tree, and audit.

Deployment run `36285252016`, job `108524675284`, pinned that exact source SHA and deployed Cloudflare version `a6c0291a-b90e-447a-949c-8090f382837a` to:

`https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`

Post-deploy non-spending security checks passed:
- `/health` = HTTP 200;
- unpaid `/api/lens` = HTTP 402 with expected exact Nano mainnet terms and no protected output;
- malformed `payment-signature: AAAA` = HTTP 402 `PAYMENT_REJECTED`, no `payment-response`, and no protected output.

No valid payment proof was generated or submitted in Block 022. Therefore the deployment proves payment-capable configuration and malformed-proof safety, not yet successful live facilitator verification or settlement.

## Vendor SDK Boundary
The concrete `@x402/core` resource server is isolated behind `src/payment/production-resource-server.ts` rather than leaking vendor protocol types through the generic payment core.

The production boundary validates/converts:
- local `PaymentResourceConfig` to the pinned SDK `ResourceConfig`;
- local `PaymentResourceInfo` to the pinned SDK `ResourceInfo`;
- local payment requirements to the SDK requirement structure, including positive timeout and required `extra` normalization;
- untrusted decoded proof material into the SDK `PaymentPayload` shape before verify/settle calls;
- facilitator responses back into the bounded local contract.

This boundary exists so SDK upgrades cannot silently broaden the trusted input surface of the payment core. Any x402 dependency version change must rerun typecheck, full tests, audit, and Wrangler bundle validation.

## Persistent Replay and Settlement State
The V1 production target is Cloudflare D1. The D1 adapter must preserve these invariants:
- `payment_identity` is unique and cannot be rebound to another request digest;
- `operation_id` is unique;
- claims use a uniqueness constraint plus a read-back decision, never a check-then-insert race;
- state transitions use conditional `UPDATE ... WHERE state = ?` compare-and-set semantics;
- confirmed settlement must transition `settling -> settled` and store the bounded receipt in **one database statement**;
- a stale settlement confirmation must fail closed and must not write a receipt;
- stored receipts are validated again when read;
- database errors and ambiguous write outcomes propagate as failures; the project does not add automatic write retries around settlement confirmation.

The atomic `confirmSettlement` store contract exists specifically to remove the prior crash gap in which `settled` could have been persisted before its entitlement receipt. The generic legacy receipt-write method remains for compatibility/local use but is not used by the production payment settlement path.

Local SQLite tests and the remote D1 synthetic probe provide complementary evidence: local tests cover the full adapter/state contract including close/reopen persistence and receipt confirmation, while the remote probe confirms production D1 accepts the expected SQL write/read/CAS/delete pattern.

## Availability
The health endpoint must be inexpensive and independent of heavy processing. The public endpoint is now payment-capable and reachable.

For the seller-credit timing, do not backdate the Pursekeeper 14-day clock to either the challenge-only deployment or the Block 022 payment-capable deployment. Record the start from the first Pursekeeper-confirmed listing/reachability-probe date after the paid listing checks pass, unless Pursekeeper explicitly states a different start time.

## Dependencies
Before release:
- pin versions appropriately;
- review critical transitive dependencies;
- run tests;
- avoid unnecessary dependencies.

The production Task 5 CI validates the complete locked dependency tree, audits production dependencies, and dry-runs the pinned Wrangler Worker bundle.

## Data Handling
Treat the service as a transient processor: receive JSON, calculate the response, and discard the submitted content unless a future design explicitly changes this rule.
