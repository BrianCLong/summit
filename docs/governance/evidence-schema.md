# Evidence Schema (Narrative Intel v1)

This document defines the minimal evidence contract for narrative intel bundles. All evidence
artifacts are deterministic and must omit timestamps except within `stamp.json`.

## Required Files

Each evidence entry folder must contain the following files:

- `report.json` — semantic report (no timestamps)
- `metrics.json` — quantitative metrics (no timestamps)
- `stamp.json` — provenance stamp (timestamps allowed here only)

## Evidence Index

`evidence/index.json` lists every evidence entry with its ID and relative path.

## Evidence ID Format

`EVD-<ITEMSLUG>-<AREA>-<NNN>`

- ITEMSLUG: lowercase, hyphenated
- AREA: uppercase area identifier (e.g., `EVIDENCE`)
- NNN: three-digit sequence

## Determinism Rules

- No timestamps outside `stamp.json`.
- Arrays must be deterministically ordered (sorted or stable insertion).
- `metrics.json` must declare `metricKeys`, and `metrics` must include exactly those keys.

## Validator

Validation is enforced by `src/graphrag/narratives/evidence/verifyEvidence.ts` and the
CI job `verify-evidence`.

## MAESTRO Alignment

- **Layers**: Data, Observability, Security.
- **Threats Considered**: evidence tampering, timestamp leakage, non-deterministic bundles.
- **Mitigations**: schema validation, timestamp gating, deterministic fixtures.
