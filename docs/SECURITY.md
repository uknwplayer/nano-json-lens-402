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
The Cloudflare Worker integration adds an additional deployment-stage barrier:
- `PAID_TRAFFIC_ENABLED` is a source-controlled `false` constant in `src/worker.ts`;
- environment variables or account configuration cannot enable paid traffic in this stage;
- challenge-only mode delegates unpaid challenge generation but rejects proof processing before the concrete resource server can call facilitator `verify` or `settle`;
- the paid route requires HTTPS;
- the paid route requires a D1 binding that exposes the expected statement API;
- a missing or invalid binding fails closed with 503 before x402 bootstrap;
- `GET /health` remains independent of D1 and facilitator readiness so payment infrastructure outages do not masquerade as process death;
- the production resource URL is derived from the incoming origin plus the fixed `/api/lens` path, not arbitrary client-provided URL data.

Changing `PAID_TRAFFIC_ENABLED` is a future security-sensitive source change. It must not occur until the real D1 database, migration, remote binding behavior, deployed health endpoint, deployed unpaid 402 response, and a fresh security/CI review are all independently GREEN.

## Cloudflare Provisioning Credentials
Cloudflare account credentials are outside the source-of-truth repository and outside ChatGPT conversation data.

The D1 provisioning path uses two GitHub Actions secrets:
- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_D1_API_TOKEN`.

Security rules:
- never paste either secret value into chat, source files, issues, commits, workflow inputs, or logs;
- keep the D1 token scoped to the intended Cloudflare account and only D1 write/edit permissions required for create/list/migration/query operations;
- do not reuse a global API key;
- do not broaden the D1-only token merely to deploy the Worker; use a separate least-privilege Workers authorization path if deployment requires additional permission;
- the workflow maps `CLOUDFLARE_D1_API_TOKEN` to Wrangler's `CLOUDFLARE_API_TOKEN` only inside remote D1 steps;
- the permanent provisioning workflow is manual-only, branch-guarded, and does not deploy the Worker or invoke Pursekeeper payment verify/settle;
- because GitHub does not surface a branch-only manual workflow from the default Actions UI, the initial real provisioning used a one-shot push-triggered launcher on an isolated temporary branch;
- that launcher pinned the reviewed target branch SHA before remote mutation, checked the target again before pushing, and contained no Cloudflare credential values;
- the one-shot launcher never ran on `main` and was removed from the temporary branch heads after success;
- remote D1 probe data is synthetic, contains no client document/payment data, and is removed after validation;
- provisioning refuses to silently replace one already-real D1 UUID with another.

The D1 database UUID is a public configuration identifier, not a secret. It was committed only after the workflow resolved it from the intended Cloudflare account and completed migration + remote non-payment validation successfully.

## Real D1 Evidence
Actions run `36280708030` established direct remote evidence for:
- creation of `nano-json-lens-402-payment-state`;
- public database ID `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`;
- application of `0001_payment_state.sql`;
- successful remote query of `payment_operations`;
- synthetic insert/read/CAS/read/delete behavior;
- stale CAS exclusion (`unverified -> settling` made zero changes after the successful `unverified -> verified` transition).

This evidence proves the remote D1 state backend behavior used by the project. It does not prove Worker deployment or payment acceptance.

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

Local SQLite tests and the remote D1 synthetic probe now provide complementary evidence: local tests cover the complete adapter/state contract including close/reopen persistence and receipt confirmation, while the remote probe confirms the production D1 service accepts the expected SQL write/read/CAS/delete pattern. Neither alone authorizes live payment-taking traffic.

## Availability
The health endpoint must be inexpensive and independent of heavy processing. The 14-day requirement makes deployment and configuration failures operationally important.

## Dependencies
Before release:
- pin versions appropriately;
- review critical transitive dependencies;
- run tests;
- avoid unnecessary dependencies.

The production Task 5 CI validates the complete locked dependency tree, audits production dependencies, and dry-runs the pinned Wrangler Worker bundle.

## Data Handling
Treat the service as a transient processor: receive JSON, calculate the response, and discard the submitted content unless a future design explicitly changes this rule.
