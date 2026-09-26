# Cloudflare D1 Remote Provisioning Plan

> **For agentic workers:** use the existing execution-plan/TDD workflow. This provisioning block stops before Worker deployment or paid traffic.

**Goal:** Provision or reuse the intended Cloudflare D1 database, apply the existing payment-state migration, validate non-payment write/read/CAS behavior remotely, and commit only the public D1 database ID into `wrangler.jsonc`.

**Architecture:** Use GitHub Actions authenticated with repository secrets. Keep credentials out of the repository and out of logs. The permanent workflow is idempotent by database name, uses exact Wrangler `4.137.0`, applies migrations remotely, performs a synthetic state-store probe, removes the probe row, and updates only the zero UUID placeholder. It must not deploy the Worker or call the Pursekeeper facilitator.

**External boundary:** No Cloudflare connector is available in this ChatGPT session and GitHub's connected app intentionally cannot read or write Actions secrets. The operator therefore created the required repository secrets directly in GitHub.

## Security constraints
- Never paste a Cloudflare API token into chat, source files, workflow inputs, commit messages, artifacts, or logs.
- Use a dedicated least-privilege D1 provisioning token; do not reuse a broad global API key.
- Store the Cloudflare account ID and D1 token as GitHub Actions secrets.
- Permanent provisioning workflow remains manual `workflow_dispatch` only.
- Require the literal confirmation input `PROVISION_D1` on the permanent workflow.
- Reuse exactly one existing database named `nano-json-lens-402-payment-state`; fail if duplicates are observed.
- Never silently replace one non-placeholder D1 database ID with another.
- Do not deploy the Worker in this block.
- `PAID_TRAFFIC_ENABLED` remains source-controlled `false`.
- No payment proof, facilitator verify/settle, Nano transfer, or 14-day window start.

## Required GitHub secrets
- `CLOUDFLARE_ACCOUNT_ID`: the intended Cloudflare account ID.
- `CLOUDFLARE_D1_API_TOKEN`: dedicated D1 token exported to Wrangler as `CLOUDFLARE_API_TOKEN` only inside remote D1 steps.

## Task 1 — Safe config finalization contract
- [x] Add `test/cloudflare-provisioning.test.ts` first.
- [x] Verify RED because `scripts/cloudflare/d1-config.ts` does not exist.
- [x] Implement a JSONC-preserving helper that accepts only one expected binding/database pair.
- [x] Accept only a valid non-placeholder UUID.
- [x] Permit zero-placeholder -> real ID and same-ID idempotency only.
- [x] Reject rebinding from one real ID to another.
- [x] Run full CI GREEN.

## Task 2 — Guarded remote provisioning
Permanent workflow: `.github/workflows/cloudflare-d1-provision.yml`

- [x] Permanent workflow triggers only via `workflow_dispatch`.
- [x] Require `confirmation == PROVISION_D1` on the permanent workflow.
- [x] Fail before network mutation when required secrets are absent.
- [x] Use Node 24 and exact `wrangler@4.137.0`.
- [x] List D1 databases as JSON and reuse the exact intended name when present.
- [x] Create the intended D1 database only when absent.
- [x] Resolve and validate the authoritative UUID from the post-create/list result.
- [x] Finalize `wrangler.jsonc` through the tested helper.
- [x] List and apply remote migrations.
- [x] Verify the migrated `payment_operations` table exists.
- [x] Perform a synthetic non-payment insert/read/CAS/read/delete probe against the real remote database.
- [x] Remove the synthetic row on the success path and attempt cleanup on failure.
- [x] Commit and push only the public `wrangler.jsonc` database ID after all remote validation succeeds.
- [x] Refuse to push if the isolated target branch moved during provisioning.
- [x] Write a bounded GitHub step summary containing database name/ID and validation status, never credentials.
- [x] Add a regression test that locks the permanent workflow to manual dispatch, explicit confirmation, dedicated secret naming, challenge-only source state, migration/probe behavior, and no Worker deploy command.

### Initial real provisioning execution
GitHub does not surface a workflow that exists only on a non-default branch in the normal manual Actions UI. The first real provisioning therefore used a one-shot launcher on an isolated temporary branch rather than modifying `main`.

The launcher:
- [x] was push-triggered only by creation of its own workflow file on the temporary branch;
- [x] checked out `task5-production-nano-payment` at reviewed SHA `7eb9ffc5011019e31093181278ecc2fcb36aaa56`;
- [x] verified the target branch had not moved before any Cloudflare mutation;
- [x] verified both GitHub Actions secrets were present;
- [x] verified `PAID_TRAFFIC_ENABLED === false`;
- [x] created D1 database `nano-json-lens-402-payment-state`;
- [x] resolved public UUID `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`;
- [x] applied `0001_payment_state.sql` remotely;
- [x] passed the synthetic write/read/CAS/read/delete probe;
- [x] rechecked target-branch immutability before push;
- [x] committed only the public UUID in commit `21c86dfbdb5460bb1596f11cd2aefced6d443244`;
- [x] did not deploy the Worker or call Pursekeeper verify/settle;
- [x] completed successfully in Actions run `36280708030`, job `108511852925`.

The temporary launcher branch heads were normalized to the reviewed post-provisioning commit after success so the one-shot workflow is no longer present at their heads.

## Task 3 — Documentation and checkpoint
- [x] Update `docs/OPERATIONS.md` with credential boundaries, workflow use, remote evidence, and next deployment stage.
- [x] Update `docs/SECURITY.md` with provisioning credential boundaries and one-shot execution constraints.
- [x] Update `docs/ROADMAP.md` for real D1 completion.
- [x] Update `docs/checkpoints/CHECKPOINT_CURRENT.md`.
- [x] Create historical checkpoint `docs/checkpoints/history/2026-09-26_017.md`.
- [ ] Append cumulative `docs/EXECUTION_LEDGER.md` in a later documentation-maintenance pass if needed; the Block 016 and 017 checkpoints are authoritative meanwhile.
- [ ] Run final branch CI on the post-provisioning documentation head.

## External completion gate
**Satisfied for D1 provisioning.** Direct evidence now exists for the real D1 resource, remote migration, remote synthetic state probe, and committed public UUID. This plan does not authorize Worker deployment or paid traffic. The next block is challenge-only Worker deployment with `PAID_TRAFFIC_ENABLED === false`.
