# Repository Assumptions and Validation Checklist for SWE-rebench Subsumption

## Verified Facts (as of this change)
- Repository root contains a global `AGENTS.md` with governance-first operating constraints.
- `docs/roadmap/STATUS.json` exists and is treated as an execution invariant for agent work tracking.
- `docs/` contains architecture/ops/planning materials suitable for adding design guidance.

## Assumptions Requiring Confirmation Before Implementation PR Stack
1. Canonical location for SWE dataset loader module.
2. Canonical evaluation artifact schema path and naming convention.
3. Preferred runtime boundary for containerized task execution.
4. Existing GraphRAG retrieval interfaces to attach SWE scope builder.
5. CI workflow ownership boundaries for adding benchmark/drift jobs.

## Must-Validate Before PR1
- Confirm dataset ingestion location and package ownership.
- Confirm test runner abstraction and environment handoff points.
- Confirm container runtime strategy and image policy constraints.
- Confirm result artifact schema contract (`report/metrics/stamp`).

## Guardrail Notes
- No dataset blob replication in repository.
- Feature flags default OFF for new SWE-lab capabilities.
- Deterministic outputs for benchmark evidence artifacts.

## Finality
Proceed with implementation only after assumption closure is documented in PR evidence, with links to validated paths and responsible module owners.
