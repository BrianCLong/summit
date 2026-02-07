# Interpretability Evidence Gate

This GA control makes mechanistic interpretability (MI) artifacts first-class evidence so Summit can audit model behavior with deterministic, schema-validated bundles. The gate is aligned with the Summit Readiness Assertion and evidence-first governance requirements.

## Evidence IDs

Use the fixed ITEM slug and evidence ID pattern:

- Item slug: `mechinterp-peeking-inside-llm`
- Evidence ID format: `EVD-mechinterp-peeking-inside-llm-<AREA>-<NNN>`

## Bundle Format

Each run produces a three-file bundle plus the index entry:

- `report.json` → `schemas/evidence/interpretability/report.schema.json`
- `metrics.json` → `schemas/evidence/interpretability/metrics.schema.json`
- `stamp.json` → `schemas/evidence/interpretability/stamp.schema.json`
- Index → `evidence/interpretability/index.json` validated by `schemas/evidence/interpretability/index.schema.json`

## Determinism Rule

- **Only** `stamp.json` may contain timestamps.
- `report.json` and `metrics.json` must be deterministic and timestamp-free.

## Evidence Placement

- Place bundles under `evidence/interpretability/<run-id>/` (future).
- Maintain the aggregated index at `evidence/interpretability/index.json`.

## Never-Log Fields

`report.json` must include `never_log_fields` to list sensitive activation or token data that must never be logged.

## Governed Exceptions

If legacy bypasses are required, they must be documented as `governed_exceptions` in `report.json` with explicit scope and remediation plan.
