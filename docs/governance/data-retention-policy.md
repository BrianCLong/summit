Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Data Retention & Purge Policy

**Scope**: all tenants, all environments. Applies to node/edge records, files, telemetry, and audit trails.

## Classes & Defaults

| Class       | Examples                         | Default Retention | Legal Basis      |                    Notes |
| ----------- | -------------------------------- | ----------------: | ---------------- | -----------------------: |
| Operational | case entities, edges, provenance |           3 years | contract/consent | extend per case law hold |
| Audit       | access logs, reason-for-access   |           7 years | compliance       |          immutable store |
| Telemetry   | traces/metrics/logs              |           90 days | performance      |       aggregate past 90d |
| Backups     | DB snapshots                     |           35 days | DR/BCP           |  encrypted, cross-region |

Zero-trust policy decision events are mirrored onto the audit bus and SIEM with the same **7-year** retention, using the tamper-evident chain shown in `artifacts/logs/policy-decision-audit-sample.json`.

## Dual-Control Deletion

- Deletions require **two approvers** (data owner + ombuds) and leave a tombstone with reason code.

## Per-Tenant Overrides

- Tenants may configure stricter limits; never weaker than global.

## Enforcement

- Policy enforced via scheduled jobs that mark and purge by retention class; audit logged.
