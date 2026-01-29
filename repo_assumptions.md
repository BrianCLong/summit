# Repo Assumptions — SSDF v1.2 Subsumption Bundle

## Verified
- Repo structure exists (`subsumption`, `scripts/ci`, `evidence`).
- `yaml` package is available in `package.json` devDependencies.

## Assumed (must validate)
- CI can run Node.js scripts from `scripts/ci/*.mjs`.
- Repo supports adding a workflow job under `.github/workflows/*`.
- Evidence convention exists: `report.json`, `metrics.json`, `stamp.json` are acceptable artifacts.

## Must-not-touch
- Existing workflow logic unrelated to subsumption bundle.
- Public APIs in packages.
- Release automation and provenance pipelines (except to reference outputs).

## Validation Plan
- Confirm required checks via GitHub UI/API (see `required_checks.todo.md`).
- Confirm YAML parsing dependency; if absent, add a minimal dependency in a dedicated PR with deps delta doc.
