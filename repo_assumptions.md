# Repo Assumptions & Reality Check

## Verified (via exploration)

*   **Runtime**: `api/` is a Python application using FastAPI (`api/main.py`).
*   **Auth**: Existing auth stub in `api/main.py` checks `X-API-Key` header.
*   **Schemas**: `api-schemas/` is the source of truth for schemas (`api-schemas/v1/openapi-spec-v1.json` exists).
*   **CI Policy**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` exists and defines required checks.
*   **Telemetry**: OpenTelemetry is used in `api/main.py`.
*   **Dependencies**: Python dependencies are listed in `requirements.in`.
*   **Tests**: Python tests exist in `tests/` and are configured via `pytest.ini`.

## Assumptions (to be validated/enforced)

*   **FactAPI Pro Location**: New service module will be placed in `api/factapi_pro/`.
*   **CI Integration**: New Python tests in `tests/api/factapi_pro/` can be run via `pytest`.
*   **Feature Flags**: `FACTAPI_PRO_ENABLED` environment variable will control feature availability (default: false).
*   **Metering**: `metrics.json` will be generated deterministically in `artifacts/factapi-pro/`.

## Must-not-touch files

*   `docs/ci/REQUIRED_CHECKS_POLICY.yml` (Policy-as-code).
*   `.github/workflows/*` (CI workflows).
*   `SECURITY/*` (Security baselines).

## Validation Checklist

- [x] Identify API runtime + entrypoints under `api/` (Python/FastAPI).
- [x] Locate existing auth patterns (API Key header).
- [x] Locate telemetry/metering primitives (OpenTelemetry).
- [x] Locate schema tooling (`api-schemas/`).
- [x] Confirm required CI checks from `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
