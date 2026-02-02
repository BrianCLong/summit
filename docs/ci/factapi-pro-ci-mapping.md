# FactAPI Pro CI Mapping

## Required Checks Mapping

Based on `docs/ci/REQUIRED_CHECKS_POLICY.yml`:

| Category | Policy Check | Mapped Implementation |
| :--- | :--- | :--- |
| **Always Required** | `Release Readiness Gate` | `release-readiness.yml` (Standard) |
| **Always Required** | `GA Gate` | `ga-gate.yml` (Standard) |
| **Always Required** | `Unit Tests & Coverage` | `pytest` on `tests/api/factapi_pro/` |
| **Always Required** | `CI Core (Primary Gate)` | `ci-core.yml` (Standard) |
| **Conditional** | `CodeQL` | Not triggered by `api/` currently (Needs Review) |
| **Conditional** | `Schema Compatibility` | Not triggered by `api-schemas/factapi_pro/` (Needs Review) |
| **Conditional** | `SLO Smoke Gate` | Not triggered by `api/` (Needs Review) |

## FactAPI Pro Specific Gates

1.  **Unit Tests**: `pytest tests/api/factapi_pro/`
2.  **Determinism**: Verify `artifacts/factapi-pro/` are identical across two builds.
3.  **Schema Validation**: Verify `api/factapi_pro/main.py` implementation matches `api-schemas/factapi_pro/openapi.yaml`.
