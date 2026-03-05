# Repo Assumptions & Reality Check

## Verified vs Assumed paths
- Assumed `agents/` runtime
- Assumed `scripts/`
- Assumed `tests/`
- Assumed `docs/`
- Assumed `.github/workflows/`

## Artifact schemas
- `run_plan.json`
- `execution_ledger.json`
- `patch_stack.json`
- `eval_report.json`
- `policy_report.json`

## Must-not-touch list
- existing artifact schemas
- CI workflow names
- security policy enforcement modules

## CBM Must-not-touch (ASSUMPTION until audit)
- graph core engine internals
- ingestion connectors already stable
- infra stateful components (db, queues)

## CBM Validation checklist (before PR1 merge)
- enumerate existing pipelines + artifact conventions
- locate any existing graph schema types / serialization format
- confirm test runner and CI gate naming
- confirm current “Evidence ID” style (or introduce CBM’s in isolated namespace)
