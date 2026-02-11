# Data Handling: Self-Evolving Agents

## Data Classification
- **Level 1 (Public)**: Standards, taxonomy frames.
- **Level 2 (Internal)**: Metrics, drift reports.
- **Level 3 (Sensitive)**: Agent traces, mutation evidence.

## Never-Log List
- Raw customer prompts.
- Credentials (API keys, passwords).
- PII (user emails, etc.).
- Proprietary code blobs.

## Retention & Redaction
- **Retention**: Artifacts are kept for 14 days by default.
- **Redaction**: Automated redaction of sensitive fields via `summit.self_evolve.redact`.
