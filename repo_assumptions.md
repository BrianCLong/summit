# Repo Assumptions & Reality Check

## 1. Paths & Structure

| Path | Status | Notes |
| :--- | :--- | :--- |
| `summit/` | ✅ Verified | Root Python package. |
| `summit/tests/` | ✅ Verified | Test root. |
| `summit/evidence/schemas/` | ✅ Verified | Existing schema location. |
| `summit/narrative/` | ⚠️ Assumed | New package to be created. |
| `scripts/` | ✅ Verified | Location for Python scripts/tools. |
| `artifacts/` | ⚠️ Assumed | Output directory (repo has `release-artifacts/` and `evidence/`). Will use `artifacts/` for local/CI outputs. |
| `tools/summitctl` | ✅ Verified | TypeScript CLI. Will use Python script for this task to align with MWS. |

## 2. CI & Gates

| Check Name | Status | Notes |
| :--- | :--- | :--- |
| `summit-ci.yml` | ✅ Verified | Likely the main CI loop. |
| `ci-evidence-verify.yml` | ✅ Verified | Likely validates evidence artifacts. |
| `lint` | ⚠️ Assumed | Standard python linting (ruff/flake8) expected. |
| `test` | ⚠️ Assumed | Pytest expected. |

## 3. Evidence Conventions

| Convention | Status | Notes |
| :--- | :--- | :--- |
| `*.report.schema.json` | ✅ Verified | Standard schema naming. |
| `*.metrics.schema.json` | ✅ Verified | Standard schema naming. |
| `*.stamp.schema.json` | ✅ Verified | Standard schema naming. |
| Deterministic Outputs | ✅ Verified | `tools/determinism_smoke.py` exists. |

## 4. Must-Not-Touch

* `summit/evidence/schemas/index.schema.json` (Core schema, unless necessary)
* `tools/summitctl/` (Avoid TS changes unless needed for integration)
* `summit/main.py` (Avoid modifying core app routing for this isolated pipeline)

