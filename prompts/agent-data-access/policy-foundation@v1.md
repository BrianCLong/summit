# Agent Data Access Policy Foundation (PR-1)

## Objective
Establish deny-by-default policy foundations for agent data access, including registries, schemas, evaluator, tests, and evidence updates.

## Required Changes
- Add policy registries under `.github/policies/agent-data-access/` with JSON schemas.
- Implement TypeScript policy types, loader, and evaluator under `src/agents/policy/`.
- Add unit tests covering deny-by-default and approval-required scenarios under `tests/agents/policy/`.
- Update `evidence/index.json` and add evidence artifacts for new EVD entries.
- Update `docs/roadmap/STATUS.json` with initiative status.

## Constraints
- Deny-by-default for unknown tools/sources.
- Ensure banned operation patterns are enforced.
- Keep changes scoped to policy foundations (no runtime enforcement or connector behavior changes).

## Verification
- Run unit tests covering policy evaluation.
- Validate policy registries against schemas.

## Evidence
- Add evidence IDs `EVD-OSINTLEGAL-DATAACCESS-001` and `EVD-OSINTLEGAL-DATAACCESS-002` with report/metrics/stamp entries.
