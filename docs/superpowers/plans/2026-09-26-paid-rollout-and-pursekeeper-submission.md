# Controlled Paid Rollout and Pursekeeper Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely transition the already-public challenge-only Worker into payment-taking mode and make the first real paid call the Pursekeeper listing check, without introducing a buyer seed/private key into this project.

**Architecture:** Keep the existing production payment gate, D1 state backend, pinned x402 adapter, and source-controlled rollout gate. Prove the paid runtime path locally before changing the entrypoint, use a separate guarded payment-enable deployment workflow, redeploy only after explicit operator authorization, then submit the live endpoint to Pursekeeper for its own first paid call. Treat any ambiguous settlement as terminal until reconciled; do not automatically re-settle.

**Tech Stack:** TypeScript, Node 24 test runner, `@x402/core` 2.24.0, `@x402nano/exact` 0.3.0, Cloudflare Workers + D1, Wrangler 4.137.0, GitHub Actions.

**Spec:** `docs/PURSEKEEPER_ACCEPTANCE.md`

## Global Constraints

- Project artifacts and code are English; operator conversation is Portuguese.
- Work only on `task5-production-nano-payment`; keep `main` untouched.
- Price remains `0.01 XNO` = `10000000000000000000000000000` raw.
- Network/scheme remain `nano:mainnet` / `exact`.
- Facilitator remains `https://facilitator.pursekeeper.dev`.
- Public payTo remains `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.
- Production state remains the existing D1 `PAYMENT_DB` binding.
- Never store or request a Nano seed/private key for the seller service or a self-payment test.
- Do not submit the endpoint to Pursekeeper while the deployed Worker is challenge-only.
- Do not enable paid traffic without explicit operator authorization in the execution block that performs the source change/deploy.
- Unknown verify/settle transport state fails closed; no automatic settlement retry.
- Every implementation block ends with checkpoint/roadmap/ledger evidence and fresh full CI.

## Review Focus

- A valid-looking proof while paid traffic is disabled must still be blocked before facilitator verify/settle.
- When paid traffic is enabled, malformed proof material must fail safely without protected output or settlement.
- One accepted Nano block must not settle twice under retries or concurrency; existing replay/idempotency tests remain mandatory.
- A D1 error or ambiguous settlement must return 503 without protected output and without an automatic second settlement attempt.
- Deploying the payment-capable Worker must not silently change price, payTo, network, facilitator, D1 binding, or source-controlled rollout state.

---

### Task 1: Prove the payment-enabled Worker runtime locally without changing the production entrypoint

**Files:**
- Modify: `test/worker-runtime.test.ts`
- Use: `src/worker-runtime.ts`
- Use: `src/payment/production-gate.ts`
- Use: `src/payment/d1-store.ts`

**Interfaces:**
- Consumes: `createCloudflareWorkerRuntime({ ..., allowPaidTraffic })`.
- Produces: regression evidence that `allowPaidTraffic: true` reaches verify/settle only for a structurally valid proof and releases protected output only after confirmed settlement.

- [ ] **Step 1: Parameterize the existing Worker test helper** so tests can construct both `allowPaidTraffic: false` and `allowPaidTraffic: true` runtimes without touching `src/worker.ts`.
- [ ] **Step 2: Add a valid Nano state-block proof fixture** matching the existing `payment.test.ts` fixture shape and the request digest used by the Worker request.
- [ ] **Step 3: Add a failing payment-enabled runtime test** asserting one valid proof causes exactly one verify and one settle, returns HTTP 200, includes `payment-response`, and returns the promised analysis only after settlement.
- [ ] **Step 4: Add a failing malformed-proof test in payment-enabled mode** asserting no protected output and no settlement call.
- [ ] **Step 5: Run `npm test -- test/worker-runtime.test.ts`** and verify the new assertions fail before any production entrypoint change.
- [ ] **Step 6: Make only the minimal test/runtime fixture changes needed**; do not set `PAID_TRAFFIC_ENABLED = true` yet.
- [ ] **Step 7: Run `npm test && npm run typecheck && npx --yes wrangler@4.137.0 deploy --dry-run && npm ls --all && npm audit --omit=dev --audit-level=moderate`** and require all checks GREEN.
- [ ] **Step 8: Commit the local paid-runtime evidence.**

### Task 2: Add a separate guarded payment-enable deployment path

**Files:**
- Create: `.github/workflows/cloudflare-worker-payment-enable.yml`
- Create: `test/cloudflare-worker-payment-enable-workflow.test.ts`
- Keep unchanged: `.github/workflows/cloudflare-worker-deploy.yml` challenge-only path.

**Interfaces:**
- Consumes: GitHub secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_WORKERS_API_TOKEN`.
- Produces: manual-only deployment path that can deploy only an explicitly payment-enabled reviewed branch.

- [ ] **Step 1: Write the workflow contract test first** requiring `workflow_dispatch`, literal confirmation `ENABLE_PAID_TRAFFIC`, exact branch guard, exact Wrangler version, real D1 UUID, dedicated Workers token, and a source check that `PAID_TRAFFIC_ENABLED = true as const` before deployment.
- [ ] **Step 2: Require the test to reject any workflow containing a payment proof, seed/private key, direct `verifyPayment`, or direct `settlePayment` invocation.**
- [ ] **Step 3: Run the suite and record the intended RED because the workflow does not yet exist.**
- [ ] **Step 4: Implement the minimal payment-enable workflow.** It must run full tests/typecheck/dry-run before deploy and must never reuse the D1 provisioning token.
- [ ] **Step 5: After deploy, verify only public non-payment properties:** bounded `/health` readiness, unpaid 402 exact Nano terms, and safe rejection of deliberately malformed proof material. Do not generate a valid payment proof in CI.
- [ ] **Step 6: Run full CI and require GREEN.**
- [ ] **Step 7: Commit the guarded payment-enable deployment path.**

