# Automation Evidence Schemas (v1)

## Objective
Establish the automation evidence contract with deterministic JSON schemas, a lightweight verifier CLI, and a baseline evidence bundle entry. The contract must ensure timestamps exist only in `stamp.json` and provide an example evidence index mapping.

## Scope
- `summit/automation/evidence/schemas/*.schema.json`
- `summit/automation/evidence/README.md`
- `summit/cli/automation_verify.py`
- `evidence/EVD-CODEX-AUTOMATIONS-SCHEMA-001/*`
- `evidence/index.json`
- `docs/roadmap/STATUS.json`

## Constraints
- Deterministic outputs only.
- No timestamps in report/metrics artifacts.
- Evidence IDs must use `EVD-CODEX-AUTOMATIONS-*` format.
- No refactors outside scope.
