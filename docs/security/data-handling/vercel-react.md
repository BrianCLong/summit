# React Best Practices: Data Classification & Never-Log

When executing React boundary analysis and caching/streaming validation, strict data handling rules apply to prevent leakage of sensitive source code or credentials.

## Never Log
- Source file contents
- Environment variables
- Secrets

## Log Only
- Rule ID (e.g., `RBP-001`)
- File path
- Import path (if applicable)

## Retention
- Reports are kept for 30 days.
- Deterministic artifacts (`report.json`, `metrics.json`, `stamp.json`) exclude timestamps.
