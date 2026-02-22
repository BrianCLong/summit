# Agentic Analytics 2026 — Data Handling

## Purpose

Define data classification, retention, and never-log rules for agentic analytics outputs.

## Data Classification

- **Input datasets**: Potentially sensitive; treat as restricted until classified.
- **Artifacts** (`report.json`, `narrative.md`, `eval.json`, `metrics.json`, `stamp.json`):
  Restricted by default, export only with explicit approval.

## Never-Log Rules

- Raw dataset rows beyond sanitized samples.
- Secrets, API keys, or credentials.
- PII matches or full identifiers (store counts + hashes only).

## PII Handling

- Detect and redact PII before writing `narrative.md`.
- Store only masked values or aggregates in `report.json`.

## Retention

- Artifacts are local by default; upload requires explicit configuration.
- `audit.jsonl` records event metadata only (who/what/why, no raw data).

## Deterministic Artifacts

- No timestamps in deterministic outputs.
- Use content hashes for identity and traceability.

## Governance & Compliance

- Policy gates fail closed on PII detection in narrative output.
- Any exception is treated as a **Governed Exception** and must be recorded.
