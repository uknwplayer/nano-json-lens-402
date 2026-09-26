# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 013 — Strict production gate composition GREEN + real production HTTP 402 challenge confirmed
**Overall state:** TASK 5 IN PROGRESS / REAL 402 CHALLENGE CONFIRMED / LIVE VERIFY-SETTLE BLOCKED ON PERSISTENT STATE / MAIN UNTOUCHED

## Completed in this block
- Added a TDD production composition boundary around the Nano payment gate.
- TDD RED evidence at commit `ea20fc736f35a17b821dc22b7b9a978da65abf0c`, Actions run `36271247940`: 69 tests total, 68 passed, 1 failed exactly because `src/payment/production-gate.ts` did not exist.
- Added `createProductionNanoPaymentGate`.
- Production composition now requires the payment bootstrap to already be `ready`.
- Production composition now requires a `PaymentStateStore` with `productionSafe === true`.
- `MemoryPaymentStateStore` is explicitly rejected from the production payment path.
- The generic Nano gate remains available for isolated tests/development, but it is not the production readiness boundary.
- The first GREEN implementation passed all 71 runtime tests; typecheck then found only a generic inference issue in the test helper. The helper typing was corrected without changing production behavior.
- GREEN evidence at commit `513867d8665a90121f2101b3442cf6815f8d0f96`, Actions run `36271337667`: tests, typecheck, full dependency-tree validation, and production dependency audit all passed.
- Performed one controlled live production-challenge probe after GREEN using the real pinned production bootstrap and Pursekeeper capability synchronization.
- The probe sent a valid unpaid `POST /api/lens` with no `payment-signature` header, making verify/settle unreachable.
- Live challenge evidence: commit `7982b98b5bffd7df9ac23f06c068da8031182ed7`, Actions run `36271390574`, job `108485910965`.
- Confirmed HTTP status `402`.
- Confirmed x402 version `2`.
- Confirmed scheme `exact`, network `nano:mainnet`, asset `XNO`, and amount `10000000000000000000000000000` raw (`0.01 XNO`).
- Confirmed the expected public payTo address.
- Confirmed `extra.requestDigest` matched the SHA-256 digest of the exact request body used in the probe.
- Confirmed the `payment-required` response header decoded to the same challenge object carried in the JSON response body.
- The probe explicitly recorded `paymentSubmitted: false`.
- The one-shot live challenge workflow was removed after evidence capture in commit `ce35024df0bc81eb5107fdc0faeff9513743887b`.

## Active payment rulings
- `requestDigest` is service metadata and must be locally matched, but it is NOT claimed as cryptographic binding of the Nano block to the JSON body.
- The primary replay identity represents validated Nano state-block material rather than raw serialized proof bytes.
- The SHA-256 payment identity is service-local and is NOT claimed to be the Nano protocol's canonical on-chain block hash.
- Envelope-only mutation cannot create a second local settlement operation for the same block.
- The pinned server-side resource adapter requires no Nano seed, private key, or payer signing material.
- Resource-server construction remains offline. Live capability synchronization is an explicit bootstrap action.
- The service must not be considered payment-ready before bootstrap state is `ready`.
- A failed bootstrap instance is not automatically retried. Recovery requires an explicit new process/bootstrap decision.
- Production payment composition additionally requires a persistent state implementation that explicitly advertises `productionSafe === true`.
- `MemoryPaymentStateStore` is test/development-only and must never be used for payment-taking production traffic.
- A valid real 402 challenge does NOT by itself authorize a live payment attempt.
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
A real initialized unpaid HTTP 402 challenge was generated through the actual Fetch handler after live Pursekeeper capability synchronization. No payment proof was submitted. No live verify call was made. No live settle call was made. No Nano transfer was attempted. No public endpoint was deployed. No 14-day reachability window has started. No seed/private key was accessed.

## Blocking issue before any live payment
The only implemented state backend is process-local memory and is explicitly not production-safe. Accepting a real payment without durable replay/settlement state would violate the project's fail-closed recovery and replay rules.

## Exact next step
Continue Task 5 on `task5-production-nano-payment`:
1. select the free production deployment/runtime and persistent state backend together, because durability semantics depend on the runtime;
2. require a zero-cost option compatible with the current Node/x402 stack and the 14-day availability goal;
3. implement the persistent `PaymentStateStore` test-first;
4. prove atomic claim/CAS behavior and state/receipt durability across a new process/client instance according to the selected backend guarantees;
5. wire that store through `createProductionNanoPaymentGate` and rerun the complete security/CI suite;
6. only after that is GREEN consider the first controlled live verify/settle payment test.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep execution blocks approximately 15 minutes and update this checkpoint at every block closure. `main` must not be changed until the isolated Task 5 work has been verified and explicitly integrated. Do not claim Pursekeeper paid-call acceptance from the real 402 challenge alone.
