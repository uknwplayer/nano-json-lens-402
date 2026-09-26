# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 010 — Stable Nano replay identity enforced by PaymentGate
**Overall state:** TASK 5 IN PROGRESS / LOCAL PAYMENT HARDENING GREEN / MAIN UNTOUCHED

## Completed in this block
- Added a TDD regression test proving two proofs with the same Nano state block but different envelope-only metadata cannot settle twice.
- Observed the intended RED at commit `820edbc63d19900fe0e4a4d68030704a45551571`: 64 tests total, 63 passed, 1 failed because the old raw-proof replay key allowed 2 settlements.
- Updated payment fixtures to use a structurally valid Nano state block.
- Migrated settlement-uncertainty state expectations to the stable Nano block payment identity.
- Replaced `digestPaymentEvidence(proof)` as the primary replay key in `src/payment.ts` with `deriveNanoBlockPaymentIdentity(payload)`.
- Replay-protected flows now fail closed when a stable Nano block identity cannot be derived.
- Equivalent envelope representations of one block now share one payment claim and one confirmed settlement receipt.
- GitHub Actions run `36269262669` completed successfully for commit `5ff6252d9545b7fdea693d822eadf5572e574a80`: 64/64 tests passed and typecheck passed.

## Active payment rulings
- `requestDigest` is service metadata and must be locally matched, but it is NOT claimed as cryptographic binding of the Nano block to the JSON body.
- The primary replay identity represents validated Nano state-block material rather than raw serialized proof bytes.
- The SHA-256 payment identity is service-local and is NOT claimed to be the Nano protocol's canonical on-chain block hash.
- Envelope-only mutation cannot create a second local settlement operation for the same block.
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
Continue Task 5 on `task5-production-nano-payment`:
1. validate and pin `@x402nano/exact` 0.3.0 plus a compatible `@x402/core` dependency tree;
2. add a test-first production `resourceServer` construction adapter using the pinned package APIs;
3. run the full CI and dependency/security checks;
4. verify no seed/private key is required by the server-side resource gate;
5. only after local package integration is green consider a controlled live facilitator validation.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep execution blocks approximately 15 minutes and update this checkpoint at every block closure. `main` must not be changed until the isolated Task 5 work has been verified and explicitly integrated. Do not claim Pursekeeper acceptance from fake facilitator results.
