# Nano JSON Lens 402 — Payment Safety Architecture Specification

**Date:** 2026-09-26  
**Status:** design approved; implementation pending  
**Scope:** production payment safety, request binding, replay defense, idempotency, settlement recovery, durable state, and acceptance testing.

## 1. Intent and security objective

Nano JSON Lens 402 sells deterministic JSON analysis through a Nano HTTP 402 payment gate. Security must protect both parties: a payer must not obtain additional paid service by bypass/replay, and a legitimate payer must not be charged twice because of retries, timeouts, crashes, or ambiguous settlement.

The service therefore fails closed. Useful paid output is released only after settlement is confirmed. Ambiguity is never interpreted as payment success or payment failure without reconciliation.

## 2. State machine

The normal progression is:

`unverified -> verified -> settling -> settled -> fulfilled`

A settlement request whose outcome is unknown transitions to `settlement_unknown`, not to `fulfilled` and not automatically back to `verified`.

Allowed recovery paths include:

- `settlement_unknown -> settled -> fulfilled` after confirmation;
- `settlement_unknown -> verified -> settling` only after authoritative confirmation that the prior settlement did not occur.

A confirmed `settled` operation represents a customer entitlement. An internal failure between `settled` and `fulfilled` must be recoverable without requiring another payment.

## 3. Request identity

The server derives a deterministic `requestId` describing exactly what is being purchased. Its security context covers at least:

- protocol/domain version;
- HTTP method;
- protected route;
- canonical payload digest;
- expected price;
- Nano network;
- receiving address (`payTo`).

Conceptually:

`requestId = SHA-256(encode(domain, method, route, canonicalPayloadHash, price, network, payTo))`

`encode` MUST be unambiguous. Raw delimiter-free string concatenation is prohibited. The implementation must use a canonical structured encoding or explicit length-prefixing and test collision-by-serialization edge cases.

The existing raw-body SHA-256 is useful transport metadata but is not, by itself, the production payment binding.

## 4. Payment identity and operation identity

Use the strongest stable payment/transaction identifier exposed by the selected Nano/x402 protocol as `paymentIdentity`. A digest of payment evidence may be retained as a secondary non-secret identifier but must not replace a stronger protocol/on-chain identity without justification.

The server derives:

`operationId = SHA-256(encode(operation-domain, requestId, paymentIdentity))`

Security authority comes from server-derived identifiers. A client-supplied correlation ID may be logged safely for diagnostics but must not control replay or settlement decisions.

Two conceptual uniqueness relationships must be enforced atomically:

- `paymentIdentity -> requestId`
- `operationId -> state`

Consequences:

- same payment + different request: reject as replay/misuse;
- same payment + same request: idempotent retry/recovery;
- different payment + same request: independent valid purchase.

## 5. Concurrency and replay defense

Only one execution may acquire a given payment/operation identity for settlement. Simultaneous copies must not produce multiple settlements or multiple paid executions.

Replay protection MUST survive process restart, deployment, and multiple runtime instances. In-memory-only replay state is prohibited for production.

The persistence mechanism must provide an atomic create-if-absent, compare-and-set, transaction, or equivalent serialization primitive sufficient to guarantee the state transitions above.

## 6. Settlement ambiguity and reconciliation

The dangerous case is `verified -> settling -> timeout/connection loss`.

Rules:

1. Do not release the paid result.
2. Do not blindly call settlement again.
3. Do not ask the payer to pay again while the original outcome remains unresolved.
4. Persist `settlement_unknown` with the original identifiers.
5. Reconcile the original attempt using authoritative facilitator/protocol information.

If the facilitator confirms settlement, transition to `settled`. If it authoritatively confirms no settlement occurred, the same operation may become eligible for a controlled retry. If the chosen facilitator/protocol cannot support safe reconciliation, production launch remains blocked until a safe policy is proven.

## 7. Durable minimal state

Persist only what payment safety requires. Candidate fields:

- `operationId`;
- `requestId`;
- `paymentIdentity` and/or non-secret proof digest;
- state;
- settlement reference/status required for reconciliation;
- created/updated timestamps;
- expiry/retention metadata;
- result digest, and a bounded cached result only when necessary for idempotent delivery.

Do not retain customer JSON merely for replay protection. Never persist wallet seeds, private keys, reusable secrets, or credentials.

Retention periods must be selected from actual Nano/x402 replay and reconciliation characteristics, not arbitrary convenience. In particular, unresolved `settlement_unknown` records must not be silently deleted while payment may have occurred.

