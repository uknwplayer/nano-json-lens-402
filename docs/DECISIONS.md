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
- final price;
- public Nano address;
- durable replay/idempotency storage and retention;
- facilitator reconciliation capabilities;
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

## D-011 — Portable HTTP Handler and Explicit Payment Gate
**Status:** implemented in Block 007
Use the standard Request/Response Fetch interface to support a later Node or Workers adapter. No server bootstrap is configured yet. An explicit PaymentGate is mandatory; test doubles are confined to test code. Buffer bounded useful output before settlement and release only after the adapter reports a valid settlement receipt. Compute a raw-body SHA-256 for the adapter, without claiming that the digest by itself cryptographically binds a Nano payment.

Default body timeout is 5000 ms; maximum body 65536 bytes and payment header 16384 characters. All responses disable caching. Adapter errors become sanitized 503 responses.

## D-012 — Fail-Closed Payment Binding and Idempotency
**Status:** design approved on 2026-09-26; implementation pending
Security for both seller and payer is the priority. Use a fail-closed payment state machine: `unverified -> verified -> settling -> settled -> fulfilled`. Only confirmed settlement can authorize fulfillment. Ambiguous settlement never becomes free access and must not trigger blind re-settlement or a second charge.

Bind each protected operation to a deterministic request identifier covering a version/domain separator, HTTP method, route, canonical payload hash, expected price, network and receiving address. The exact serialization must be unambiguous (for example length-prefixed or canonical structured encoding) before hashing.

Associate payment evidence with that request identity. Reusing the same proof/payment for a modified request is rejected. Acquisition of a request/payment identity must be atomic so concurrent copies cannot settle or fulfill multiple times.

Legitimate identical retries are idempotent: after a network failure, the service should recover the already-authorized state/result where safe instead of demanding a new payment. Persist only minimal non-secret replay/reconciliation metadata; do not retain customer JSON merely for payment safety.

Production remains blocked until durable state/retention and facilitator settlement-reconciliation behavior are resolved and tested.
