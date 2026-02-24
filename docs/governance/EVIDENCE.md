# Evidence Framework

This document defines the evidence collection and verification process for Summit.

## Evidence Artifacts

Each evidence bundle must contain:
- `report.json`: The main evidence report.
- `metrics.json`: Metrics associated with the evidence.
- `stamp.json`: Timestamp and signature information.
- `index.json`: Index mapping evidence IDs to files within the bundle.

## Evidence Schemas

Schemas are located in `docs/governance/evidence-schemas/`:
- `report.schema.json`
- `metrics.schema.json`
- `stamp.schema.json`
- `index.schema.json`

## Verification

Run `pnpm run verify:evidence` to verify the integrity of evidence bundles.
