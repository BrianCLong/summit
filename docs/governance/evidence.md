# Evidence Bundles (Lane 1 Foundation)

This document defines the minimal evidence bundle contract used by governance gates and
CI verification. It is additive to existing evidence guidance and must remain deterministic.

## Evidence bundle layout

Each evidence bundle lives under `evidence/<bundle-id>/` and includes:

- `report.json` (semantic summary)
- `metrics.json` (quantitative metrics)
- `stamp.json` (timestamps and provenance)
- `index.json` (Evidence ID to file mapping)

## Determinism rules

- Only `stamp.json` may contain timestamps.
- All other files must be stable under repeated generation.
- `index.json` must map every Evidence ID to at least one file in the bundle.

## CI verification

The `pnpm run verify:evidence` script enforces the required files in each evidence bundle.
Schema validation will be added once the schema registry is stable.
