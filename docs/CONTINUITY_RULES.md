# Continuity Rules

These rules allow the project to survive changes of chat, agent, session, or tool without depending on conversation memory.

## Project Language
English is the official language for all repository artifacts, code, comments, API surfaces, public errors, operational documentation, issues, releases, and customer-facing communication.

## Primary Rule
**`docs/checkpoints/CHECKPOINT_CURRENT.md` must be updated at the end of every work block.**

A work block is any unit that:
- changes code or documentation;
- makes a technical decision;
- completes a test;
- performs a deployment;
- changes configuration;
- discovers a relevant error/blocker;
- sends a submission or update to Pursekeeper.

## Resume Order
Any new agent must:
1. read `docs/checkpoints/CHECKPOINT_CURRENT.md`;
2. read `docs/ROADMAP.md`;
3. consult documents referenced by the checkpoint;
4. verify that claimed repository state actually exists;
5. execute only the recorded next step, or explicitly revise the plan.

## Minimum Checkpoint Content
- current state;
- last completed block;
- active decisions;
- relevant files/commits;
- tests performed and results;
- pending work;
- blockers/risks;
- exact next step;
- items requiring human confirmation;
- checkpoint date.

## History
For a material milestone, snapshot state to:
`docs/checkpoints/history/YYYY-MM-DD_NNN.md`.

CURRENT is mutable. Historical snapshots should not be rewritten except for a clearly documented correction.

## Fact vs Plan
Use:
- **COMPLETED** only for verified work;
- **PLANNED** for intended work;
- **BLOCKED** for unresolved dependencies;
- **UNVERIFIED** where evidence is insufficient.

Never convert intent into fact in a checkpoint.

## Secrets
Never record a wallet seed, private key, token, credential, or reusable payment header. A confirmed public Nano address may be recorded.
