# Summit Evidence System

This directory contains the canonical schemas and artifacts for the Summit Evidence System.

## Schemas

- `report.schema.json`: Schema for the main evidence report.
- `metrics.schema.json`: Schema for metrics collected during execution.
- `stamp.schema.json`: Schema for the attestation stamp (versions, time).
- `index.schema.json`: Schema for the index file mapping IDs to artifacts.

## Usage

Run `ci/gates/validate_evidence.py` to validate generated evidence against these schemas.

## Runtime Evidence (Jet-RL / Precision Flow)

For unified precision flow runs, the following artifacts are required:

- `run_report.json` (validates against `schemas/run_report.schema.json`)
- `run_metrics.json` (validates against `schemas/run_metrics.schema.json`)
- `run_index.json` (validates against `schemas/run_index.schema.json`)

No file other than `stamp.json` (or strictly timestamped files) may contain nondeterministic values.

## Governed Exceptions

Legacy evidence artifacts that are exempt from schema or timestamp checks are listed in
`evidence/governed_exceptions.json` to keep exceptions explicit and reviewable.
