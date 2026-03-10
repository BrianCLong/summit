# Ledger Data Handling

## Never Log
- API Keys
- Session Tokens
- Raw PII
- Unredacted prompts without opt-in

## Retention
- Dev: 7 days
- Benchmark: 30 days
- Metrics: 90 days

## Redaction
Redaction occurs at the emission point via `LedgerAdapter`.
