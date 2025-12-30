# Sprint 28 — Data Catalog Evidence

This folder stores validation artifacts for Epic A (data classification and policy annotations).

Include:

- `schema.json`: authoritative schema for catalog entries.
- `catalog.sample.json` or YAML demonstrating dataset metadata (ID, owner, classification, PII flags, residency, retention TTL, encryption).
- `ci-validation.log`: output from the CI validator proving it blocks uncataloged datasets and mismatches.
- `runtime-query.json`: sample response showing runtime lookup by dataset ID.

Every artifact should be deterministic and redact secrets. Keep timestamps in ISO-8601.
