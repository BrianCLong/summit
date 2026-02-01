# Evidence System

This directory contains the Evidence System artifacts and schemas.

## Evidence ID (EID)

Every major decision or execution result is tracked via an Evidence ID (EID).
Mappings are stored in `evidence/index.json`.

## Artifacts

Standard artifacts for an EID:
- `report.json`: Summary of the event/decision.
- `metrics.json`: Structured metrics.
- `stamp.json`: Cryptographic and timestamp metadata.

## Validation

Artifacts are validated against schemas in `schemas/evidence/`.
