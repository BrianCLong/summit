# SHAP-IQ Subsumption Repo Assumptions

## Verified paths
- `explain/shap_iq/` (new module created in this change set).
- `scripts/explain_run.py` and `scripts/monitoring/shap_iq-drift.py`.
- `docs/standards/`, `docs/security/data-handling/`, `docs/ops/runbooks/`.

## Assumed paths
- Existing CI quality gates and profiling harness naming conventions are assumed and must be wired in follow-up CI workflow updates.
- Existing evidence ID and metrics schema standards may require additional alignment with governance-owned schemas.

## Must-not-touch files
- No production model training pipelines.
- No UI bundles or frontend routes.
- No authentication/authorization policy engines.

## Required schema alignment tasks
1. Confirm whether `EV-SHAPIQ-<model>-<hash>` aligns with canonical evidence ID policy.
2. Validate `metrics.json` field naming against repo-wide metrics contract.
3. Register explainability artifacts in CI schema checks and retention rules.
4. Add policy tests for artifact gate failures (matrix missing, malformed evidence ID, latency overflow).
