# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 009 — Stable Nano block payment identity GREEN
**Overall state:** TASK 5 IN PROGRESS / PAYMENT HARDENING GREEN AT IDENTITY HELPER / MAIN UNTOUCHED

## Completed in this block
- Reconciled the stale Block 008 checkpoint against the actual `task5-production-nano-payment` branch state.
- Confirmed the branch had already progressed through payment-gate implementation, replay state storage, idempotent confirmed-settlement recovery, and settlement-uncertainty fail-closed behavior.
- Confirmed the current TDD RED at commit `51091f469b7f09a2c4585521f8c012d0827baf9c`: Nano block payment identity tests failed because `deriveNanoBlockPaymentIdentity` was absent.
- Implemented `deriveNanoBlockPaymentIdentity` in `src/payment/identity.ts`.
- The local replay identity is derived from validated Nano state-block signed material only: `type`, `account`, `previous`, `representative`, `balance`, and `link`.
- Envelope-only metadata, signature, PoW and derived display fields are excluded so equivalent representations of one Nano block cannot create distinct replay identities.
- Malformed/missing required block fields fail closed; balance is bounded to unsigned 128-bit range.
- GitHub Actions run `36268358967` completed successfully for commit `778a4a52c6d5206dd05902bbfecfb9125eb5d3e0`.

## Active payment rulings
- `requestDigest` is service metadata and must be locally matched, but it is NOT claimed as cryptographic binding of the Nano block to the JSON body.
- The primary replay identity should represent the Nano state block rather than raw serialized proof bytes.
- The new SHA-256 payment identity is service-local and is NOT claimed to be the Nano protocol's canonical on-chain block hash.
- Facilitator verification and Nano settlement remain authoritative for payment validity.
- Unknown verify/settle transport status must not expose protected output and must not trigger unsafe automatic re-settlement; map uncertainty to HTTP 503 at the HTTP layer.

## Payment parameters
- Network: `nano:mainnet`.
- Scheme: `exact`.
- Package target: `@x402nano/exact` 0.3.0; production package pin/integration is still pending.
- Proposed price remains `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator target: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Scope of evidence
No real payment was sent. No live facilitator verify/settle write was made. No public endpoint was deployed. No 14-day reachability window has started. The public Nano address is not secret; no seed/private key was accessed.

## Exact next step
Continue Task 5 on `task5-production-nano-payment` with a new TDD cycle:
1. add a failing payment-gate test proving that two proofs with the same Nano state block but different envelope-only metadata share one replay identity and cannot settle twice;
2. replace the primary `digestPaymentEvidence(proof)` replay key in `src/payment.ts` with `deriveNanoBlockPaymentIdentity(payload)`;
3. run the full Task 5 CI and require GREEN;
4. keep raw proof digest only as secondary evidence metadata if it is still needed;
5. then continue toward package pinning/real x402 adapter validation and security checks.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep execution blocks approximately 15 minutes and update this checkpoint at every block closure. `main` must not be changed until the isolated Task 5 work has been verified and explicitly integrated. Do not claim Pursekeeper acceptance from fake facilitator results.
