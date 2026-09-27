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

### Implemented V1 security model
The payment flow is fail-closed and strongly idempotent around settlement. A paid result may be released only from a confirmed `settled` state.

Implemented state progression:

`unverified -> verified -> settling -> settled -> fulfilled`

The durable payment store also records terminal `settle_failed` and ambiguous `settlement_unknown` states. An ambiguous timeout or facilitator failure does not transition to `fulfilled` and is never automatically settled again.

### Request binding
Each protected call derives a deterministic request identifier from security-relevant request context:

`requestId = SHA-256(JSON([domain, method, resourceUrl, requestDigest, priceRaw, network, payTo]))`

The frozen domain is `nano-json-lens/payment-request/v1` and the method is `POST`. The JSON array is encoded as UTF-8 and avoids ambiguous delimiter concatenation.

The binding covers:
- protocol/version domain separator;
- HTTP method;
- protected resource URL;
- exact request-body SHA-256 digest;
- expected raw-unit price;
- Nano network;
- receiving address.

Changing protected content or payment terms therefore produces a different server request identity.

### Payment identity and replay defense
The payment identity is the Nano state-block hash derived with `nano-sdk`. The operation identity is a separate SHA-256 domain-separated hash of `requestId` and `paymentIdentity`.

A durable atomic store owns the first verified redemption of a `paymentIdentity`. The same identity may recover a previously settled receipt for the same `requestId`, but it is rejected for a different `requestId`. Simultaneous copies of one proof cannot both acquire settlement ownership.

Important protocol boundary: the V1 `extra.requestId` field is x402 payment-requirement metadata checked by this server. It is not embedded in or cryptographically signed by the Nano state block. Consequently V1 provides a **single-redemption bearer entitlement**: after facilitator verification, the first atomic claim binds that Nano payment identity to one protected request. The implementation must not claim that the Nano signature pre-commits the payer to the JSON request itself.

### Durable state
V1 uses a SQLite payment-state database with:
- unique `paymentIdentity`;
- unique `operationId`;
- `requestId`;
- settlement state;
- confirmed settlement receipt when available;
- update timestamp.

Submitted JSON is not stored in the payment database.

The SQLite implementation is suitable only where every serving process uses the **same durable database file**. A single service instance on one persistent volume is acceptable. Horizontally scaled replicas with independent disks are prohibited because they would not share atomic replay state; that topology requires a shared transactional store before launch.

V1 performs no automatic pruning of payment identities. Replay metadata should remain for at least the full public service lifetime so an old payment cannot become redeemable again merely because a row expired. The database contains payment metadata, not submitted documents or wallet secrets.

## Settlement ambiguity
If the facilitator may have received a settlement request but the server did not receive a definitive response, the operation becomes `settlement_unknown`. The service grants no protected result and does not blindly call settlement again.

Production launch remains blocked until the selected facilitator has a documented reconciliation/status mechanism or the operator explicitly accepts a manual recovery procedure for ambiguous settlements. Fake-facilitator integration tests are protocol evidence only and are not evidence of a real Nano payment.

## Availability
The health endpoint must be inexpensive and independent of heavy processing. The 14-day requirement makes deployment and configuration failures operationally important.

## Dependencies
The V1 payment path pins `@x402/core`, `@x402nano/exact`, `nano-sdk`, TypeScript and parser versions in the lockfile. CI runs the complete test suite, type checking and whitespace verification. Critical dependency changes require the same verification before release.

## Data Handling
Treat the service as a transient processor: receive JSON, calculate the response, and discard the submitted content. Persist only the minimal payment/replay metadata described above. Never log submitted JSON, payment proofs, wallet seeds, private keys or recovery phrases.
