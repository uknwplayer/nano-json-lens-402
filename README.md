# Nano JSON Lens 402

A public, deterministic JSON structural analysis service protected by Nano payments through HTTP 402.

## Goal
Provide a useful endpoint for agents and automation pipelines that accepts bounded JSON documents, charges a small amount in Nano mainnet, and returns reproducible structural analysis without relying on paid analysis APIs.

The project is being validated through Pursekeeper's seller newcomer program: a valid public 402 challenge, a successful paid call that delivers the promised utility, and continued public availability.

## Project Language
**English is the official language of this project.** Repository content, source code, comments, API fields, public errors, operational logs, documentation, releases, issues, and customer-facing communication must be written in English.

## Current Status
**Service state:** public, payment-capable, listed by Pursekeeper, and in the confirmed 14-day reachability window.

- Runtime: Cloudflare Workers.
- Persistent payment state: Cloudflare D1.
- Public endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Health endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev/health`.
- Paid endpoint: `POST /api/lens`.
- Network/scheme: `nano:mainnet` / `exact`.
- Price: `0.01 XNO`.
- Source-controlled paid traffic gate: enabled.
- Current payment-capable Cloudflare version: `a6c0291a-b90e-447a-949c-8090f382837a`.
- Reviewed deployed source: `1a34893a5fc9142645adf612af2a51601f5701bf`.
- Active implementation branch: `task5-production-nano-payment`.
- Current automated verification suite: 93 tests plus typecheck, Wrangler dry-run, dependency-tree validation, and production dependency audit.

Pursekeeper completed the seller checks on 2026-09-27. The unpaid request returned the expected 402 contract, Pursekeeper's first real paid call settled through its facilitator and received HTTP 200 with the promised JSON Lens result, the seller was listed as `uknwplayer-json-lens`, and the first-stage 10 XNO credit was recorded as ledger entry 260.

The 14-day reachability clock started on 2026-09-27. The second-stage 15 XNO is due after the probe has remained successful for 14 days, with Pursekeeper identifying 2026-10-11 as the relevant completion date, provided the payment-taking code remains public.

Always consult:
- [Current checkpoint](docs/checkpoints/CHECKPOINT_CURRENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Operations](docs/OPERATIONS.md)
- [Security](docs/SECURITY.md)
- [Pursekeeper acceptance criteria](docs/PURSEKEEPER_ACCEPTANCE.md)
- [Execution ledger](docs/EXECUTION_LEDGER.md)
- [Whitepaper](docs/WHITEPAPER.md)
- [Architecture](docs/ARCHITECTURE.md)
- [V1 specification](docs/specs/V1_TECHNICAL_SPEC.md)
- [Implementation plan](docs/superpowers/plans/2026-09-26-nano-json-lens-v1.md)
- [Paid rollout plan](docs/superpowers/plans/2026-09-26-paid-rollout-and-pursekeeper-submission.md)
- [Protocol evidence](docs/protocol/NANO_402_WIRE_EXAMPLES.md)
- [Continuity rules](docs/CONTINUITY_RULES.md)

## Service Input
Primary input:

```json
{"document":{"example":true}}
```

Comparison mode:

```json
{"before":{"a":1},"after":{"a":2}}
```

## Service Output
After confirmed payment, supported requests can return:
- canonical JSON with sorted keys;
- SHA-256 digest;
- size and depth metrics;
- object, array, and key counts;
- JSON path/type map;
- deterministic structural diff for before/after requests;
- bounded errors for invalid or oversized input.

Protected output is not released before successful payment settlement.

## HTTP Endpoints
- `POST /api/lens` — paid JSON Lens resource. An unpaid valid request returns HTTP 402 with the Nano payment requirements.
- `GET /health` — free public availability check; expected body is `{"status":"ok","version":"1"}`.

## Payment Configuration
The deployed service currently advertises:
- scheme: `exact`;
- network: `nano:mainnet`;
- asset: `XNO`;
- price: `0.01 XNO` = `10000000000000000000000000000` raw;
- public receive address: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`;
- facilitator: `https://facilitator.pursekeeper.dev`.

