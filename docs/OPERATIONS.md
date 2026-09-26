# Operations and Availability

## Initial Availability Goal
Keep the public endpoint functional throughout the Pursekeeper-required window, with margin beyond the 14-day period.

## Health
Planned endpoint: `GET /health`

Minimum response should expose:
- status;
- version/build;
- server timestamp if useful.

It must not require payment.

## Incident Procedure
If an outage occurs:
1. record the approximate time;
2. identify the cause;
3. restore service;
4. test health;
5. test the 402 challenge;
6. update the checkpoint;
7. determine whether Pursekeeper must be informed or the reachability window must restart.

## Deployment
The provider is not yet selected. Do not assume Vercel, persistent server, or edge runtime until Nano x402 library compatibility is tested.

## Changes During the 14-Day Window
Avoid high-risk changes during the 14-day window. Urgent fixes should be small, tested, and documented.
