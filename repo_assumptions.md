# Repo Assumptions & Validation (SAM Workstream)

## Verified Structure (relevant to SAM)

| Path | Status | Notes |
| --- | --- | --- |
| `summit/train/entrypoint.py` | ✅ Verified | Exists but is a stub (`run_train` TODO). |
| `summit/post_training/recipes/typhoon_s/opd_trainer.py` | ✅ Verified | Active PyTorch training step surface. |
| `summit/optim/` | ❌ Not present before PR1 | Created by PR1 for SAM implementation. |
| `summit/training/loop.py` | ❌ Not present | PR2 should target `summit/train/entrypoint.py` and/or `summit/post_training/recipes/*`. |
| `tests/` | ✅ Verified | Root Python tests run from this directory (`pytest.ini testpaths = tests`). |
| `summit/ci/required_checks.json` | ✅ Verified | Contains check name inventory used by Summit CI conventions. |

## CI Check Names (local config snapshot)

From `summit/ci/required_checks.json`:

- `summit-ci/evidence-verify`
- `summit-ci/prompt-determinism`
- `summit-ci/tool-schema-drift`
- `summit-ci/policy-gates`
- `summit-ci/unit`

## Evidence Conventions (observed)

- Evidence validators exist under `summit/ci/verify_evidence.py`.
- Required artifacts commonly include `report.json`, `metrics.json`, `stamp.json`.
- Determinism convention: keep timestamps out of `metrics/report`; isolate run metadata in `stamp.json`.

## SAM Plan Implications

1. PR1 can land as an isolated optimizer extension (`summit/optim/sam.py`) + unit tests.
2. PR2 integration should avoid non-existent `summit/training/loop.py`.
3. PR3 sharpness probe should emit to existing evidence artifact conventions.
