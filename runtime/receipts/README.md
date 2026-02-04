# Model Execution Receipts

This directory contains deterministic run receipts for local model execution.

- `*.json`: Deterministic receipts containing run ID, model digest, and container configuration. These files MUST NOT contain timestamps to maintain hash stability.
- `*.stamp.json`: Associated temporal metadata (started_at, finished_at) for each run.

These artifacts are used for compliance auditing (SOC2, ISO 27001) and provenance tracking.
