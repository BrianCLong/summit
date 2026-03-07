# IntelGraph Repo Assumptions

## Verified Realities
- `src/graphrag/` exists and acts as the graph namespace.
- `.github/workflows/` and `.github/scripts/` contain existing CI automations.
- Documentation primarily resides in `docs/architecture/`, `docs/api/`, and `docs/standards/`.
- `package.json` uses `pnpm`.

## Assumed File Paths for IntelGraph Spines
- **Schema Validation logic:** `.github/scripts/intelgraph/`
- **Schemas:** `src/graphrag/intelgraph/schema/`
- **Tests:** `tests/graphrag/intelgraph/`
- **Architecture and Standards:** `docs/architecture/`, `docs/api/`, and `docs/standards/`

## Must-Not-Touch Files
- Existing top-level CI entrypoints unrelated to IntelGraph.
- Lockfiles unless updates are strictly required.
- Prod deployment manifests until IntelGraph CI gates fully pass.
- Auth/policy codepaths unless implementing deny-by-default feature flags.

## Validation Checklist before merges
- [ ] Confirm exact module locations for IntelGraph logic.
- [ ] Confirm CI check names required for branch protection.
- [ ] Confirm structure of `report.json`, `metrics.json`, and `stamp.json` avoids time stamps.
