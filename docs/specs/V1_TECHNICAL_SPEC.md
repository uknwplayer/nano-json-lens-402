# V1 Technical Specification

**Status:** design approved by the operator on 2026-09-26; external integration gates remain open. **Date:** 2026-09-26. Request parsing and analysis are implemented; HTTP, payments and deployment remain pending.

## Purpose and acceptance
Provide a public, useful, deterministic JSON analysis endpoint paid in Nano mainnet, with no paid upstream dependency. Success requires an unpaid HTTP 402 challenge advertising a price and receiving address, a successful Pursekeeper-paid call returning real analysis, public payment code, and 14 days of reachability. These are external acceptance criteria, not evidence of completion.

## Public HTTP contract
- `POST /api/lens` accepts `application/json`, UTF-8. Exactly one of `{ "document": <JSON value> }` or `{ "before": <JSON value>, "after": <JSON value> }`; the top-level request is an object with no extra fields. Any JSON value, including `null`, is a valid analyzed value.
- `GET /health` returns `200` with `{ "status": "ok", "version": "1" }` only when the process can answer HTTP requests. It does not claim payment facilitator availability. No input document is logged or stored.
- A valid unpaid request receives HTTP `402` with the selected Nano x402 dialect, mainnet, exact price, and public pay-to address. The payment challenge must be bound to this resource and validated against the request according to the selected implementation. Invalid input is rejected before payment with the error schema below, avoiding charges for unusable requests.
- A paid request is processed only after protocol verification and successful settlement. Return `200` JSON and the protocol's payment response header. Verification or settlement failure must never expose the useful result. No mock or success-by-header shortcut in production.

## Analysis output v1
Single mode returns `{ "version": 1, "mode": "document", "analysis": { "canonicalJson": string, "sha256": lowercaseHex, "utf8Bytes": integer, "maxDepth": integer, "objects": integer, "arrays": integer, "keys": integer, "paths": [{ "pointer": string, "type": string }] } }`. Comparison mode returns `{ "version": 1, "mode": "compare", "before": analysis, "after": analysis, "changes": [{ "pointer": string, "kind": "added" | "removed" | "typeChanged" | "valueChanged", "beforeType"?: string, "afterType"?: string }] }`.

Canonical JSON is defined for v1 as UTF-8 serialized JSON with object keys sorted by Unicode code-point order, arrays in input order, no insignificant whitespace, standard JSON string escapes, and finite JSON numbers serialized by the chosen implementation. Hash is SHA-256 over those exact UTF-8 bytes. This is a service-specific canonical form, not a claim of RFC 8785 compliance. Duplicate member names in raw JSON are rejected rather than silently overwritten. `maxDepth` counts root at 0 and each object/array child at +1; primitive root is 0. `keys` counts all object member occurrences. `paths` includes root pointer `""` and all descendants; use RFC 6901 escaping (`~` -> `~0`, `/` -> `~1`), sorted by pointer. Types: `null`, `boolean`, `number`, `string`, `object`, `array`. Array changes are index based; no move detection. A `typeChanged` entry replaces descendant changes at that pointer; equal types with changed primitive values emit `valueChanged`; additions/removals emit one entry at the highest changed subtree. Sort changes by pointer, then kind. Compare full canonical values for equality but do not echo changed primitive values in the diff.

## Bounds and errors
Start with a 64 KiB raw request body cap, 1,000 nodes per analyzed document, 32 maximum depth, 128 KiB maximum response body, and a bounded processing timeout. All caps must be enforced before unbounded recursion or response allocation. A comparison counts each side separately. If result exceeds the response cap, return a clear error before settlement; validate all response bounds in a preflight computation, but do not return the analysis until payment succeeds. Proposed error body: `{ "error": { "code": string, "message": string } }`. `400` malformed JSON / duplicate keys / invalid shape; `413` size, node, depth or result limit; `415` unsupported content type; `402` payment required or rejected with protocol-specific metadata; `503` facilitator unavailable. Do not include submitted values, secrets, or payment proof in errors or logs.

## Payment integration decision gate

Block 004 update: [primary-source and live discovery evidence](../protocol/NANO_402_WIRE_EXAMPLES.md) now confirms package 0.3.0 and the facilitator's advertised network. The requirements below remain gates until integration tests, address and deployment configuration are complete.
Block 004 verified the package metadata, source example, license and live facilitator discovery. Runtime integration, replay handling and request binding are still unverified. Before writing the payment adapter, inspect the package's primary source and a current runnable example, pin a version, verify `nano:mainnet` syntax and verify/settle semantics, then amend this spec with exact wire examples. A public Nano receiving address must be confirmed with the operator or an already authorized project source. Never generate or publish a seed. Proposed initial price is `0.01 XNO` per call, pending explicit confirmation and correct raw-unit conversion.

## Runtime and deployment decision gate
Use a Node-compatible TypeScript runtime behind HTTPS. Choose the provider only after checking zero-cost limits, public reachability, request body handling, compatibility with the payment package, and operational health for 14 days. A local passing test is not evidence of public reachability. Public logs contain only request ID, outcome, duration, and build version. No document bodies, wallet secrets, or complete payment proofs.

## Verification plan and release gates
1. Unit fixtures: equivalent reordered objects share hashes; arrays preserve order; Unicode keys and escaped pointers; primitive roots; duplicate keys; depth/node/size boundaries; comparison changes and deterministic ordering.
2. HTTP integration: malformed and oversized requests rejected without charging; unpaid valid request produces a protocol-correct 402; failed verification/settlement never delivers analysis; paid call returns the promised result and payment response metadata; `GET /health` works.
3. Public acceptance: inspect a sanitized 402 response, have Pursekeeper perform the first paid call, verify real output, record URL/commit/time and availability observations. The 14-day window starts only when Pursekeeper confirms the relevant entry/start condition.

## Review decisions needed before implementation
Confirm public Nano receiving address, price, payment package/facilitator wire contract, deployment provider, and license. These remain unresolved and must not be represented as fixed. The operator approved this design and its implementation plan. Open external parameters must be resolved and recorded before production payment integration.
