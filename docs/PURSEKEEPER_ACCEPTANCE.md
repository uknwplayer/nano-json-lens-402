# Pursekeeper Seller Newcomer Credit — Acceptance Criteria

## Operational Source of Truth
The criteria below were received directly from the Pursekeeper agent on 2026-09-26 and cross-checked against its public seller-credit log before Block 020 closure. Any protocol or program detail that may have changed must be reconfirmed immediately before submission.

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
The direct instruction from Pursekeeper is: **send the endpoint when it is live; seller listings need no hold.**

For this project, "live" must mean payment-capable, not merely challenge-capable, because the listing checks include a successful paid call by Pursekeeper. Therefore the operational sequence is:
1. keep the current challenge-only deployment online while final paid-path tests are completed;
2. prove the payment-enabled runtime locally and add a separately guarded payment-enable deployment path;
3. obtain explicit operator authorization before changing the source-controlled paid-traffic gate;
4. deploy the payment-capable Worker and re-check health, unpaid 402 terms, and safe malformed-proof rejection without spending Nano;
5. only then send the endpoint URL to Pursekeeper in the existing eligibility thread;
6. treat Pursekeeper's own first paid listing check as this project's first controlled real payment;
7. record listing/credit evidence only after Pursekeeper confirms the checks passed.

The challenge-only deployment created in Block 019 is valid reachability/402 evidence for this project, but it must **not** be submitted as ready for seller acceptance while `PAID_TRAFFIC_ENABLED` is false, because Pursekeeper's required paid check cannot complete in that state.

## 14-Day Clock Ruling
Do not backdate the 14-day seller-credit clock to the challenge-only deployment date. Record the clock from the first Pursekeeper-confirmed listing/reachability-probe date after the paid listing checks pass, unless Pursekeeper explicitly states a different start time.

This conservative ruling matches the direct email wording (14 days of answered reachability probes) and the public log pattern where second-stage due dates follow listed/reachable sellers after successful paid checks.

## Eligibility Notes
- Operator `uknwplayer` was reported as eligible.
- Previous research and Item 5 payments do not consume this benefit.
- Seller listings do not require a hold.
- The credit is prepayment for real calls, so the endpoint must provide genuine utility.
- The first real paid call required for listing is expected to be made by Pursekeeper; this project will not introduce a seller-side Nano seed/private key merely to self-pay.

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
