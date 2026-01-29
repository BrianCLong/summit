# Retrieval Evidence System

This document describes the evidence system for the Over-Engineered Retrieval Pipeline.

## Evidence IDs

Evidence IDs must follow the format:
`EVD-overengineered-retrieval-<AREA>-<NNN>`

## Artifacts

Each retrieval run must produce the following artifacts in `evidence/<run_id>/`:

*   `report.json`: Contains the retrieval plan, query intent, and summary.
*   `metrics.json`: Contains structured metrics (latency, recall, etc.).
*   `stamp.json`: The ONLY file allowed to contain timestamps.
*   `index.json`: Maps Evidence IDs to their corresponding files.

## Schema Validation

All evidence artifacts must validate against the schemas located in `retrieval/evidence/`.
CI checks will enforce schema compliance and verify that no timestamps are present outside of `stamp.json`.
