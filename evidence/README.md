# Summit Golden Path Evidence Bundle

This directory defines the JSON schema used by the GA Golden Path workflow scaffold.

## Bundle Contract

The evidence bundle is validated against `evidence/schema.json` and must include:

- `build_id`
- `commit_sha`
- `policy_results`
- `test_results`
- `provenance`
- `timestamp`

## Generation Flow

1. `summit-golden-path.yml` runs policy checks and test scaffolding.
2. The workflow emits `evidence/out/bundle.json`.
3. Workflow validation checks bundle fields and status enums against `evidence/schema.json`.
4. The bundle is uploaded as the workflow artifact `summit-golden-path-evidence`.

## Compliance Intent

The bundle provides a deterministic handoff artifact for governance review, audit logging, and Observer
post-run notifications without requiring external service dependencies.
