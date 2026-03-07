# Data Lifecycle & Retention Policy

This document establishes retention, minimization, and purge guidelines across IntelGraph data stores. It focuses on low-risk enforcement surfaces (audit/event logs and Copilot traces) while keeping all destructive routines disabled by default via dry-run execution.

## Inventory and PII touchpoints

- **Postgres**
  - `users` contains account metadata including names, email, role, activity timestamps, and IPs captured during access events.
  - `audit_logs` and `admin_activity_log` capture requester identity, IP address, user agent, resource identifiers, and action metadata.
  - Copilot persistence (`copilot_runs`, `copilot_tasks`, `copilot_events`) stores prompts, plans, and intermediate LLM outputs that can contain free-form PII.
  - Compliance/audit tables (e.g., HIPAA access logs, data deletion logs) track identifiers needed for regulatory evidence.
- **Neo4j**: graph entities/relationships can embed identifiers and relationships that may reference people, organizations, or devices.
- **LLM intermediates**: Copilot events/payloads and run plans can include raw prompts, references to investigators, and tenant context.
- **Caches/queues**: Redis is used for ephemeral caching and instrumentation; caches should remain short-lived and never store long-lived secrets.

## Retention schedule (authoritative defaults)

| Data category                                   | Location                                                 | Retention rule                                                     | Notes                                                                       |
| ----------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Security/audit logs                             | Postgres `audit_logs`                                    | 180 days, then eligible for deletion                               | TTL captured via `retention_expires_at` column and enforced by purge job.   |
| Admin activity + authorization evidence         | Postgres `admin_activity_log`, `authorization_audit_log` | 180 days, then purge or archive per regulator needs                | Same 180-day posture as audit logs; extend only with explicit approval.     |
| Copilot event stream (LLM intermediate outputs) | Postgres `copilot_events`                                | 30 days, then delete                                               | TTL stored in `expires_at` to protect prompts/responses.                    |
| Copilot run metadata                            | Postgres `copilot_runs`                                  | 180 days, then anonymize plan/metadata/goal text                   | Keeps operational lineage while stripping PII-heavy payloads.               |
| Feature/config history                          | Postgres `feature_flag_history`, similar history tables  | 365 days                                                           | Retain change control evidence; redact requester identifiers on DSAR.       |
| Session/auth tokens & cached lookups            | Redis                                                    | ≤7 days (prefer hours)                                             | Keep TTL on access/session caches; tokens beyond 7d must be rotated.        |
| Operational event logs                          | File/telemetry sinks                                     | 30 days                                                            | Export older telemetry to cold storage with identifiers hashed/anonymized.  |
| Backups                                         | Encrypted object storage                                 | 35 days rolling backups; ensure purge mirrors production retention | Backups must inherit deletions within 35 days and remain encrypted at rest. |

## Minimization and anonymization strategy

- Favor **explicit TTL columns** on log- and prompt-bearing tables so purge automation can trim safely.
- **Strip or hash identifiers** (emails, names, IPs, tokens, device IDs) before moving data into long-term analytics stores.
- For LLM traces, **truncate payloads** to the minimal context needed for quality review; prefer structured metadata over raw prompts.
- Apply **soft anonymization** (nulling/redacting text and JSON payloads) after retention windows while keeping operational keys for lineage.

## Enforcement controls added in this phase

- **TTL columns**: `audit_logs.retention_expires_at` (180 days) and `copilot_events.expires_at` (30 days) now backfill existing data and default new rows for purge scans.
- **Purge job** (`scripts/jobs/purge-stale-data.ts`)
  - Dry-run by default; use `--apply` to perform changes and `--only <target>` to scope a single table.
  - Deletes expired audit/copilot events and anonymizes aged Copilot runs (redacts `goal_text`, `plan`, `metadata`).
  - Enforces batch caps (`--max-batch`) and refuses to run without an expiry condition.
- **Safe scope**: Changes target log/trace surfaces only; no production data is removed unless explicitly run with `--apply`.

## Backups and legal considerations

- Backups must be encrypted at rest and in transit; access limited to designated operators.
- Restores must respect deletion/anonymization commitments within 35 days to satisfy GDPR/CCPA right-to-erasure timelines.
- This policy is non-binding legal advice and must be reviewed with counsel for jurisdiction-specific requirements.

## Operational runbook

1. Ensure `DATABASE_URL`/`POSTGRES_URL` is set and points to a non-production environment when testing.
2. Run purge job in dry-run mode (default): `pnpm ts-node scripts/jobs/purge-stale-data.ts`.
3. Review reported candidates and batch sizes; adjust `--max-batch` or `--only` if needed.
4. Execute with `--apply` once validated; monitor database metrics and retention audit logs for confirmation.
5. Document each execution in the compliance run log with timestamp, operator, and batch outcomes.
