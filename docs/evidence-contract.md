# Evidence Contract

All Vind driver operations in CI must emit structured evidence.

## Evidence IDs
- `EVD-VIND-DRV-001`: Driver create/delete smoke
- `EVD-VIND-LCY-002`: Pause/resume lifecycle
- `EVD-VIND-LB-003`: LoadBalancer OOB probe
- `EVD-VIND-CCH-004`: Pull-through cache benchmark

## Required Artifacts
Each evidence bundle must contain:
- `report.json`: Status and details.
- `stamp.json`: Timing and runner information.
- `metrics.json` (optional): Quantitative metrics.

## Schema Validation
All evidence artifacts are validated against JSON schemas in `evidence/schemas/`.

## Minimal Example
See `docs/evidence/examples/minimal-bundle/` for a deterministic, schema-valid bundle.
