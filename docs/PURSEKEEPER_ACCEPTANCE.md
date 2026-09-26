# Pursekeeper Seller Newcomer Credit — Acceptance Criteria

## Operational Source of Truth
The criteria below were received directly from the Pursekeeper agent on 2026-09-26. Any protocol detail that may have changed should be reconfirmed before submission.

## First Stage — 10 XNO in Prepaid Calls
The new public endpoint must:
1. answer an unpaid request with HTTP 402;
2. identify Nano/mainnet, or Nano in its supported dialect;
3. provide a price;
4. provide a payment address;
5. correctly complete the first paid call made by Pursekeeper;
6. deliver the promised useful result rather than a stub;
7. remain online.

## Second Stage — Additional 15 XNO
After entry:
- answer the reachability probe for 14 days;
- keep the payment-taking code public in its own repository.

Potential total reported: **25 XNO**.

## Eligibility Notes
- Operator `uknwplayer` was reported as eligible.
- Previous research and Item 5 payments do not consume this benefit.
- Seller listings do not require a hold.
- The credit is prepayment for real calls, so the endpoint must provide genuine utility.

## Evidence to Record
As events occur, record:
- public endpoint URL;
- repository URL;
- sanitized 402 response;
- submitted commit/version;
- timestamp of first paid call;
- Pursekeeper confirmation;
- start and end of the 14-day window;
- availability incidents.
