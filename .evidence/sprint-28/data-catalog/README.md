# Sprint 28 — Data Catalog Evidence

This folder stores validation artifacts for Epic A (data classification and policy annotations).

Include:

- `schema.json`: authoritative JSON schema for catalog entries.
- `catalog.sample.json`: deterministic sample catalog (ID, owner, classification, PII flags, residency, retention TTL, encryption).
- `ci-validation-sample.txt`: sample validator output demonstrating a pass scenario.
- `runtime-query.json`: sample response showing runtime lookup by dataset ID.

Every artifact should be deterministic and redact secrets. Keep timestamps in ISO-8601.
