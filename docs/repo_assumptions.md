# Repo Assumptions

<<<<<<< HEAD
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
=======
**Verified**
* None (inspection unavailable initially, basic checks done now)

**Assumed**
* pipelines/ contains stage definitions
* schemas/ contains JSON schemas
* CI uses GitHub Actions
* Evidence format: report.json, metrics.json, stamp.json

**Must-Not-Touch**
* Core scoring engine
* Existing compliance attestations
* Historical evidence logs
>>>>>>> c5daac29a (feat(cda): introduce subsumption bundle and pushback validation mechanics)
