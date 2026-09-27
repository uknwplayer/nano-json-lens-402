# Pursekeeper Seller Newcomer Credit — Acceptance Criteria

## Operational Source of Truth
The criteria were received directly from the Pursekeeper agent on 2026-09-26 and the seller result was confirmed by Pursekeeper on 2026-09-27.

Acceptance email evidence:
- Gmail message ID: `1a0e124b3218e1af`;
- timestamp: `2026-09-27T04:34:30Z`;
- subject: `Re: Eligibility question — seller newcomer credit — uknwplayer: listed and credited (ledger 260)`.

## First Stage — 10 XNO in Prepaid Calls
Required checks:
1. unpaid request answers HTTP 402;
2. challenge identifies Nano/mainnet or supported Nano dialect;
3. price is present;
4. payment address is present;
5. Pursekeeper's first paid call completes;
6. the promised useful result is delivered rather than a stub;
7. the endpoint remains online.

**Status: COMPLETE.**

Pursekeeper reported the checks ran at 04:28–04:30 UTC on 2026-09-27:
- unpaid `POST /api/lens` returned 402 with `PAYMENT-REQUIRED`, `exact`, `nano:mainnet`, `1e28` raw, expected payTo, and requestDigest;
- its paid call settled through the facilitator and returned HTTP 200 with canonical form, SHA-256, 73-byte size, depth 3, and eight paths for the submitted document;
- `/health` answered and the paid route remained reachable under probe.

First live paid-call send block:
`BB290B0B406FF6705B42430C4B0082EF9DEC3792FA34825BDE06DC9CADAF635E`

Seller listing: `uknwplayer-json-lens` at `https://pursekeeper.dev/sellers`.

First-stage credit: **10 XNO**, Pursekeeper ledger entry **260**.

## Second Stage — Additional 15 XNO
Pursekeeper confirmed:
- the 14-day clock starts on `2026-09-27`;
- the reachability probe must continue to succeed;
- payment-taking code must remain public;
- the relevant completion date identified by Pursekeeper is `2026-10-11`.

**Status: ACTIVE / PENDING COMPLETION.**

Do not claim the second-stage 15 XNO until explicit Pursekeeper evidence confirms it.

## Completed Submission Sequence
1. challenge-only deployment and public 402 evidence — completed;
2. local payment-enabled runtime proof and guarded payment-enable deployment path — completed;
3. explicit operator authorization before source-level paid enablement — completed;
4. payment-capable Worker deployment and non-spending validation — completed;
5. endpoint submission to Pursekeeper — completed on 2026-09-27;
6. Pursekeeper's own first paid listing call — completed successfully;
7. seller listing and 10 XNO first-stage credit — confirmed.

Primary submission message: `1a0e08c4daebfbfe` at `2026-09-27T01:48:06Z`. An identical accidental duplicate was sent 31 seconds later as `1a0e08cc72239d50`. No further submission copy was sent.

## Current Listed Service
- Endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Seller listing: `uknwplayer-json-lens`.
- Repository: `https://github.com/uknwplayer/nano-json-lens-402`.
- Public implementation branch: `task5-production-nano-payment`.
- Price: `0.01 XNO`.
- Network/scheme: `nano:mainnet` / `exact`.
- Payment-capable Cloudflare version: `a6c0291a-b90e-447a-949c-8090f382837a`.
- Reviewed deployed source: `1a34893a5fc9142645adf612af2a51601f5701bf`.
- Persistent payment state: Cloudflare D1 `PAYMENT_DB`.

## Active Operational Conditions
Pursekeeper stated that nothing else is currently needed from the operator.

During the active window:
- keep the endpoint reachable;
- keep payment-taking code public;
- avoid unnecessary production changes;
- if the payTo or paid route changes, tell Pursekeeper the same day so the listing does not become stale;
- record any reachability incident immediately.

## Remaining Claims
Confirmed:
- seller listing accepted;
- unpaid 402 seller check passed;
- first live paid call settled through Pursekeeper's facilitator;
- paid service returned HTTP 200 with the promised result;
- 10 XNO first-stage credit earned and recorded;
- 14-day clock started on 2026-09-27.

Not yet confirmed:
- successful completion of all 14 reachability days;
- second-stage 15 XNO credit.

## Evidence to Preserve
- public endpoint URL;
- repository and public implementation branch;
- submitted deployment/source identifiers;
- submission email IDs and timestamp;
- Pursekeeper acceptance email ID and timestamp;
- first paid-call send block;
- seller listing slug;
- ledger entry 260 for the 10 XNO credit;
- 14-day start date `2026-09-27`;
- Pursekeeper-identified completion date `2026-10-11`;
- availability incidents, if any;
- second-stage completion/credit evidence when it arrives.
