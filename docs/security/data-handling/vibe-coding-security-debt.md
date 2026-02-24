# Vibe Coding Security Debt Data Handling

## Scope
This control applies to `security_debt_ledger.json`, `report.json`, `metrics.json`, and `stamp.json` produced by security debt analysis.

## Never Log
- Secrets
- Full source blobs
- Proprietary prompts
- API keys
- External tokens

## Retention
- Retain `metrics.json` for 90 days.
- Retain security debt ledger history for 1 year.

## Determinism Rule
- `report.json`, `metrics.json`, and `security_debt_ledger.json` must remain timestamp-free.
- `stamp.json` is reserved for deterministic stamp fields only (`ledger_hash`, `evidence_count`, `deterministic`).
