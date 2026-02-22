# Replit Agent Subsumption Scaffold (v1)

## Objective

Create Summit-native, gated scaffolding that subsumes public Replit Agent capabilities with explicit evidence bundles, deny-by-default policies, and reversible controls.

## Scope

- `summit/integrations/registry.py`
- `summit/scaffold/`, `summit/repair/`, `summit/automations/`
- `tests/` for deny/allow and flag gating
- `evidence/EVD-REPLITAGENT-*/` bundles and `evidence/index.json`
- `docs/subsumption/replit_agent.md`, `docs/policy.md`
- `docs/roadmap/STATUS.json`
- `ci/evidence_validate.py`
- `packages/decision-ledger/decision_ledger.json`
- `required_checks.todo.md`

## Constraints

- Deny-by-default behavior is mandatory.
- Feature flags default OFF.
- Evidence is deterministic; timestamps only in `stamp.json`.
- Add decision ledger entry with rollback guidance.

## Success Criteria

- Evidence IDs registered and bundles present.
- Tests cover deny and allow cases.
- Flagged modules are disabled by default.
- Roadmap status updated with revision note.
