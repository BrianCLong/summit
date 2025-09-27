# Workstream 1 — RACI & Milestones (Weeks 1–4)

| Week | Milestone | Dev | Sec | SRE | Data | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| Week 0 (Prep) | Confirm scope, guardrails, and dependency roster | A | C | C | C | C |
| Week 1 | Finalize evidence schema & guardrail alert draft (Stories WS1-S1, WS1-S2) | R | C | C | R | I |
| Week 1 | Publish conductor summary draft (docs/conductor-summary.md) | R | C | C | C | A |
| Week 2 | Integrate schema validation in CI and stage alert simulations | R | I | A | C | I |
| Week 2 | Tabletop release governance exercise & RACI approval (Story WS1-S3) | A | C | R | C | R |
| Week 3 | Usability validation + documentation updates (Story WS1-S4) | C | I | I | C | A |
| Week 3 | Mock release communications dry-run (Story WS1-S5) | C | A | R | C | R |
| Week 4 | Release-ready sign-off packet submitted (all DoD items) | A | C | A | C | A |

Legend: R = Responsible, A = Accountable, C = Consulted, I = Informed.

## Coordination Notes
- Weekly checkpoints every Monday 09:00 PT to review status, unblock dependencies, and confirm evidence collection.
- Async updates posted in Conductor channel (#conductor-ws1) with links to backlog items and supporting artifacts.
- Escalations routed through Maestro Conductor (MC) who coordinates with Workstreams 2–8 leads.

## Evidence Hooks
- Meeting notes archived under `docs/governance/meetings` with timestamps and attendee logs.
- CI pipeline captures validation logs and attaches to release artifact bundles.
- Alert simulations store metrics snapshots in observability bucket `s3://summit-obs/r1/` and `.../r2/`.
- Usability tests and communications dry-run outputs tagged with backlog IDs for provenance linking.
