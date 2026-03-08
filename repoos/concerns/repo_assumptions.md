# Repository Assumptions and Validations

## VERIFIED Paths
- GraphQL schema files exist across `server/src/graphql/schema/`
- `active-measures-module/` directory exists
- `adapters/` directory exists
- CI workflows are located in `.github/workflows/` (e.g., `ci-core.yml`)
- `GOLDEN/datasets/` directory exists

## ASSUMED Paths and Requirements
- `absorption/narrative-sitrep` will hold the generated analyst products
- Evidence schema is expected to be provenance-first and linked to EID identifiers (e.g., `EID:IRNAR:...`)
- A deterministic convention will be used (report.json, metrics.json, stamp.json)

## Must-Not-Touch
- Branch protection policy files
- Existing release-evidence generators
- Live OPA policy bundles
- Existing database migration history ordering
- Production deployment charts
