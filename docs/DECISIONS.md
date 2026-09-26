# Decision Log

## D-001 — Dedicated Public Repository
**Status:** accepted  
The service lives in `uknwplayer/nano-json-lens-402`, separate from ARCA.

## D-002 — Useful Deterministic Service
**Status:** active design proposal  
The initial product is a JSON Lens, not a stub.

## D-003 — No Arbitrary Fetch in V1
**Status:** active design proposal  
This avoids SSRF, external timeouts, and unnecessary third-party dependencies.

## D-004 — Free Health Endpoint
**Status:** active design proposal  
Separating reachability from the paid operation simplifies observability.

## D-005 — Mandatory Checkpoint
**Status:** accepted  
Every work block ends by updating `docs/checkpoints/CHECKPOINT_CURRENT.md`.

## D-006 — English as the Official Project Language
**Status:** accepted  
All repository content, source code, code comments, API fields, public error messages, operational logs, documentation, issues, releases, and Pursekeeper/customer-facing communication must use English. Portuguese is reserved for the private working conversation with the operator.

## Open Decisions
- deployment runtime/provider;
- final Nano x402 library/version;
- facilitator;
- final price;
- public Nano address;
- payload limits;
- license.
