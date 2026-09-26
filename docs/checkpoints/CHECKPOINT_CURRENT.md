# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 012 — Fail-closed bootstrap GREEN + live read-only Pursekeeper capability sync
**Overall state:** TASK 5 IN PROGRESS / PRODUCTION BOOTSTRAP GREEN / PURSEKEEPER SUPPORTED SYNC CONFIRMED / REAL VERIFY-SETTLE NOT STARTED / MAIN UNTOUCHED

## Completed in this block
- Added a test-first payment bootstrap boundary around resource-server initialization.
- TDD RED evidence at commit `ee1a91c95ef61aa027d493bc4ab518d5d0677db9`, Actions run `36270643615`: 66 tests total, 65 passed, 1 failed exactly because `src/payment/bootstrap.ts` did not exist.
- Added `createPaymentBootstrap` with explicit states: `cold -> initializing -> ready` or `cold -> initializing -> failed`.
- The wrapped resource server cannot be obtained through the bootstrap before `ready`.
- Concurrent initialization calls share one initialization attempt.
- Initialization failure is fail-closed and terminal for that bootstrap instance; a second call does not silently retry the facilitator.
- Added `createProductionNanoPaymentBootstrap`, which constructs the real pinned Nano x402 resource server offline and exposes it only after successful initialization.
- GREEN verification at commit `ac54388710652ac1590586e108850d5706190b4c`, Actions run `36270714787`: 68/68 tests passed; typecheck, `npm ls --all`, and production dependency audit passed; audit reported 0 vulnerabilities.
- Reviewed x402 initialization flow before live use: `x402ResourceServer.initialize()` loads facilitator capabilities via `getSupported()`, and the HTTP client performs `GET /supported`; no verify or settle call is part of that initialization path.
- Performed one controlled read-only live Pursekeeper capability synchronization using the pinned production packages and the fail-closed bootstrap.
- Live probe evidence: commit `abbec8688e7cd27211678f9f790e24b566fedcf6`, Actions run `36270824058`, job `108484312333`. The probe reached `ready` and built the expected requirement: `exact`, `nano:mainnet`, `XNO`, amount `10000000000000000000000000000` raw, expected payTo.
- The one-shot live probe workflow was removed after evidence was captured.

## Active payment rulings
- `requestDigest` is service metadata and must be locally matched, but it is NOT claimed as cryptographic binding of the Nano block to the JSON body.
- The primary replay identity represents validated Nano state-block material rather than raw serialized proof bytes.
- The SHA-256 payment identity is service-local and is NOT claimed to be the Nano protocol's canonical on-chain block hash.
- Envelope-only mutation cannot create a second local settlement operation for the same block.
- The pinned server-side resource adapter requires no Nano seed, private key, or payer signing material.
- Resource-server construction remains offline. Live capability synchronization is an explicit bootstrap action.
- The service must not be considered payment-ready before bootstrap state is `ready`.
- A failed bootstrap instance is not automatically retried. Recovery requires an explicit new process/bootstrap decision.
- Facilitator verification and Nano settlement remain authoritative for payment validity.
- Unknown verify/settle transport status must not expose protected output and must not trigger unsafe automatic re-settlement; map uncertainty to HTTP 503 at the HTTP layer.

## Payment parameters
- Network: `nano:mainnet`.
- Scheme: `exact`.
- `@x402nano/exact`: `0.3.0` pinned.
- `@x402/core`: `2.24.0` pinned.
- Price: `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Scope of evidence
A live facilitator capability initialization/read-only supported synchronization was performed successfully. No payment proof was submitted. No live verify call was made. No live settle call was made. No Nano transfer was attempted. No public endpoint was deployed. No 14-day reachability window has started. No seed/private key was accessed.

## Exact next step
Continue Task 5 on `task5-production-nano-payment`:
1. create a test-first production startup composition that accepts only a `ready` production bootstrap and wires its real resource server into `createNanoPaymentGate`;
2. prove a cold/failed bootstrap cannot construct a payment-ready production gate;
3. after GREEN, use the initialized real resource server to generate and inspect the actual production 402 challenge for `POST /api/lens` without submitting any payment;
4. verify the challenge carries the frozen network, scheme, price, payTo, and request digest metadata;
5. do not perform a real verify/settle payment until that production challenge path is GREEN and recorded.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep execution blocks approximately 15 minutes and update this checkpoint at every block closure. `main` must not be changed until the isolated Task 5 work has been verified and explicitly integrated. Do not claim Pursekeeper payment acceptance from supported synchronization alone.
