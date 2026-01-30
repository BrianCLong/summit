# World Model Evidence Requirements

All world-model rollouts must emit deterministic evidence artifacts.

## Required artifacts

- `evidence/report.json`
- `evidence/metrics.json`
- `evidence/stamp.json`
- `evidence/index.json`

## Evidence ID format

`EVD-2601-20540-<AREA>-<NNN>`

Areas:

- `INTF`: interfaces
- `EVID`: evidence schemas and verifier
- `EVAL`: eval harness
- `POL`: policy enforcement
- `ADPT`: adapters
- `DRIFT`: drift and rollout hashing

## Determinism rule

Timestamps are only allowed in `evidence/stamp.json`. All other artifacts must remain deterministic across runs.
