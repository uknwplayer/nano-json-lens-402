# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 008 — Production Nano payment gate, RED established
**Overall state:** TASK 5 IN PROGRESS / PAYMENT TEST CONTRACT FAILING AS EXPECTED / MAIN UNTOUCHED

## Completed in this block
- Created isolated branch `task5-production-nano-payment` from `main`.
- Added branch-only GitHub Actions test workflow because the local container could not resolve github.com.
- Confirmed the operator's previously used public Nano receiving address from an authorized source: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.
- Re-read the pinned `x402nano/exact` server scheme and runnable server example.
- Defined the production payment-gate contract in `test/payment.test.ts` before any `src/payment.ts` implementation.
- Observed a clean TDD RED in Actions run `36261797244`: 37 tests total, 36 existing tests passed, 1 new test file failed because `src/payment.ts` does not exist.
- Recorded request-binding and recovery rulings in `docs/EXECUTION_LEDGER.md`.

## Active payment rulings
- `requestDigest` is service metadata and must be locally matched, but it is NOT claimed as cryptographic binding of the Nano block to the JSON body.
- Nano single-spend settlement is the authoritative replay barrier; explicit concurrency/replay tests are still required.
- Unknown verify/settle transport status must not expose protected output and must not trigger unsafe automatic re-settlement; map uncertainty to HTTP 503 at the HTTP layer.

## Payment parameters
- Network: `nano:mainnet`.
- Scheme: `exact`.
- Package target: `@x402nano/exact` 0.3.0.
- Proposed price remains `0.01 XNO` = `10000000000000000000000000000` raw, pending adapter assertion.
- Facilitator target: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Scope of evidence
No real payment was sent. No facilitator verify/settle write was made. No public endpoint was deployed. No 14-day reachability window has started. The public Nano address is not secret; no seed/private key was accessed.

## Exact next step
Continue Task 5 on `task5-production-nano-payment`:
1. implement the minimal `src/payment.ts` adapter against the test contract;
2. pin `@x402nano/exact` 0.3.0 and a compatible `@x402/core` dependency tree;
3. run CI and observe GREEN for the payment tests plus the existing suite;
4. add explicit replay/concurrency tests and resolve any failures;
5. run typecheck/security/secret checks;
6. only then mark Task 5 complete.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep execution blocks approximately 15 minutes and update this checkpoint at every block closure. Main must not be changed until the isolated Task 5 work has been verified and explicitly integrated. Do not claim Pursekeeper acceptance from fake facilitator results.
