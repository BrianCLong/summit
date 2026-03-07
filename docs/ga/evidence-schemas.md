# Evidence Schemas (Speculative Decoding)

This document anchors the evidence artifact schemas used by speculative decoding gates.
All evidence bundles MUST comply with the schemas below. Timestamp fields are ONLY
permitted in `stamp.json` to preserve deterministic evidence payloads.

## Canonical Schemas

| Artifact | Schema Path | Notes |
| --- | --- | --- |
| report.json | `schemas/evidence/report.schema.json` | Semantic run summary; no timestamps. |
| metrics.json | `schemas/evidence/metrics.schema.json` | Numeric metrics only; no timestamps. |
| stamp.json | `schemas/evidence/stamp.schema.json` | The only artifact allowed to contain timestamps. |
| index.json | `schemas/evidence/index.schema.json` | Maps evidence IDs to artifact paths. |

## Evidence IDs (Speculative Decoding)

| Evidence ID | Purpose |
| --- | --- |
| EVD-DFLASH-SPEC-001 | Speculative decoding interface + config scaffolding evidence. |
| EVD-DFLASH-EVAL-001 | Evaluation harness evidence (latency/speedup/acceptance). |
| EVD-DFLASH-SEC-001 | Security posture (never-log + supply-chain) evidence. |

## Determinism Rules

- `report.json` and `metrics.json` MUST be timestamp-free.
- `stamp.json` MUST contain the only timestamp fields for a run.
- Evidence index updates MUST reference concrete artifact paths.

## Sources of Truth

- Schema definitions live under `schemas/evidence/`.
- Evidence index is stored in `evidence/index.json`.
