# Sprint 28 — Retention Evidence

This folder stores retention job artifacts for Epic C (retention and deletion pipeline).

Include:

- `retention-job-config.yaml`: declarative retention job configuration (dataset TTL and action).
- `retention-run-summary.json`: deterministic sample report summarizing deletions/archives.
- `audit-events.ndjson`: sample audit events with dataset IDs and counts.
- `legal-hold-exemptions.json`: example legal-hold exemption payload.

Every artifact should be deterministic and redact secrets. Keep timestamps in ISO-8601.
