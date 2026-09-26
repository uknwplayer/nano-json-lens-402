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

Local D1 contract tests use Node's SQLite implementation to exercise the same SQL schema and statement behavior, including closing and reopening the database. This is evidence for SQL/state semantics, not proof that a remote Cloudflare D1 database has already been provisioned or deployed.

## Availability
The health endpoint must be inexpensive and independent of heavy processing. The 14-day requirement makes deployment and configuration failures operationally important.

## Dependencies
Before release:
- pin versions appropriately;
- review critical transitive dependencies;
- run tests;
- avoid unnecessary dependencies.

The production Task 5 CI additionally validates the complete locked dependency tree and audits production dependencies.

## Data Handling
Treat the service as a transient processor: receive JSON, calculate the response, and discard the submitted content unless a future design explicitly changes this rule.
