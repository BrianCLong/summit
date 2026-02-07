# CIB Policy Gate

This policy enforces governance gating for coordinated behavior detection outputs produced by the pipeline.

## Inputs (expected)
- `input.signals[]`: array of `{ id, score, details? }`
- `input.evidence.ids[]`: list of evidence IDs embedded in the evidence bundle
- `input.context.run_type`: `"pr" | "main" | "release"`

## Outputs (used by CI + UI)
- `data.summit.cib.allow` (boolean)
- `data.summit.cib.deny_reasons[]` (structured reasons)
- `data.summit.cib.warn_reasons[]` (structured warnings)

## How to run
- `opa test policy/cib -v`
- `opa eval -i input.json -d policy/cib 'data.summit.cib'`

## Source alignment
This gate is designed to map to Summit’s feature registry:
- `docs/research/FEATURES_FRAME_CIB.yml`
