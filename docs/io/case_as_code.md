# IO Case-as-Code

## Purpose

`case.yaml` is the deterministic contract for running an IO investigation skeleton and emitting
verifiable artifacts.

## Case file fields

Required fields:

- `version`
- `case_id`
- `hypothesis`
- `sources_allowed[]`
- `detectors[]`

Optional fields:

- `thresholds` (numeric values)
- `export_formats[]`
- `dataset_hash`
- `model_hash`

Reference example: `cases/io/example.case.yaml`

## Runner command

```bash
pnpm exec tsx cli/src/cli.ts io run-case \
  --case cases/io/example.case.yaml \
  --tenant acme \
  --artifact cib_eval \
  --domain io \
  --date 2026-02-11
```

Outputs:

- `report.json`
- `metrics.json`
- `stamp.json`

All outputs are deterministic JSON and include the Evidence ID pattern:

`EVID::<tenant>::<domain>::<artifact>::<yyyy-mm-dd>::<gitsha7>::<runid8>`

## Determinism constraints

- `runid8` defaults to the first 8 chars of `sha256(stable(case.yaml))`
- JSON artifacts are recursively key-sorted
- `code_hash` defaults to `git rev-parse --short=7 HEAD` (or `0000000` fallback)

## Governance posture

- This runner is intentionally constrained to case validation + deterministic artifact emission.
- Detector execution, attribution export, and external collection integrations remain gated by
  policy and human review requirements.
