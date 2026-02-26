# Repo Assumptions Verification

## Verified Paths
- `core/`: Present in root, contains `memory/` and `privacy/`.
- `agents/`: Present in root.
- `pipelines/`: Present in root.
- `ci/`: Present in root, contains verification scripts like `verify_determinism.py`.
- `scripts/`: Present in root.
- `docs/`: Present in root.
- `summit/`: Present in root, contains `flags.py`, `main.py`, and `orchestration/`.
- `evidence/`: Present in root, contains `report.json`, `metrics.json`, `stamp.json` and their schemas.
- `tests/`: Present in root.

## Assumed Paths (from prompt)
- `core/orchestrator/engine.py` (To be created)
- `core/orchestrator/graph.py` (To be created)
- `core/orchestrator/schema.py` (To be created)
- `core/orchestrator/policy_gate.py` (To be created)
- `core/evidence/evidence_id.py` (To be created)
- `cli/workflow.py` (To be created)
- `examples/workflows/sample_orch.yaml` (To be created)
- `ci/check_determinism.py` (To be created)

## Validation Checklist
- [x] Confirm current execution model: Summit has a `SocietyOfThoughtEngine` in `summit/orchestration/society_of_thought.py`, but it's linear/fixed-turn.
- [x] Confirm CI check names: Existing checks in `ci/` use `verify_*.py` pattern (e.g., `verify_determinism.py`).
- [x] Confirm evidence schema location: `evidence/*.schema.json`.
- [x] Confirm feature flag mechanism: `summit/flags.py` uses `os.environ` with `is_feature_enabled` helper.