## 8. Hosting/state architecture candidate

Cloudflare Workers remains the preferred evaluation runtime, not an approved production runtime. A Cloudflare Durable Object is the preferred state-coordination candidate because a single logical object can serialize operations for an identity and maintain durable replay state.

Proposed separation:

- Worker/HTTP layer: request limits, parsing, JSON Lens execution, protocol surface;
- Durable Object/state authority: payment identity ownership, state transitions, concurrency, replay, idempotency, settlement recovery.

This architecture is conditional on all of the following being demonstrated:

- `@x402nano/exact` compatibility with the runtime;
- required Durable Object capability fitting the intended free/low-cost operating model;
- acceptable CPU/resource budget;
- correct atomic behavior under concurrency and restart.

If these conditions fail, select another durable atomic store/runtime. Do not weaken replay protection to fit a hosting provider.

## 9. Customer entitlement and retries

A legitimate identical retry after connection failure should recover the already-authorized operation rather than initiate another purchase.

Once settlement is confirmed, the customer retains entitlement to that operation even if the service fails before delivering the response. Recovery must either return the already-computed bounded result or deterministically recompute it under the same `requestId` without a second charge.

A modified protected request cannot inherit that entitlement.

## 10. Required threat tests

Production acceptance must include at least:

| Scenario | Required outcome |
| --- | --- |
| No payment | 402; no useful paid output |
| Invalid proof | Reject |
| Valid settled payment | Exactly one authorized operation |
| Same proof/payment + different JSON | Reject |
| Same payment + changed price/route/terms | Reject |
| Concurrent copies of same payment | At most one settlement owner |
| Identical retry after settlement | Recover idempotently; no second charge |
| Timeout before settlement request | No output; safe retry policy |
| Timeout during settlement | `settlement_unknown`; no automatic second settlement |
| Settlement confirmed then connection lost | Customer entitlement survives |
| Runtime restart/deploy | Replay remains blocked |
| Payload changed after binding | Reject |
| Oversized/malformed payment header | Safe rejection |
| Facilitator unavailable | Fail closed |
| Facilitator malformed/unexpected response | Fail closed |
| Oversized/deep JSON | Reject before expensive/payment work |
| Multiple runtime instances | Atomicity preserved |
| Internal failure after `settled` | Retry fulfills without new payment |

## 11. Test layers

### Unit
Test canonical identity encoding, request/operation derivation, state transition rules, replay decisions, and error classification.

### Integration with fake facilitator
Inject successful settlement, rejection, delays, connection loss before/after facilitator receipt, malformed responses, ambiguous outcomes, recovery, concurrent requests, and restart/reload behavior. No real funds are used.

### Controlled public acceptance
Only after unit/integration/security gates pass:

1. deploy public HTTPS endpoint;
2. verify free `/health`;
3. verify an unpaid `/api/lens` request returns the correct Nano/mainnet 402 challenge;
4. allow Pursekeeper to perform the first intended real paid call;
5. record sanitized evidence and start availability tracking only after actual acceptance.

Do not use real Nano funds for destructive fault-injection tests.

## 12. Absolute production blockers

Do not deploy for paid production if any of these remain true:

- paid output can be released from an ambiguous/unsettled state;
- one payment can authorize different protected requests;
- concurrent copies can trigger duplicate settlement/fulfillment;
- replay protection disappears after restart/deploy;
- retry can blindly trigger a second charge;
- confirmed customer entitlement can be lost after an internal failure;
- settlement ambiguity cannot be reconciled safely;
- production replay state exists only in memory;
- secrets/private keys are required in repository code.

## 13. Open implementation decisions

Before production, implementation must resolve with evidence:

1. exact canonical byte encoding for identity hashes;
2. exact `paymentIdentity` available from `@x402nano/exact` / Pursekeeper facilitator;
3. facilitator reconciliation/status semantics for ambiguous settlement;
4. durable store/runtime and atomic primitive;
5. retention durations derived from protocol behavior;
6. whether bounded result caching is needed or deterministic recomputation is sufficient;
7. public Nano receiving address and final price.

## 14. Design approval record

The operator explicitly required security for both seller and customer, with no bypass path and no opportunity to exploit retries/payment ambiguity. The fail-closed, request-bound, replay-resistant, idempotent architecture above was reviewed section-by-section in the working conversation and approved for formal specification.