The receiving address and D1 UUID are public configuration. Wallet seeds, private keys, and Cloudflare credentials must never be committed or pasted into repository content.

## Security and Settlement Model
1. Validate and bound input before payment processing.
2. Reject malformed payment proof material before settlement.
3. Use durable D1 state for replay, concurrency, entitlement, and settlement-state handling.
4. Never use the in-memory payment store for payment-taking production traffic.
5. Deliver protected output only after confirmed settlement.
6. Treat ambiguous settlement as fail-closed and reconcile before any retry.
7. Never introduce a seller-side Nano seed/private key merely to self-pay.

`requestDigest` is service-local request metadata; it is not described as a cryptographic binding between the Nano block and submitted JSON. Nano settlement remains authoritative for payment finality.

## Availability and Pursekeeper State
The Worker is public, HTTPS-enabled, D1-backed, payment-capable, and listed by Pursekeeper.

Pursekeeper reported the three production checks ran at 04:28–04:30 UTC on 2026-09-27:
- unpaid `POST /api/lens` returned HTTP 402 with the expected `PAYMENT-REQUIRED` Nano mainnet terms;
- the first real paid call settled through the Pursekeeper facilitator and returned HTTP 200 with canonical form, SHA-256, size/depth metrics, and path information for the submitted document;
- `/health` answered and the paid route remained reachable under the seller probe.

First paid-call send block:
`BB290B0B406FF6705B42430C4B0082EF9DEC3792FA34825BDE06DC9CADAF635E`

Seller listing: `uknwplayer-json-lens` at `https://pursekeeper.dev/sellers`.

First-stage credit: 10 XNO, Pursekeeper ledger entry 260.

Confirmed 14-day window:
- start: 2026-09-27;
- expected completion date identified by Pursekeeper: 2026-10-11;
- requirement: keep the reachability probe passing and the payment-taking code public.

If the public `payTo` or paid route changes, Pursekeeper must be told the same day so the listing does not become stale.

## Local Development
Requires Node.js 24 or newer.

```bash
npm ci
npm test
npm run typecheck
```

For the same Worker bundle validation used by CI:

```bash
npx --yes wrangler@4.137.0 deploy --dry-run
```

Production dependency audit:

```bash
npm audit --omit=dev --audit-level=moderate
```

## Implementation Notes
`src/request.ts` validates bounded UTF-8 JSON input. It uses pinned `jsonc-parser` 3.3.1 with comments and trailing commas disabled, checks duplicate decoded keys, and uses native `JSON.parse` for values. Numeric values use JavaScript binary64 semantics; non-finite results are rejected.

`src/lens.ts` implements deterministic canonicalization and analysis. Keys and pointers use Unicode code-point order; array order is preserved. SHA-256 covers the canonical JSON UTF-8 bytes. Comparison reports structural changes without copying changed values into change entries. Results over 128 KiB are rejected.

`src/server.ts` implements the Fetch HTTP handler. Body reads are capped at 65536 bytes and 5000 ms by default; payment-proof headers are bounded. Responses use `Cache-Control: no-store`, and logs are limited to bounded operational metadata.

`src/worker.ts` is the Cloudflare production entrypoint. Production payment state is provided by the `PAYMENT_DB` D1 binding, with schema migration in `migrations/0001_payment_state.sql`.

## Principles
1. Never place a wallet seed or private key in source code.
2. No paid analysis API is required to generate the result.
3. Results are deterministic and testable.
4. Payment is verified and settled before protected output is delivered.
5. Payment-taking code remains public in this repository.
6. Every work block updates `docs/checkpoints/CHECKPOINT_CURRENT.md`.
7. Planned work must never be presented as completed work.

## Resuming Work
A new chat or agent must begin with `docs/checkpoints/CHECKPOINT_CURRENT.md`, then `docs/ROADMAP.md`, followed by `docs/OPERATIONS.md` and `docs/SECURITY.md` when the task touches production or payments.

## License and Versioning
The license and final release/versioning policy will be completed before the V1 release/tag.