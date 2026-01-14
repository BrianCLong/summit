# Workflow Engine Readiness & Health Endpoints

## Objective

Implement readiness and health reporting for the workflow-engine control-plane, with tests and governance artifacts.

## Scope

- Code paths: `apps/workflow-engine/src/**`
- Tests: `apps/workflow-engine/src/**/*.test.ts`
- Governance: `docs/roadmap/STATUS.json`, `agents/examples/**`

## Requirements

- Expose `/healthz` and `/readyz` endpoints with dependency readiness detail.
- Keep `/health` stable for existing probes.
- Add unit tests covering readiness behavior for cold-start state.
- Update roadmap status and agent task spec.

## Verification

- Run boundary checks (`node scripts/check-boundaries.cjs`).
- Provide evidence in PR body.
