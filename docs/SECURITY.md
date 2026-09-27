# Security

## Principles
- Never store a Nano seed or private key.
- Never commit deployment or facilitator credentials.
- The Nano receiving address is public configuration.
- Validate and bound all payloads before payment processing.
- Never execute client-submitted code.
- Do not fetch client-provided URLs in V1.
- Do not use `eval`.
- Avoid persisting submitted documents.
- Sanitize logs.
- Protected output must never be delivered before confirmed settlement.

## Payment Gate
Production composition is stricter than generic test/development composition:
- production payment bootstrap must already be `ready`;
- a `PaymentStateStore` must be present and advertise `productionSafe === true`;
- `MemoryPaymentStateStore` is forbidden for payment-taking production traffic;
- cold, initializing, or failed bootstrap state must fail closed;
- malformed or structurally invalid proofs must be rejected before settlement and before protected output;
- unknown verify/settle transport state must fail closed;
- ambiguous settlement must never be automatically re-settled.

`requestDigest` remains service-local metadata for request/payment mismatch detection. It is not a cryptographic binding between the Nano block and submitted JSON. Nano settlement is authoritative for payment finality; durable D1 state is a mandatory defense for replay, idempotency, concurrency, entitlement recovery, and settlement uncertainty.

## Production Worker Gate
The deployed Cloudflare Worker is payment-capable:
- `PAID_TRAFFIC_ENABLED = true as const` is source-controlled in `src/worker.ts`;
- environment configuration cannot independently enable or disable that rollout state;
- the protected route requires HTTPS;
- the protected route requires the real D1 binding;
- missing/invalid production state fails closed;
- `GET /health` remains independent of payment bootstrap and D1 readiness;
- the production resource URL is derived from the incoming origin plus fixed `/api/lens`, not arbitrary client-provided URL data.

Source-level enablement was explicitly authorized in Block 022 after local paid-mode tests, guarded deployment workflow tests, full CI, and challenge-only public security checks were GREEN.

## Cloudflare Credentials
Credentials remain outside repository content and conversation data.

D1 provisioning:
- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_D1_API_TOKEN`.

Worker deployment:
- `CLOUDFLARE_WORKERS_API_TOKEN`.

Rules:
- never paste secret values into chat, source, issues, workflow inputs, artifacts, or logs;
- keep D1 and Workers credentials separate and least-privilege;
- do not use global API keys;
- do not grant Workers Admin without a documented requirement;
- one-shot launcher workflows are allowed only on isolated temporary branches pinned to reviewed source and must be removed from branch heads after evidence capture.

The D1 database UUID and workers.dev URL are public identifiers, not secrets.

## Persistent Replay and Settlement State
Production uses Cloudflare D1. The state adapter must preserve these invariants:
- `payment_identity` is unique and cannot be rebound to another request digest;
- `operation_id` is unique;
- claims use uniqueness plus read-back rather than check-then-insert races;
- state transitions use conditional compare-and-set updates;
- confirmed settlement transitions `settling -> settled` and stores the bounded receipt atomically;
- a stale settlement confirmation fails closed and cannot write a receipt;
- stored receipts are validated again when read;
- database errors and ambiguous write outcomes propagate as failures;
- settlement confirmation is never wrapped in unsafe automatic retries.

Remote D1 provisioning/migration and synthetic write/read/CAS/delete validation passed before public deployment. Local tests additionally cover persistence, replay, concurrency, and settlement uncertainty behavior.

## Public Challenge-Only Security Evidence
Block 020 tested the challenge-only deployment with a deliberately non-payment `payment-signature` and no Cloudflare credentials. The request failed closed without `payment-response` or protected output, health remained 200, and an unpaid request still returned 402.

This proved the pre-rollout payment barrier before `PAID_TRAFFIC_ENABLED` was enabled.

## Payment-Capable Deployment Evidence
Block 022 changed only the source rollout gate/comment plus its matching test expectation. The reviewed paid source is:

`1a34893a5fc9142645adf612af2a51601f5701bf`

Actions run `36285178793` passed 93/93 tests, typecheck, Wrangler dry-run, dependency-tree validation, and production audit.

Deployment run `36285252016`, job `108524675284`, pinned that reviewed source and deployed Cloudflare version:

`a6c0291a-b90e-447a-949c-8090f382837a`

Post-deploy non-spending checks passed:
- `/health` = HTTP 200;
- unpaid `/api/lens` = HTTP 402 with expected exact Nano mainnet terms and no protected output;
- malformed `payment-signature: AAAA` = HTTP 402 `PAYMENT_REJECTED`, no `payment-response`, no protected output.

## Successful Live Settlement Evidence
Block 026 adds the first external real-payment evidence.

Pursekeeper acceptance email `1a0e124b3218e1af` reported its checks ran at 04:28–04:30 UTC on 2026-09-27:
- unpaid `POST /api/lens` returned the expected 402 payment requirements;
- Pursekeeper's valid paid call settled through its facilitator;
- the paid endpoint returned HTTP 200 with the promised deterministic JSON Lens result;
- `/health` and the paid route remained reachable under its probe.

First live paid-call send block:

`BB290B0B406FF6705B42430C4B0082EF9DEC3792FA34825BDE06DC9CADAF635E`

This external evidence upgrades the prior local-only paid-path proof: successful live facilitator settlement and protected-result delivery are now confirmed by the paying client. It does not weaken any replay, fail-closed, or ambiguity-handling requirement.

Seller `uknwplayer-json-lens` was listed and Pursekeeper recorded the 10 XNO first-stage credit as ledger entry 260.

## Vendor SDK Boundary
The concrete `@x402/core` resource server remains isolated behind `src/payment/production-resource-server.ts` rather than leaking vendor protocol types through the generic payment core.

The production boundary validates/converts local resource configuration, payment requirements, untrusted decoded proof material, and facilitator responses into the bounded internal contract. Any x402 dependency version change must rerun typecheck, full tests, audit, and Wrangler bundle validation.

## Active Availability Security Ruling
The Pursekeeper 14-day reachability clock is confirmed to start on 2026-09-27, with 2026-10-11 identified for the second-stage condition.

During the active window:
- keep payment-taking code public;
- avoid unnecessary production changes;
- preserve the currently listed route and payTo where possible;
- if either payTo or paid route changes, notify Pursekeeper the same day;
- record and investigate any reachability incident immediately.

## Dependencies
Before release or dependency changes:
- pin versions appropriately;
- review critical transitive dependencies;
- run the full test suite;
- run typecheck;
- dry-run the Worker bundle;
- audit production dependencies.

## Data Handling
Treat the service as a transient processor: receive JSON, calculate the result, and discard submitted content unless a future design explicitly changes this rule.