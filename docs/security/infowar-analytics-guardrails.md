# InfoWar Analytics Guardrails

## No-Offensive Use Statement
Summit's INFOWAR module is strictly for defensive OSINT and governance. It must NOT be used to:
- Conduct or enable influence operations.
- Automate targeting of individuals or groups.
- Evade detection systems.

## Uncertainty Policy
All claims must include a `confidence` level and associated `evidence_ids`. Hypotheses must be explicitly labeled.

## Redaction Policy
PII, private handles, and other sensitive data must be redacted from all exports.

## Audit Export Format
Auditable interventions must be exported in a tamper-evident evidence bundle including `report.json`, `metrics.json`, and `stamp.json`.
