# Summit Evidence Bundles

Deterministic evidence artifacts for CI + audit.

## Schemas

Schemas are located in `schemas/`:
- `report.schema.json`: Summary, environment, backend, and artifacts.
- `metrics.schema.json`: Quantitative metrics (key-value pairs).
- `stamp.schema.json`: Metadata, timestamps, and run identifiers.
- `index.schema.json`: Structure for the evidence index.

## Requirements

Required per Evidence ID directory:

- `report.json`: Must include `evidence_id`, `summary`, `environment`, `backend`, and `artifacts`.
- `metrics.json`: Must include `evidence_id` and `metrics`.
- `stamp.json`: Must include `created_at`, `git_commit`, and `run_id`. Timestamps are allowed *only* in this file.

## Indexing

- `index.json`: A sample index mapping Evidence IDs to file paths is provided in this directory.
- Global evidence index is typically at `/evidence/index.json`.

Templates for new evidence bundles live in `summit/evidence/templates`.
Examples are in `summit/evidence/examples`.
