# Threat Model: INFOWAR Analytics

## Abuse Cases
1. **Targeting Groups:** Misuse of narrative mapping to identify and target vulnerable populations.
2. **Doxxing:** Accidental leakage of private handles or PII in audit exports.
3. **Influence Operations:** Repurposing ingestion and propagation tools to conduct offensive IO.

## Controls
- **Rate Limits:** Enforced on all API endpoints.
- **Redaction:** Mandatory `never-log` scan and PII redaction.
- **Audit Trail:** Structured audit events for all views and exports.
- **Deny-by-Default:** No output without evidence and confidence labeling.
