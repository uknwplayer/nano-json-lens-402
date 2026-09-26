# Agent Instructions — Nano JSON Lens 402

## Project communication
- Repository artifacts, code, comments, commits, and operational documentation are written in English.
- Operator conversation may be in Portuguese.
- Work only on `task5-production-nano-payment` unless the operator explicitly authorizes integration elsewhere.
- Keep `main` untouched until Task 5 is independently verified and explicitly integrated.

## Cloudflare tooling
- Deployment target: Cloudflare Workers.
- Persistent payment-state target: Cloudflare D1.
- Worker entrypoint: `src/worker.ts`.
- D1 binding: `PAYMENT_DB`.
- D1 database name: `nano-json-lens-402-payment-state`.
- Wrangler version used by project CI: `4.137.0`.
- Migration directory: `migrations`.
- Before changing Cloudflare configuration, consult current official Cloudflare documentation or the Cloudflare Skills/MCP when available.
- Prefer Wrangler for Worker development, deployment, and D1 migration commands.
- Prefer the Cloudflare API MCP for account-level resource operations when the agent has been connected through OAuth.

## Cloudflare agent setup
For OpenAI Codex, the current official Cloudflare setup is:
1. Install the Cloudflare plugin from Codex `/plugins` when available. This installs Cloudflare Skills and registers Cloudflare MCP servers.
2. If the Cloudflare MCP must be added manually, use:
   `codex mcp add cloudflare --url https://mcp.cloudflare.com/mcp`
3. Complete Cloudflare OAuth in the browser when first prompted and grant only the permissions needed for this project.
4. Confirm the MCP connection with `codex mcp list` and `/mcp` in the Codex TUI.

Never put Cloudflare API tokens, account credentials, Nano seeds, or private keys in this repository, chat logs, workflow inputs, artifacts, or commits.

## Payment rollout security
- `PAID_TRAFFIC_ENABLED` in `src/worker.ts` must remain source-controlled `false` until all documented deployment/security gates are independently GREEN.
- Environment variables must not bypass the source-controlled paid-traffic gate.
- Do not submit a real payment proof, call live facilitator `verify`/`settle`, or cause a Nano transfer unless a later explicitly authorized block reaches that gate.
- No Nano seed/private key is required or permitted on the server.
- Production payment composition requires bootstrap state `ready` and a `PaymentStateStore` with `productionSafe === true`.
- `MemoryPaymentStateStore` is test/development only.
- Missing/invalid D1 state must fail closed.
- `GET /health` remains independent of D1 and x402 initialization.
- Settlement confirmation must persist state and bounded receipt atomically.
- Do not automatically retry ambiguous settlement writes.
- Stable replay identity comes from validated Nano state-block material, not serialized proof-envelope bytes.
- `requestDigest` is local mismatch-detection metadata and is not cryptographic binding of the Nano payment to the JSON body.

## Verification requirements
Before claiming a Cloudflare-related change is complete, run fresh evidence for all applicable checks:
- `npm ci`
- `npm test`
- `npm run typecheck`
- `npx --yes wrangler@4.137.0 deploy --dry-run`
- `npm ls --all`
- `npm audit --omit=dev --audit-level=moderate`

For account-side D1/deployment work, also verify the real remote resource rather than treating a Wrangler dry-run as deployment evidence.

## Continuity
- Update `docs/checkpoints/CHECKPOINT_CURRENT.md` at every work-block closure.
- Create a historical checkpoint for material milestones.
- Update `docs/ROADMAP.md`, `docs/EXECUTION_LEDGER.md`, `docs/SECURITY.md`, and `docs/OPERATIONS.md` when their state materially changes.
- Never claim a real D1 resource, Worker deployment, Pursekeeper paid-call acceptance, or 14-day availability-window start without direct evidence.