### Task 3: Explicitly enable payment-taking in source

**Files:**
- Modify: `src/worker.ts`
- Modify: `test/worker-runtime.test.ts`
- Update relevant security/operations docs in the same block.

**Interfaces:**
- Consumes: Task 1 paid-runtime evidence and Task 2 guarded deployment path.
- Produces: a reviewed source commit with `PAID_TRAFFIC_ENABLED = true as const`.

- [ ] **Step 1: Obtain explicit operator authorization for the paid-traffic source change and deployment.** Stop here without it.
- [ ] **Step 2: Change the production entrypoint expectation test from `false` to `true` first** and record RED.
- [ ] **Step 3: Change exactly `PAID_TRAFFIC_ENABLED` to `true as const` in `src/worker.ts`.** Do not change price, payTo, facilitator, network, D1 binding, or payment algorithms in this commit.
- [ ] **Step 4: Run the complete verification command from Task 1** and require GREEN.
- [ ] **Step 5: Review the commit diff and confirm the rollout change contains no secret material and no unrelated runtime change.**
- [ ] **Step 6: Commit the explicit paid-traffic enablement.**

### Task 4: Deploy the payment-capable Worker and validate it without spending Nano

**Files:**
- Execute: `.github/workflows/cloudflare-worker-payment-enable.yml`
- Update: `docs/checkpoints/CHECKPOINT_CURRENT.md`, `docs/SECURITY.md`, `docs/OPERATIONS.md`, `docs/EXECUTION_LEDGER.md`.

**Interfaces:**
- Consumes: reviewed paid-enabled branch commit.
- Produces: deployed payment-capable Worker that is still untested with a valid live payment proof.

- [ ] **Step 1: Run the payment-enable deployment workflow with exact confirmation `ENABLE_PAID_TRAFFIC`.**
- [ ] **Step 2: Record the Cloudflare version ID and authoritative `workers.dev` URL.**
- [ ] **Step 3: Externally require `/health` = 200 and unpaid `/api/lens` = 402 with exact network, amount, payTo, and no protected output.**
- [ ] **Step 4: Send only malformed/non-payment proof material and require safe rejection with no protected output and no `payment-response`.**
- [ ] **Step 5: Confirm the deployed source diff from the previous challenge-only version contains the intended rollout change and reviewed workflow/docs only.**
- [ ] **Step 6: Update checkpoint/security evidence. Do not call the deployment a paid-call success.**

### Task 5: Submit the live payment-capable endpoint to Pursekeeper

**Files / external evidence:**
- Gmail thread: `Eligibility question — seller newcomer credit — uknwplayer`
- Update after send: `docs/PURSEKEEPER_ACCEPTANCE.md`, checkpoint, ledger.

**Interfaces:**
- Consumes: Task 4 deployed payment-capable endpoint.
- Produces: seller submission that lets Pursekeeper perform its required unpaid 402 check and first paid call.

- [ ] **Step 1: Re-read the latest Pursekeeper thread immediately before submission** to catch changed instructions.
- [ ] **Step 2: Reply in the existing thread with the endpoint URL, repository URL, price `0.01 XNO`, and a one-sentence description of the useful JSON Lens result.** Do not claim checks have passed.
- [ ] **Step 3: Record submission timestamp and message ID.**
- [ ] **Step 4: Do not send a second submission unless Pursekeeper asks or the first message is confirmed lost.**

### Task 6: Treat Pursekeeper's listing check as the first controlled real payment

**Files / evidence:**
- Read: Pursekeeper reply/public log.
- Read-only inspect: D1 state if needed for reconciliation.
- Update: checkpoint, ledger, acceptance evidence.

**Interfaces:**
- Consumes: Pursekeeper's own x402 client payment attempt.
- Produces: authoritative first live verify/settle/delivery evidence or a bounded failure record.

- [ ] **Step 1: Observe the first paid attempt; do not generate or submit a second valid payment proof from our side.**
- [ ] **Step 2: On success, require evidence of HTTP 200 protected delivery, bounded `payment-response`, confirmed transaction/network, and no second settlement for the same payment identity.**
- [ ] **Step 3: Record the Pursekeeper confirmation/listing and the 10 XNO prepaid-call credit only after the client confirms the checks passed.**
- [ ] **Step 4: On verify rejection or settlement failure, keep protected output hidden and investigate before any new attempt.**
- [ ] **Step 5: On ambiguous settlement/transport state, do not automatically retry settlement; reconcile the Nano transaction and D1 state first.**
- [ ] **Step 6: Record the 14-day reachability clock only from the first Pursekeeper-confirmed listing/probe date; do not backdate it to the earlier challenge-only deployment.**

## Self-Review Result

- Spec coverage: unpaid 402, first paid delivery, uptime, prepaid credit, 14-day reachability, and public payment code are each assigned to a task.
- Secret handling: no task introduces a Nano seed/private key; the first real payer is Pursekeeper.
- Type/interface consistency: the plan preserves the existing Worker runtime, production gate, D1 store, and source-controlled rollout constant.
- Failure coverage: malformed proof, replay/concurrency, D1 failure, ambiguous settlement, and deployment-configuration drift are explicitly guarded.
- Scope: this plan does not add new payment features; it only proves, enables, deploys, submits, and observes the already-built path.
