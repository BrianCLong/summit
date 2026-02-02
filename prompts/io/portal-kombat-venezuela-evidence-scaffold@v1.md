# Prompt: Portal Kombat Venezuela Evidence Scaffold (v1)

## Objective
Create a deny-by-default evidence bundle for the Portal Kombat/Pravda Venezuela pivot scenario, register the bundle in evidence indexes, and harden evidence validation against timestamp leakage outside stamp artifacts.

## Scope
- Add evidence bundle under `evidence/portal-kombat-venezuela/` with five evidence IDs (SURGE/CONTRA/INAUTH/POLAR/PROV).
- Update `evidence/index.json` with the new evidence IDs and file paths.
- Extend `summit/io/evidence/validate.py` to reject RFC3339 timestamps outside `stamp.json`.
- Add or update tests under `tests/io/` to validate timestamp enforcement.
- Update `summit/io/evidence/README.md` with the new bundle references.
- Update `docs/roadmap/STATUS.json` with the task status entry.
- Record the decision in `packages/decision-ledger/decision_ledger.json`.
- Register this prompt in `prompts/registry.yaml` and add a task spec under `agents/examples/`.

## Constraints
- Keep all evidence artifacts deterministic; timestamps only appear in `stamp.json`.
- Feature flags remain default OFF.
- No dependency changes.

## Verification
- Run `python -m pytest tests/io/test_evidence_schemas.py`.
- Run `scripts/check-boundaries.cjs`.
