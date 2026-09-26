# Nano JSON Lens 402

A public, deterministic JSON structural analysis service protected by Nano payments through HTTP 402.

## Goal
Build a useful endpoint for agents and automation pipelines that accepts JSON documents, charges a small amount in Nano mainnet, and returns reproducible structural analysis without relying on paid APIs.

The project is also designed to satisfy Pursekeeper's seller newcomer credit requirements: a valid 402 challenge, a successful first paid call, and continued public availability.

## Project Language
**English is the official language of this project.** Repository content, source code, comments, API fields, public errors, operational logs, documentation, releases, issues, and customer-facing communication must be written in English.

## Status
**Current phase:** parser, analysis core and Fetch HTTP handler implemented and tested; Nano adapter next.
**Endpoint implementation:** local HTTP handler complete; real Nano payments and hosting pending.
**Deployment:** not started.

Always consult:
- [Current checkpoint](docs/checkpoints/CHECKPOINT_CURRENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Whitepaper](docs/WHITEPAPER.md)
- [Architecture](docs/ARCHITECTURE.md)
- [V1 specification](docs/specs/V1_TECHNICAL_SPEC.md)
- [Implementation plan](docs/superpowers/plans/2026-09-26-nano-json-lens-v1.md)
- [Protocol evidence](docs/protocol/NANO_402_WIRE_EXAMPLES.md)
- [Pursekeeper acceptance criteria](docs/PURSEKEEPER_ACCEPTANCE.md)
- [Continuity rules](docs/CONTINUITY_RULES.md)

## Planned Service
Primary input:
```json
{"document":{"example":true}}
```

Comparison mode:
```json
{"before":{"a":1},"after":{"a":2}}
```

Planned output:
- canonical JSON with sorted keys;
- SHA-256 digest;
- size and depth metrics;
- object, array, and key counts;
- JSON path/type map;
- structural diff for before/after;
- clear errors for invalid or oversized input.

## Planned Endpoints
- `POST /api/lens` — paid resource.
- `GET /health` — public availability check.

## Principles
1. Never place a wallet seed or private key in source code.
2. No paid API is required to generate the result.
3. Results are deterministic and testable.
4. Payment is verified before the paid result is delivered.
5. Payment-taking code remains public in this repository.
6. The current checkpoint is updated at the end of **every work block**.

## Resuming Work
A new chat or agent must begin with `docs/checkpoints/CHECKPOINT_CURRENT.md`, followed by `docs/ROADMAP.md`. Planned work must never be treated as completed work.

## License and Versioning
The license and versioning policy will be defined before the first operational public release.

## Local Development
Requires Node.js 24 or newer.

```bash
npm ci --ignore-scripts
npm test
npm run typecheck
```

`src/request.ts` validates bounded UTF-8 JSON input without network or payment operations. It exports `parseLensRequest`, `LensRequest`, `JsonValue`, and `LensError`. The parser uses pinned `jsonc-parser` 3.3.1 with comments and trailing commas disabled, checks duplicate decoded keys, then uses native `JSON.parse` for the value. Numeric values use JavaScript binary64 semantics; non-finite results are rejected. Exact arbitrary-precision decimal preservation is not provided.

Current verification: 36 tests passing (14 parser + 10 analysis + 12 HTTP). A Fetch handler exists; no hosted service or listening-server bootstrap is configured yet.

## Local Analysis Example

```bash
node --input-type=module -e 'import { buildLensResult } from "./src/lens.ts"; console.log(JSON.stringify(buildLensResult({mode:"document",document:{b:2,a:1}}),null,2))'
```

`src/lens.ts` exports `analyze`, `compare`, and `buildLensResult`. Keys and pointers use Unicode code-point order; array order is preserved. The SHA-256 covers the canonical JSON's UTF-8 bytes. Comparison reports added, removed, type-changed and value-changed paths, without copying values into the change entries. Analysis results still contain the canonical documents requested by the caller. Results over 128 KiB are rejected before payment integration can deliver them.

## HTTP Handler Integration

`createHandler({ resourceUrl, paymentGate, log?, bodyTimeoutMs? })` from `src/server.ts` returns `(request: Request) => Promise<Response>` for a compatible Fetch runtime. It implements free `GET /health` and paid `POST /api/lens`. A runtime adapter/bootstrap and a real `PaymentGate` are still required to serve public traffic.

The payment adapter must implement `challenge(context)` and `verifyAndSettle(context, proof)`. Context contains the configured public resource URL and SHA-256 of the raw request bytes. The digest alone is not proof of payment binding: the production adapter must enforce replay, binding and recovery rules. A settled result requires a successful Nano-mainnet receipt with a 64-hex-character transaction hash. This shape check does not replace facilitator verification.

Body reads are capped at 65536 bytes and 5000 ms by default; payment proof headers at 16384 characters. Responses use `Cache-Control: no-store`. Logs contain only generated request ID, HTTP status, duration and API version. Test payment adapters live only in `test/server.test.ts`; there is no built-in production payment fallback. `.env.example` is a configuration template for the future bootstrap, not an active deployment.
