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
- Protect both the seller and the payer: bypass must fail closed, while retries must not create accidental duplicate charges.

## Payment Gate
The paid result must not be delivered before successful payment verification and settlement. Payment failures or ambiguous settlement states must be explicit and must never silently fall back to free access.

### Approved V1 security model
The payment flow uses a fail-closed, strongly idempotent state model. A paid result may be released only from a confirmed `settled` state.

Planned state progression:

`unverified -> verified -> settling -> settled -> fulfilled`

An ambiguous timeout or facilitator failure does not transition to `fulfilled`. It enters recovery/reconciliation and must not automatically request or initiate another charge until the existing payment state is resolved.

### Request binding
Each protected call must derive a deterministic request fingerprint from security-relevant request context. The design target is equivalent to:

`requestId = SHA-256(version || method || route || canonicalPayloadHash || price || network || payTo)`

The exact byte serialization must be frozen before implementation; ambiguous string concatenation is not acceptable. Length-prefixing or a canonical structured encoding should be used so distinct field tuples cannot collide through serialization ambiguity.

The binding must cover at least:
- protocol/version domain separator;
- HTTP method;
- protected route;
- canonical payload digest;
- expected price;
- Nano network;
- receiving address.

Changing protected content or payment terms must therefore produce a different request identity.

### Payment binding and replay defense
A payment proof/transaction identity must be associated with the intended request identity. The server must reject attempts to reuse one payment authorization for a different protected request.

Concurrency must be atomic: only one execution may acquire a request/payment identity for settlement or fulfillment. Simultaneous copies of the same proof must not produce multiple paid executions.

A completed request must remain idempotent for a bounded retention period. A byte/semantically identical legitimate retry after a connection failure should recover the already-authorized state/result where safe, rather than demand a second payment. A modified request using the same payment evidence is a replay and must be rejected.

### Minimal retained security state
Do not retain the customer's submitted JSON merely to implement replay protection. Retain only the minimum needed for payment safety, such as:
- request identifier;
- non-secret payment/proof identifier or digest;
- payment state;
- settlement reference/status required for reconciliation;
- timestamps/expiry;
- bounded cached result or result digest only if required for safe idempotent retry.

Retention duration and storage backend remain open design items and must be fixed before production deployment.

## Settlement ambiguity
If the facilitator may have received a settlement request but the server did not receive a definitive response, treat the state as unknown. Do not grant unpaid access and do not blindly settle or charge again. Reconcile the existing attempt first using protocol-supported identifiers/status mechanisms. If the selected Nano facilitator cannot support safe reconciliation, the limitation must be explicitly handled in the production design before launch.

## Availability
The health endpoint must be inexpensive and independent of heavy processing. The 14-day requirement makes deployment and configuration failures operationally important.

## Dependencies
Before release:
- pin versions appropriately;
- review critical transitive dependencies;
- run tests;
- avoid unnecessary dependencies.

## Data Handling
Treat the service as a transient processor: receive JSON, calculate the response, and discard the submitted content unless a future design explicitly changes this rule. Payment/replay metadata must follow the minimal-retention rule above.
