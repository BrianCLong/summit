# Data Retention & Purge Policy

**Scope**: all tenants, all environments. Applies to node/edge records, files, telemetry, and audit trails.

## Classes & Defaults

| Class       | Examples                         | Default Retention | Legal Basis      |                    Notes |
| ----------- | -------------------------------- | ----------------: | ---------------- | -----------------------: |
| Operational | case entities, edges, provenance |           3 years | contract/consent | extend per case law hold |
| Audit       | access logs, reason-for-access   |           7 years | compliance       |          immutable store |
| Telemetry   | traces/metrics/logs              |           90 days | performance      |       aggregate past 90d |
| Backups     | DB snapshots                     |           35 days | DR/BCP           |  encrypted, cross-region |

## Decision Audit Bus

- AuthZ gateway decision events (tamper-evident, HMAC-chained JSONL) inherit the **Audit** retention of seven years; preserve chain anchors alongside raw files (see `services/authz-gateway/tests/fixtures/decision-audit-sample.jsonl` for the canonical shape).
- Rotate `AUDIT_HMAC_KEY` on schedule; keep prior keys escrowed to verify historic chains without rewriting existing logs.

## Dual-Control Deletion

- Deletions require **two approvers** (data owner + ombuds) and leave a tombstone with reason code.

## Per-Tenant Overrides

- Tenants may configure stricter limits; never weaker than global.

## Enforcement

- Policy enforced via scheduled jobs that mark and purge by retention class; audit logged.
