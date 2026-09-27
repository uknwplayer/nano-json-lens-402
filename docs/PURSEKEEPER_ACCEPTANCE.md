# Pursekeeper Seller Newcomer Credit — Acceptance Criteria

## Operational Source of Truth
The criteria below were received directly from the Pursekeeper agent on 2026-09-26 and reconfirmed immediately before submission in Block 023. Any protocol or program detail that may have changed must be reconfirmed from direct Pursekeeper evidence before making a new claim.

## First Stage — 10 XNO in Prepaid Calls
The new public endpoint must:
1. answer an unpaid request with HTTP 402;
2. identify Nano/mainnet, or Nano in its supported dialect;
3. provide a price;
4. provide a payment address;
5. correctly complete the first paid call made by Pursekeeper;
6. deliver the promised useful result rather than a stub;
7. remain online.

When those listing checks pass, Pursekeeper reported that the seller is listed and receives **10 XNO of prepaid calls**.

## Second Stage — Additional 15 XNO
After listing:
- answer the Pursekeeper reachability probe for 14 days;
- keep the Nano payment-taking code public in the seller's own repository.

Potential total reported: **25 XNO**.

## Confirmed Submission Sequence
The direct instruction from Pursekeeper was: **send the endpoint when it is live; seller listings need no hold.**

For this project, "live" was interpreted conservatively to mean payment-capable, not merely challenge-capable, because the listing checks include a successful paid call by Pursekeeper.

Completed sequence:
1. challenge-only deployment and public 402 evidence — completed;
2. local payment-enabled runtime proof and separately guarded payment-enable deployment path — completed;
3. explicit operator authorization before changing the source-controlled paid-traffic gate — completed;
4. payment-capable Worker deployment plus health, unpaid 402, and malformed-proof checks without spending Nano — completed;
5. endpoint submission to Pursekeeper in the existing eligibility thread — completed on 2026-09-27;
6. Pursekeeper's own first paid listing call — **awaiting**;
7. listing/credit evidence — **awaiting explicit Pursekeeper confirmation**.

The first intended submission message was sent at `2026-09-27T01:48:06Z`, Gmail message ID `1a0e08c4daebfbfe`. An identical accidental duplicate was sent 31 seconds later, message ID `1a0e08cc72239d50`. No further copy or correction was sent; do not resend while awaiting the seller checks.

## Current Submitted Service
- Endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Repository: `https://github.com/uknwplayer/nano-json-lens-402`.
- Public implementation branch: `task5-production-nano-payment`.
- Price: `0.01 XNO`.
- Network/scheme: `nano:mainnet` / `exact`.
- Payment-capable Cloudflare version: `a6c0291a-b90e-447a-949c-8090f382837a`.
- Reviewed deployed source: `1a34893a5fc9142645adf612af2a51601f5701bf`.
- Persistent payment state: Cloudflare D1 `PAYMENT_DB`.

## 14-Day Clock Ruling
Do not backdate the 14-day seller-credit clock to the challenge-only deployment, the payment-capable deployment, or the submission email. Record the clock from the first Pursekeeper-confirmed listing/reachability-probe date after the paid listing checks pass, unless Pursekeeper explicitly states a different start time.

This conservative ruling matches the direct email wording: the additional credit depends on 14 days of answered reachability probes plus public payment-taking code.

## Eligibility Notes
- Operator `uknwplayer` was reported as eligible.
- Previous research and Item 5 payments do not consume this benefit.
- Seller listings do not require a hold.
- The credit is prepayment for real calls, so the endpoint must provide genuine utility.
- The first real paid call required for listing is expected to be made by Pursekeeper; this project will not introduce a seller-side Nano seed/private key merely to self-pay.

## Current Non-Claims
Until new Pursekeeper evidence arrives, do not claim:
- seller listing accepted;
- successful live facilitator verify;
- successful live facilitator settle;
- Nano transfer through this endpoint;
- 10 XNO seller credit earned;
- 14-day seller-credit clock started.

## Evidence to Record
As events occur, record:
- public endpoint URL;
- repository URL;
- sanitized 402 response;
- submitted commit/version;
- endpoint-submission timestamp and Gmail message ID;
- timestamp and transaction evidence of the first paid call;
- Pursekeeper listing/check confirmation;
- evidence of the 10 XNO prepaid-call credit;
- first confirmed reachability-probe/listing date used for the 14-day clock;
- availability incidents;
- 14-day completion and second-stage credit evidence.

## Response Handling
When Pursekeeper replies:
1. read the full existing thread before acting;
2. distinguish challenge confirmation, paid-call attempt, settlement result, listing acceptance, and credit evidence;
3. on any ambiguous paid-call result, reconcile D1 and Nano/facilitator state before retrying anything;
4. do not send duplicate submission messages;
5. update the current checkpoint and roadmap only from explicit evidence.