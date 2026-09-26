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

## D-007 — Direct Execution Approved
**Status:** accepted on 2026-09-26
The operator approved the written implementation plan and direct execution, in work blocks of up to approximately 15 minutes.

## D-008 — Nano Integration Candidate
**Status:** source and discovery verified; runtime validation pending
Use @x402nano/exact 0.3.0 as the integration candidate and https://facilitator.pursekeeper.dev as the facilitator. Live /supported advertises x402 v2 exact on nano:mainnet. See protocol/NANO_402_WIRE_EXAMPLES.md for source pins and open payment gates.

## D-009 — Hosting Evaluation
**Status:** conditional candidate
Cloudflare Workers Free is the preferred evaluation target, subject to package compatibility and the 10 ms CPU bound. Vercel Hobby is excluded because this is a commercial service and Hobby is limited to personal non-commercial use. No deployment has occurred.

## D-010 — Strict Parser Dependency and Local Runtime
**Status:** implemented in Block 005
Use Microsoft jsonc-parser 3.3.1 (MIT), pinned with a lockfile, to inspect syntax and duplicate keys. Reject comments and trailing commas. A scanner bounds container nesting before recursive syntax-tree parsing. Native JSON.parse supplies standard object semantics, including ordinary own properties named __proto__. Enforce document depth and node counts in the parser before analysis/payment.

Use Node.js >=24 for local TypeScript execution and the Node test runner, with TypeScript 5.9.3 for static checking. This is not a guarantee of Cloudflare runtime compatibility.

Ruling: early depth/node checks move forward from Task 3 into Task 2 to protect parsing. Cost: all later callers must preserve these limits. Finite numeric values use JavaScript binary64 semantics; exact decimal precision is outside V1.
