---
Status: Draft
Owner: TBD
Last-Reviewed: 2026-02-25
Evidence-IDs: EVD-TODO-001
---
Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

## Data Sensitivity & Redaction

### Levels

- **NON_SENSITIVE**: Public data.
- **INTERNAL**: Business internal, low risk.
- **SENSITIVE_PII**: Personally Identifiable Information (requires redaction).
- **HIGHLY_SENSITIVE**: Trade secrets, credentials.

### Redaction Policy

- API outputs must be passed through `redactSensitive(data, userLevel)`.
- Logs must never contain `SENSITIVE_PII` or higher.
- Metadata tags (`_sensitivity`) control granular field access.
