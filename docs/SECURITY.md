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
- supported-capability synchronization and 402 challenge generation do not constitute permission to perform live `verify` or `settle` without a production-safe persistent state store.

`requestDigest` remains local service metadata used to detect request/payment mismatches. It must not be described as cryptographic binding between the Nano block and submitted JSON. Nano settlement remains authoritative for actual payment finality; the local state store is a mandatory production defense for replay, idempotency, concurrency, entitlement recovery, and settlement uncertainty.

## Worker Rollout Gate
The deployed Cloudflare Worker retains an explicit source-level payment barrier:
- `PAID_TRAFFIC_ENABLED` is a source-controlled `false` constant in `src/worker.ts`;
- environment variables or account configuration cannot enable paid traffic in this stage;
- challenge-only mode delegates unpaid challenge generation but rejects proof processing before the concrete resource server can call facilitator `verify` or `settle`;
- the protected route requires HTTPS;
- the protected route requires the real D1 binding with the expected statement API;
- a missing or invalid binding fails closed with 503 before x402 bootstrap;
- `GET /health` remains independent of D1 and facilitator readiness;
- the production resource URL is derived from the incoming origin plus fixed `/api/lens`, not arbitrary client-provided URL data.

Changing `PAID_TRAFFIC_ENABLED` is a future security-sensitive source change. It must not occur until the deployed challenge-only proof path, live payment test plan, reconciliation behavior, fresh security review, and explicit operator authorization are all independently GREEN.

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
- the initial challenge-only deployment proved Workers Scripts Edit was sufficient, so no Admin escalation was needed;
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
- Cloudflare version ID `36286ef2-2068-4c6c-a735-4d20f6e9b5ae`;
- real `PAYMENT_DB` binding present.

The first immediate health request after deployment returned Cloudflare error 1042. No runtime relaxation was added. Diagnostic run `36282060561` observed the exact unchanged Worker returning HTTP 200 shortly afterward. Independent public-only run `36282142586` then passed both health 200 and the expected unpaid Nano 402 challenge.

Ruling: treat initial post-deploy reachability as a bounded readiness/propagation problem unless persistent evidence demonstrates an application defect. The permanent deploy workflow therefore waits for health with a bounded 24-attempt / 5-second interval policy and still fails closed if readiness is not achieved. Do not enable broad fetch compatibility flags merely to suppress a transient deployment observation.

No payment proof was submitted in the public deployment verification. No live facilitator `verify` or `settle` occurred and no Nano transfer occurred.

## Vendor SDK Boundary
The concrete `@x402/core` resource server is isolated behind `src/payment/production-resource-server.ts` rather than leaking vendor protocol types through the generic payment core.

The production boundary validates/converts:
- local `PaymentResourceConfig` to the pinned SDK `ResourceConfig`;
- local `PaymentResourceInfo` to the pinned SDK `ResourceInfo`;
- local payment requirements to the SDK requirement structure, including positive timeout and required `extra` normalization`;
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

Local SQLite tests and the remote D1 synthetic probe provide complementary evidence: local tests cover the full adapter/state contract including close/reopen persistence and receipt confirmation, while the remote probe confirms production D1 accepts the expected SQL write/read/CAS/delete pattern. Neither alone authorizes live payment-taking traffic.

## Availability
The health endpoint must be inexpensive and independent of heavy processing. Public deployment is now live, but the Pursekeeper 14-day window must not be claimed as started until the applicable client submission/acceptance condition is confirmed.

## Dependencies
Before release:
- pin versions appropriately;
- review critical transitive dependencies;
- run tests;
- avoid unnecessary dependencies.

The production Task 5 CI validates the complete locked dependency tree, audits production dependencies, and dry-runs the pinned Wrangler Worker bundle.

## Data Handling
Treat the service as a transient processor: receive JSON, calculate the response, and discard the submitted content unless a future design explicitly changes this rule.
