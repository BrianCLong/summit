# Shared Memory Evidence PR1 Scaffold

## Goal

Establish the evidence schema scaffolding and bundle index entries for the shared memory orchestration lane.

## Required Outputs

- Evidence schemas for report/metrics/stamp under `evidence/schemas/`.
- Evidence bundle directory `evidence/EVD-shared-memory-orch-001/` with `report.json`, `metrics.json`, and `stamp.json`.
- Evidence index update in `evidence/index.json` mapping the new evidence ID.
- Required checks discovery updates in `required_checks.todo.md`.
- Tests validating the shared memory evidence schema bundle.
- Update `docs/roadmap/STATUS.json` with the shared memory evidence initiative.

## Determinism Rules

- No timestamps outside of `stamp.json`.
- JSON output must be stable and deterministic.

## Verification

- Add or update tests to validate the schema bundle.
- Document any unmet checks in the final report.
