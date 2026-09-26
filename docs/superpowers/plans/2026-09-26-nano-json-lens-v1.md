# Nano JSON Lens V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a useful, paid Nano mainnet JSON analysis endpoint and verify it with Pursekeeper.

**Architecture:** A Node-compatible TypeScript HTTP adapter validates input, uses a pure JSON analysis module, and gates the result through a verified and settled Nano x402 payment. Health is free. The selected package and hosting provider are validated before integration.

**Tech Stack:** TypeScript, Node-compatible runtime, Node test runner, Node `crypto`, a verified Nano x402 resource-server package and facilitator (selection gate in Task 1).

**Spec:** `docs/specs/V1_TECHNICAL_SPEC.md`

## Global Constraints
- Project artifacts, API and public messages are in English.
- Raw request body cap: 64 KiB; each analyzed document: at most 1,000 nodes and depth 32; response cap: 128 KiB.
- JSON result must be deterministic; no submitted document persistence or payload logging.
- No wallet seed or private key in the repository or runtime.
- Paid analysis is released only after successful verification and settlement.
- Each work block ends with `docs/checkpoints/CHECKPOINT_CURRENT.md` updated; material milestones also get historical snapshots.
- Each execution block is limited to about 15 minutes, with a pause for the operator to continue.

## Review Focus
- Duplicate JSON keys: reject, rather than silently overwrite (Task 2).
- Unicode and JSON pointer escapes: stable order and pointer encoding (Task 3).
- Deep or wide payloads: fail before unbounded analysis or output (Tasks 2 and 3).
- Settlement or facilitator outage: never return protected analysis (Task 5).
- Repeat payment proof: follow the selected protocol's replay semantics and verify expected rejection (Task 5).

---

### Task 1: Confirm Protocol, Public Parameters, and Runtime

**Files:** Modify `docs/specs/V1_TECHNICAL_SPEC.md`, `docs/DECISIONS.md`, `docs/OPERATIONS.md`; create `docs/protocol/NANO_402_WIRE_EXAMPLES.md`.

**Interfaces:** Produces pinned package/version, official source links, exact challenge/proof/response headers, facilitator verify/settle API, error mapping, raw-unit price, public address, and selected HTTPS runtime. These are prerequisites for Task 5; no placeholder values enter production.

- [ ] Read the current package source/example and facilitator documentation from primary sources; capture a real runnable example and license.
- [ ] Verify the public receiving address with the operator or an already authorized source, and confirm the proposed `0.01 XNO` price and unit conversion.
- [ ] Check provider compatibility and free tier limits, then record the deployment choice and fallback.
- [ ] Record sanitized expected unpaid, rejected, and paid exchanges in `docs/protocol/NANO_402_WIRE_EXAMPLES.md`.
- [ ] Review the examples against Pursekeeper's acceptance criteria and amend the spec/decision log; commit and update checkpoint.

### Task 2: Strict Request Parsing

**Files:** Create `package.json`, `tsconfig.json`, `src/request.ts`, `test/request.test.ts`.

**Interfaces:** Produces `parseLensRequest(raw: Uint8Array, contentType: string): LensRequest` with `LensRequest = { mode: 'document'; document: JsonValue } | { mode: 'compare'; before: JsonValue; after: JsonValue }`; throws typed `LensError` with HTTP status and public code. Reject duplicate object members during parsing.

- [ ] Write failing tests for valid single/compare input, explicit `null`, extra or missing fields, malformed JSON, duplicate keys, content type, and 64 KiB boundary.
- [ ] Run `npm test -- test/request.test.ts`; confirm the new tests fail.
- [ ] Implement strict parsing and byte limit with a parser that can detect duplicate keys; pin its version and justify the dependency.
- [ ] Run the focused test and full `npm test`; commit and update checkpoint.

### Task 3: Deterministic Analysis

**Files:** Create `src/lens.ts`, `test/lens.test.ts`.

**Interfaces:** Produces `analyze(value: JsonValue): Analysis` and `compare(before: JsonValue, after: JsonValue): Change[]`, with `Analysis` and `Change` fields exactly as in the spec. Expose `buildLensResult(request: LensRequest): LensResult` with preflight response limit enforcement.

- [ ] Write failing fixtures for reordered objects/hash equality, arrays, Unicode ordering, RFC 6901 pointers, primitive roots, metrics, same-value comparison, additions/removals/type/value changes, deterministic change order, and 1,000-node/depth-32/128 KiB limits.
- [ ] Run `npm test -- test/lens.test.ts`; confirm failure.
- [ ] Implement canonical serialization, SHA-256, bounds, path map and diff; do not claim RFC 8785 compliance.
- [ ] Run focused and full tests; commit and update checkpoint.

### Task 4: Public HTTP Surface

**Files:** Create `src/server.ts`, `test/server.test.ts`, `.env.example`; modify `README.md`.

**Interfaces:** Produces `GET /health` and `POST /api/lens`, with `src/server.ts` accepting an injectable `PaymentGate` interface (`challenge`, `verifyAndSettle`) and `buildLensResult`. A test-only fake gate must never ship as a production configuration.

- [ ] Write failing HTTP tests for health, method/content type/shape/size errors, unpaid 402, and no protected result before settlement.
- [ ] Run focused tests and confirm failure.
- [ ] Implement the adapter and English error schema, including non-sensitive request outcome logs.
- [ ] Run focused and full tests; commit and update checkpoint.

### Task 5: Production Nano Payment Gate

**Files:** Create `src/payment.ts`, `test/payment.test.ts`; modify `src/server.ts`, `.env.example`, `docs/SECURITY.md`.

**Interfaces:** Implements Task 4's `PaymentGate` using the pinned protocol package and Task 1 wire contract. Validates network, amount, recipient, resource binding, verification, settlement, and protocol-specific replay behavior.

- [ ] Write failing adapter tests for correct unpaid challenge, invalid proof, wrong network/amount/address/resource, facilitator outage, failed settlement, replay behavior, and one successful paid result with required response metadata.
- [ ] Run focused tests and confirm failure.
- [ ] Implement the package adapter with public address, price, and facilitator configuration only; keep seeds/private keys absent.
- [ ] Run focused, full and package security/secret checks; commit and update checkpoint.

### Task 6: Public Release and Pursekeeper Acceptance

**Files:** Modify `README.md`, `docs/OPERATIONS.md`, `docs/PURSEKEEPER_ACCEPTANCE.md`, `docs/ROADMAP.md`, `docs/checkpoints/CHECKPOINT_CURRENT.md`; create historical checkpoints for material milestones.

**Interfaces:** Produces public HTTPS URLs for health and paid resource, commit SHA, sanitized 402 evidence, and first paid result evidence. Document the 14-day start only when externally confirmed.

- [ ] Deploy the pinned commit to the provider selected in Task 1 with public configuration and no secret wallet material.
- [ ] Externally request health, an unpaid valid payload, invalid payloads, and compare the sanitized challenge with Task 1 examples.
- [ ] Submit the endpoint to Pursekeeper; observe its paid call and confirm the useful result and payment metadata.
- [ ] Record exact timestamps, availability baseline, incidents and customer confirmation in the acceptance document; update roadmap/checkpoint and commit.
- [ ] Track the 14-day reachability window in short blocks; record second tranche only when confirmed.

## Self-review
The tasks cover parsing, output, payment, HTTP, deployment and external acceptance. Task 1 resolves protocol facts before integration. Interfaces and checks are explicit; no operational success is assumed. The five review risks above have corresponding test steps. No application code exists at plan creation.
