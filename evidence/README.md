# Summit Evidence System

This directory contains the canonical schemas and artifacts for the Summit Evidence System.

## Schemas
- `report.schema.json`: Schema for the main evidence report.
- `metrics.schema.json`: Schema for metrics collected during execution.
- `stamp.schema.json`: Schema for the attestation stamp (versions, time).
- `index.schema.json`: Schema for the index file mapping IDs to artifacts.

## Usage
Run `ci/gates/validate_evidence.py` to validate generated evidence against these schemas.
