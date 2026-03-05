# Repo Assumptions

## Verified Paths
- `summit/`
- `summit/explain/` (Will be created)
- `docs/standards/`
- `docs/security/`
- `docs/ops/runbooks/`
- `scripts/monitoring/`

## Assumed Paths
- JSON artifact schema conventions (e.g. `report.json`, `metrics.json`, `stamp.json` based on `subsumption/example/evidence`)

## Must-not-touch files
- Any `package.json` or `tsconfig.json` outside the target scope
- CI workflow files (unless specifically necessary for gates)
- Existing tests or application source code outside `summit/explain/shap_iq/`

## Required schema alignment tasks
- Align JSON schema with `report.json` and `metrics.json` structure
- Ensure deterministic output requirements
