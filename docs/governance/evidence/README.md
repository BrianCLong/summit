# Governance Evidence Schemas

These schemas provide a minimal, forward-compatible contract for evidence
artifacts tracked in `evidence/index.json`.

## Files

- `report.schema.json`: semantic evidence summaries.
- `metrics.schema.json`: quantitative measurements.
- `stamp.schema.json`: timestamps and provenance fields.

## Validation

Run `.github/scripts/verify-evidence.mjs` to validate the index, referenced
files, and timestamp placement rules.
