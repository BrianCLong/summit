# Repository Assumptions for MALE (Media AI List Evaluator)

## Verified vs Assumed Paths
* **Verified**: `data/`, `scripts/`, `docs/`, `.github/workflows/`, `tests/` directories exist or have been created.
* **Assumed/Created**: `reports/` did not exist initially, created `reports/media_ai_lists/` to store the generated reports.
* **Assumed/Created**: `data/media_ai_lists/`, `scripts/media_list/`, `docs/standards/`, `docs/ops/runbooks/`, `docs/security/data-handling/`.

## Evidence Schema Confirmation
* The project requires evidence artifacts to follow the Summit Evidence schema.
* Evidence paths: `data/media_ai_lists/<slug>/evidence.json`.
* Evidence ID pattern: `MEDIA-<slug>-CLAIM-###`.
* Reports and metrics: `reports/media_ai_lists/<slug>/{report.json,metrics.json,stamp.json}`.

## CI Naming Convention
* MALE drift workflow: `.github/workflows/media-list-drift.yml`.
* CI checks: `media_list_validation`, `claim-ci`, `policy-ci`, `determinism-ci`.

## Must-not-touch
* Core scoring engine: The `src/agents/policies/` or core Summit scoring mechanisms will be used but not modified directly. MALE is an overlay/plugin.
* Feature flag: `media_ai_list.enabled=false` by default.
