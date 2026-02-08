# Repo Assumptions & Validation

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
|---|---|---|---|
| `summit/` | `summit/` | ✅ Exists | Primary Python package root for Summit features. |
| `docs/` | `docs/` | ✅ Exists | Documentation root. |
| `tests/` | `tests/` | ✅ Exists | Pytest root (see `pytest.ini`). |
| `summit/evidence/` | `summit/evidence/` | ✅ Exists | Evidence tooling and schemas. |

## RLVR/LUSPO Mapping

| Planned Component | Proposed Location | Actual Location / Action |
|---|---|---|
| RLVR objective helpers | `summit/rlvr/objectives/` | `summit/rlvr/objectives/` (new module for GSPO/LUSPO). |
| Length drift detector | `summit/rlvr/length_drift.py` | `summit/rlvr/length_drift.py` (new detector). |
| Length report CLI | `summit/cli/rlvr_length_report.py` | `summit/cli/rlvr_length_report.py` (new CLI entry module). |
| Evidence schemas | `summit/evidence/schemas/` | `summit/evidence/schemas/` (new RLVR schemas). |

## Constraints & Checks

* **CI Gates**: Deferred pending verification of workflow names under `.github/workflows/`.
* **Evidence Policy**: Deterministic artifacts required; timestamps only in stamp files (verified via `summit/evidence/writer.py`).
* **Must-Not-Touch**: Release automation, lockfiles, golden benchmark datasets, security policy docs (intentionally constrained).
