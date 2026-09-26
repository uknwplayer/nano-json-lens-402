# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 011 — Production x402 Nano package adapter GREEN
**Overall state:** TASK 5 IN PROGRESS / PINNED REAL PACKAGE CONSTRUCTION GREEN / LIVE FACILITATOR INITIALIZATION PENDING / MAIN UNTOUCHED

## Completed in this block
- Revalidated upstream `@x402nano/exact` metadata for version `0.3.0` and its declared `@x402/core ^2.22.0` compatibility range.
- Pinned `@x402nano/exact` `0.3.0` and `@x402/core` `2.24.0`, choosing the core version resolved by the upstream release lock evidence rather than leaving a floating compatible range.
- Established a clean TDD RED at commit `2cecc3730bfc0ef3849d54cd88ce82906f6fd640`: 65 tests total, 64 passed, and the new test failed only because `src/payment/production-resource-server.ts` did not exist.
- Added `createProductionNanoResourceServer`, using the real `HTTPFacilitatorClient`, `x402ResourceServer`, and `ExactNanoScheme`, registering `exact` for `nano:mainnet`.
- Generated and committed the npm dependency lock with registry-provided integrity hashes via a temporary read-only Actions probe; the temporary workflow was removed after use.
- The first GREEN attempt exposed an x402 lifecycle requirement: `buildPaymentRequirements()` requires `resourceServer.initialize()` to have synchronized supported facilitator kinds. The incorrect offline-build test assumption was corrected rather than hiding live network I/O inside construction.
- The production constructor is intentionally offline and side-effect-free. Facilitator synchronization remains an explicit runtime/bootstrap step.
- Permanent Task 5 CI now runs `npm ci`, the full tests, typecheck, `npm ls --all`, and `npm audit --omit=dev --audit-level=moderate`.
- Final verification on commit `eeb483d01e852b27dc72b62f23a70445c3d1cabc`, Actions run `36270214290`: 65/65 tests passed, typecheck passed, dependency-tree validation passed, and the production audit reported 0 vulnerabilities.

## Active payment rulings
- `requestDigest` is service metadata and must be locally matched, but it is NOT claimed as cryptographic binding of the Nano block to the JSON body.
- The primary replay identity represents validated Nano state-block material rather than raw serialized proof bytes.
- The SHA-256 payment identity is service-local and is NOT claimed to be the Nano protocol's canonical on-chain block hash.
- Envelope-only mutation cannot create a second local settlement operation for the same block.
- The pinned server-side resource adapter requires no Nano seed, private key, or payer signing material.
- Resource-server construction must not perform facilitator network I/O. `initialize()` is an explicit bootstrap action and must succeed before payment requirements, verification, or settlement are considered ready.
- Facilitator verification and Nano settlement remain authoritative for payment validity.
- Unknown verify/settle transport status must not expose protected output and must not trigger unsafe automatic re-settlement; map uncertainty to HTTP 503 at the HTTP layer.

## Payment parameters
- Network: `nano:mainnet`.
- Scheme: `exact`.
- `@x402nano/exact`: `0.3.0` pinned.
- `@x402/core`: `2.24.0` pinned.
- Proposed price remains `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator target: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Scope of evidence
No real payment was sent. No live facilitator `initialize`, verify, or settle operation was performed in this block. No public endpoint was deployed. No 14-day reachability window has started. The public Nano address is not secret; no seed/private key was accessed.

## Exact next step
Continue Task 5 on `task5-production-nano-payment`:
1. add a test-first runtime/bootstrap initialization boundary for the pinned production resource server;
2. prove initialization failure prevents the service from becoming payment-ready;
3. after that contract is green, perform a controlled read-only Pursekeeper capability synchronization/`supported` validation;
4. wire the successfully initialized real resource server into the Nano `PaymentGate` startup path and prove the production 402 challenge;
5. do not perform a real verify/settle payment until these gates are green and explicitly recorded.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep execution blocks approximately 15 minutes and update this checkpoint at every block closure. `main` must not be changed until the isolated Task 5 work has been verified and explicitly integrated. Do not claim Pursekeeper acceptance from package construction or fake facilitator results.
