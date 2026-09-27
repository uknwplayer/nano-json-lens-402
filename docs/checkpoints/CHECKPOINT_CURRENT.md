# CURRENT CHECKPOINT — Nano JSON Lens 402

**Date:** 2026-09-26
**Block:** 019 — public challenge-only Cloudflare Worker deployed and externally verified
**Overall state:** TASK 5 IN PROGRESS / REAL D1 GREEN / PUBLIC WORKER GREEN / HEALTH 200 GREEN / UNPAID 402 GREEN / PAID TRAFFIC HARD-OFF / LIVE VERIFY-SETTLE NOT STARTED / MAIN UNTOUCHED

## Completed in this block
- The operator created a separate least-privilege Cloudflare Workers API token and stored it only as GitHub Actions secret `CLOUDFLARE_WORKERS_API_TOKEN`.
- The existing D1-only token was not broadened or reused for Worker deployment.
- A one-shot isolated launcher pinned reviewed branch commit `92aa8971e227520195b58c088a7dfdd0d00f5204`, rechecked `PAID_TRAFFIC_ENABLED === false`, the real D1 UUID, and all pre-deployment tests before mutation.
- Actions run `36281960914`, job `108515377275`, successfully deployed Worker `nano-json-lens-402` using Wrangler `4.137.0`.
- The Cloudflare Workers Scripts Edit token was sufficient for this first deployment; no Workers Admin escalation was needed.
- Public endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Deployed Cloudflare version ID: `36286ef2-2068-4c6c-a735-4d20f6e9b5ae`.
- The first immediate post-deploy `/health` probe returned Cloudflare HTTP 404 / error 1042. No application or configuration change was made in response.
- Diagnostic run `36282060561`, job `108515655977`, re-ran against the unchanged deployment and observed `GET /health` = HTTP 200 with exact body `{"status":"ok","version":"1"}`. The transient first failure is therefore treated as initial deployment propagation/routing convergence, not as evidence for a persistent Worker fetch defect.
- Independent public-only verification run `36282142586`, job `108515889136`, completed `success` without Cloudflare credentials and confirmed:
  - `GET /health` = HTTP 200;
  - unpaid `POST /api/lens` = HTTP 402;
  - scheme `exact`;
  - network `nano:mainnet`;
  - asset `XNO`;
  - amount `10000000000000000000000000000` raw;
  - expected public Nano `payTo`;
  - `payment-required` response header present;
  - no protected result/analysis in the unpaid response.
- No payment proof was submitted during public verification. Pursekeeper `verify` and `settle` were not called and no Nano transfer occurred.
- The permanent deployment workflow was hardened test-first to tolerate only bounded post-deploy propagation: at most 24 health attempts separated by 5 seconds, then fail closed.
- Readiness-wait RED evidence: commit `22f2a02e71add01ee564635ab639869a5cb59f4a`, Actions run `36282176562`: 90 total, 89 passed, exactly one workflow-contract test failed because the bounded wait did not yet exist.
- Readiness-wait GREEN implementation: commit `8f3a8b42e65d4d7f26cb1da4eae10db52fbe09ee`.
- GREEN evidence: Actions run `36282271750`, job `108516259954`: 90/90 tests, typecheck, Wrangler dry-run, dependency tree, and production audit all passed.

## Active payment and rollout rulings
- `PAID_TRAFFIC_ENABLED` remains source-controlled `false`; environment configuration cannot override it.
- The deployed Worker is challenge-only. A proof-bearing request is blocked by the challenge-only runtime before the concrete production payment resource server can call facilitator `verify` or `settle`.
- The real Cloudflare D1 database remains the production replay/settlement state backend.
- Stable replay identity remains derived from validated Nano state-block material, not serialized proof bytes.
- `requestDigest` remains local service metadata, not cryptographic payment/body binding.
- Facilitator verification and Nano settlement remain authoritative for eventual payment validity/finality.
- Settlement confirmation must remain one atomic D1 state+receipt write; ambiguous settlement outcomes fail closed without automatic re-settlement.
- Cloudflare D1 and Workers credentials remain separate least-privilege GitHub Actions secrets and must never be committed or pasted into chat.
- No Nano seed/private key is stored or required.

## Deployment target and live configuration
- Runtime: Cloudflare Workers Free.
- Worker: `nano-json-lens-402`.
- Public endpoint: `https://nano-json-lens-402.guilhermegomescavalcante-ggc.workers.dev`.
- Worker entrypoint: `src/worker.ts`.
- Runtime adapter: `src/worker-runtime.ts`.
- Persistent state: Cloudflare D1.
- D1 binding: `PAYMENT_DB`.
- D1 database: `nano-json-lens-402-payment-state`.
- D1 database ID: `8cbbea4c-b368-40e5-a7c0-9d72bce2567e`.
- Migration `0001_payment_state.sql`: applied remotely.
- Wrangler: `4.137.0`.
- Payment network/scheme: `nano:mainnet` / `exact`.
- Price: `0.01 XNO` = `10000000000000000000000000000` raw.
- Facilitator: `https://facilitator.pursekeeper.dev`.
- Public payTo: `nano_1zwik4hd1pjy73owfah8xuxzokk6zexc5a6rs6byhrxryggkbh38kemm51yt`.

## Scope of evidence / explicit non-claims
Direct evidence now proves that the actual Worker is deployed and publicly reachable over HTTPS, that `/health` returns the bounded 200 response, and that an unpaid valid lens request returns the expected production x402 402 challenge against the real D1-backed runtime.

It does **not** prove a paid-call success or Pursekeeper acceptance.

Therefore:
- real D1 + migration/state probe: GREEN;
- Worker deployment: GREEN;
- public HTTPS reachability: GREEN;
- public `GET /health`: GREEN;
- public unpaid `POST /api/lens` 402: GREEN;
- paid traffic: HARD-OFF;
- live `verify` / `settle`: NOT STARTED;
- Nano transfer: NONE;
- Pursekeeper endpoint submission: NOT YET DONE;
- Pursekeeper 14-day window: **NOT CLAIMED AS STARTED**. Public reachability alone is not being treated as proof of the client-side window start until the applicable Pursekeeper acceptance/submission condition is confirmed.

## Exact next step
Continue Task 5 on `task5-production-nano-payment`:
1. normalize/remove the temporary deployment launcher branch after evidence capture;
2. complete a fresh deployment security review, including the deployed challenge-only proof-header fail-closed behavior;
3. confirm the Pursekeeper submission/acceptance sequence and whether public deployment alone affects any timing window;
4. prepare the first controlled live payment test plan, including exact success/failure evidence and rollback/reconciliation handling;
5. do **not** submit a real payment proof or enable `PAID_TRAFFIC_ENABLED` until a later explicit authorization block.

## Continuity
All repository artifacts remain in English; private operator conversation remains in Portuguese. Keep work blocks approximately 15 minutes and update this checkpoint at every block closure. `main` remains untouched until isolated Task 5 work is verified and explicitly integrated.
