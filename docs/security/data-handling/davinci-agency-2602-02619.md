# Data Handling: Long-Horizon Agency Track

## Data Classification
- **Public PR Data**: Allowed for ingestion and evaluation.
- **Sensitive Trajectories**: Must be redacted before persistence.

## Redaction Policy
- All evidence artifacts must be processed through the `redactArtifact` utility.
- Deny-by-default on tool outputs containing potential secrets (AWS keys, Slack tokens, Private keys).

## Retention
- Deterministic artifacts (`report.json`, `metrics.json`, `stamp.json`) are retained for audit.
- Full trajectory logs are stored only in development environments and never in production-grade evidence bundles without explicit approval.
