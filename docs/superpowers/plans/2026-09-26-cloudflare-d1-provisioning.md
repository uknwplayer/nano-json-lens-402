# Cloudflare D1 Remote Provisioning Plan

> **For agentic workers:** use the existing execution-plan/TDD workflow. This block must stop before Worker deployment or paid traffic.

**Goal:** Provision or reuse the intended Cloudflare D1 database, apply the existing payment-state migration, validate non-payment write/read/CAS behavior remotely, and commit only the public D1 database ID into `wrangler.jsonc`.

**Architecture:** Use a manually dispatched GitHub Actions workflow authenticated with repository secrets. Keep credentials out of the repository and out of logs. The workflow is idempotent by database name, uses exact Wrangler `4.137.0`, applies migrations remotely, performs a synthetic state-store probe, removes the probe row, and updates only the zero UUID placeholder. It must not deploy the Worker or call the Pursekeeper facilitator.

**External boundary:** No Cloudflare connector is available in this ChatGPT session and GitHub's connected app intentionally cannot read or write Actions secrets. The operator must therefore create the required repository secrets in GitHub before the manual workflow can run.

## Security constraints
- Never paste a Cloudflare API token into chat, source files, workflow inputs, commit messages, artifacts, or logs.
- Use a dedicated least-privilege D1 provisioning token where possible; do not reuse a broad global API key.
- Store the Cloudflare account ID and D1 token as GitHub Actions secrets.
- Manual `workflow_dispatch` only. No provisioning on push, pull request, or schedule.
- Require the literal confirmation input `PROVISION_D1` before any remote mutation.
- Reuse exactly one existing database named `nano-json-lens-402-payment-state`; fail if duplicates are observed.
- Never silently replace one non-placeholder D1 database ID with another.
- Do not deploy the Worker in this block.
- `PAID_TRAFFIC_ENABLED` remains source-controlled `false`.
- No payment proof, facilitator verify/settle, Nano transfer, or 14-day window start.

## Required GitHub secrets
- `CLOUDFLARE_ACCOUNT_ID`: the intended Cloudflare account ID.
- `CLOUDFLARE_D1_API_TOKEN`: dedicated token exported to Wrangler as `CLOUDFLARE_API_TOKEN` only inside the provisioning job.

Cloudflare documents API token + account ID authentication for non-interactive CI. D1 creation requires write permission for D1 resources. Scope the token to the intended account only.

## Task 1 — Safe config finalization contract
- [x] Add `test/cloudflare-provisioning.test.ts` first.
- [x] Verify RED because `scripts/cloudflare/d1-config.ts` does not exist.
- [ ] Implement a JSONC-preserving helper that accepts only one expected binding/database pair.
- [ ] Accept only a valid non-placeholder UUID.
- [ ] Permit zero-placeholder -> real ID and same-ID idempotency only.
- [ ] Reject rebinding from one real ID to another.
- [ ] Run full CI GREEN.

## Task 2 — Manual remote provisioning workflow
**Create:** `.github/workflows/cloudflare-d1-provision.yml`

- [ ] Trigger only via `workflow_dispatch`.
- [ ] Require `confirmation == PROVISION_D1`.
- [ ] Fail before network mutation when required secrets are absent.
- [ ] Use Node 24 and exact `wrangler@4.137.0`.
- [ ] List D1 databases as JSON and reuse the exact intended name when present.
- [ ] Create the intended D1 database only when absent.
- [ ] Read the authoritative UUID with `wrangler d1 info --json`.
- [ ] Finalize `wrangler.jsonc` through the tested helper.
- [ ] List and apply remote migrations.
- [ ] Verify the migrated `payment_operations` table exists.
- [ ] Perform a synthetic non-payment insert/read/CAS/read/delete probe against the real remote database.
- [ ] Remove the synthetic row even when validation fails when cleanup is still possible.
- [ ] Commit and push only the public `wrangler.jsonc` database ID after all remote validation succeeds.
- [ ] Write a bounded GitHub step summary containing database name/ID and validation status, never credentials.

## Task 3 — Documentation and checkpoint
- [ ] Update `docs/OPERATIONS.md` with secret names, least-privilege guidance, workflow use, and failure recovery.
- [ ] Update `docs/SECURITY.md` with provisioning credential boundaries.
- [ ] Update `docs/ROADMAP.md` and `docs/EXECUTION_LEDGER.md`.
- [ ] Update `docs/checkpoints/CHECKPOINT_CURRENT.md`.
- [ ] Create historical checkpoint `docs/checkpoints/history/2026-09-26_016.md`.
- [ ] Run final branch CI.

## External completion gate
Block 016 cannot truthfully claim remote D1 provisioning until the operator has configured both GitHub secrets and manually dispatched the provisioning workflow. If that account-side action is still absent, close the block as **provisioning automation GREEN / remote provisioning waiting on operator authentication**, not as deployed or provisioned.
