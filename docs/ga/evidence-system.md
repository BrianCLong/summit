# Evidence System (GA Hardening)

## Purpose

The Summit Evidence System standardizes deterministic evidence artifacts for CI and governance gates.
Evidence is **authoritative** only when it is indexed, schema-validated, and timestamped exclusively
in a stamp artifact. This is a governed requirement aligned to the Summit Readiness Assertion.

## Canonical Artifacts

Each evidence run must produce the following, stored under `evidence/<run_id>/` and indexed in
`evidence/index.json`:

- `report.json` (see `evidence/schemas/report.schema.json`)
- `metrics.json` (see `evidence/schemas/metrics.schema.json`)
- `stamp.json` (see `evidence/schemas/stamp.schema.json`)

## Determinism & Timestamp Rules

- **Timestamps are allowed only in `stamp.json`.**
- `report.json` and `metrics.json` must be deterministic and free of time-based values.
- Evidence IDs must match the `EVD-<AREA>-<TOPIC>-<NNN>` pattern and be registered in the index.

## CI Verification

The evidence verifier (`.github/scripts/verify-evidence.mjs`) enforces:

- `evidence/index.json` exists and is valid JSON.
- Every indexed entry references `report`, `metrics`, and `stamp` files.
- All referenced files exist.
- `report.json` and `metrics.json` are free of timestamp fields.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Observability, Security.
- **Threats Considered:** Evidence tampering, timestamp leakage, non-deterministic artifacts.
- **Mitigations:** Schema validation, index verification, timestamp isolation in `stamp.json`, CI gate.

## Governance Notes

- Evidence schema updates require a corresponding update to `agent-contract.json` verification
  surfaces.
- Evidence gates are Tier C by default and executed via `make ga-verify`.
