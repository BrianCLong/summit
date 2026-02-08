# Narrative CI Pipeline

This pipeline scaffolds deterministic narrative scoring, state transitions, and evidence
bundling for Summit/IntelGraph. It is intentionally fixture-first and uses stable JSON
serialization so outputs are identical across runs with the same inputs.

## Local run (fixture mode)

```bash
npx tsx intelgraph/pipelines/narrative_ci/steps/50_bundle_evidence.ts --fixture
```

## Validate outputs

```bash
npx tsx intelgraph/pipelines/narrative_ci/lib/schema_validate.ts out schemas/narrative
```

## Evidence outputs

Each run emits:

- `out/metrics/*.json` deterministic payloads
- `out/narratives/*/state_transitions.json`
- `evidence/EVD-NARRATIVE-CI-METRICS-001/{report.json,metrics.json,stamp.json}`
- `evidence/index.json` updates tracked by `50_bundle_evidence.ts`

## Tuning thresholds

Edit `config/defaults.yml` only. All emitted evidence includes a config hash.

## Rollback

Set `NARRATIVE_CI_ENABLED=false` to disable the workflow and block graph writes.
