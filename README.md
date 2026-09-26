# Nano JSON Lens 402

A public, deterministic JSON structural analysis service protected by Nano payments through HTTP 402.

## Goal
Build a useful endpoint for agents and automation pipelines that accepts JSON documents, charges a small amount in Nano mainnet, and returns reproducible structural analysis without relying on paid APIs.

The project is also designed to satisfy Pursekeeper's seller newcomer credit requirements: a valid 402 challenge, a successful first paid call, and continued public availability.

## Project Language
**English is the official language of this project.** Repository content, source code, comments, API fields, public errors, operational logs, documentation, releases, issues, and customer-facing communication must be written in English.

## Status
**Current phase:** documentation foundation complete; technical specification next.  
**Endpoint implementation:** not started.  
**Deployment:** not started.

Always consult:
- [Current checkpoint](docs/checkpoints/CHECKPOINT_CURRENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Whitepaper](docs/WHITEPAPER.md)
- [Architecture](docs/ARCHITECTURE.md)
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
