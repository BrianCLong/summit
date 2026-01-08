# Data Rights Specification

## Data subject definition

- **Platform user**: Any authenticated account stored in the `users` table (includes analysts, admins, viewers) identified by UUID and email.
- **Analyst/operator**: A platform user performing investigations or administrative actions; treated as a platform user for data rights.
- **External person/entity**: Individuals referenced in graph data or content; outside the initial automation scope for export/deletion but noted for future expansion.

For phase 1, automation targets platform users because they map directly to primary records and audit trails.

## Supported request types (phase 1)

- **Access/Export**: Provide a machine-readable export of the requestor’s primary records and directly linked operational artifacts (user profile, role assignments, impersonation trail, audit log entries).
- **Deletion/Anonymization**: Either hard-delete or pseudonymize the same primary records while preserving referential integrity in audit history.

## System scope and limitations

- **Primary records (in scope)**: PostgreSQL tables `users`, `user_roles`, `user_impersonations`, and `audit_logs` keyed by the user’s UUID/email. These are queried and modified by the export/deletion scripts in `scripts/compliance`.
- **Operational logs (partially in scope)**: Audit logs are included; application logs, LLM traces, and observability telemetry are **not** yet wired into the automation. Manual follow-up may be required.
- **Backups/replicas (out of scope)**: Point-in-time recovery snapshots, object storage backups, and downstream analytics copies are not purged by the scripts. Standard retention/rotation policies must remove residual artifacts.
- **Other domains (out of scope for phase 1)**: Graph entities/relationships, feature flag history, moderation queue content, and Neo4j data are not exported or modified here.

## Tooling delivered in this change

- **Export**: `scripts/compliance/export-subject-data.ts` produces a JSON export for a platform user by UUID or email, including profile, roles, impersonations, and audit log events.
- **Deletion/Anonymization**: `scripts/compliance/delete-or-anonymize-subject.ts` supports dry-run reporting plus execution modes:
  - `--mode anonymize` (default): Scrubs PII on the user record, removes role mappings, and redacts audit/impersonation metadata while retaining linkability.
  - `--mode delete`: Removes impersonations and role mappings, nulls audit log foreign keys, and deletes the user row.

## Preconditions and configuration

- PostgreSQL access configured via `DATABASE_URL` or `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` environment variables. TLS can be toggled with `DB_SSL=true`.
- Scripts assume the schema from `server/db/migrations/postgres/2025-08-13_initial.sql` and `2025-11-20_admin_panel_schema.sql` is applied.

## Usage examples

```bash
# Export by email
ts-node --esm scripts/compliance/export-subject-data.ts --email alice@example.com

# Dry-run deletion/anonymization
node --loader ts-node/esm scripts/compliance/delete-or-anonymize-subject.ts --email alice@example.com --dry-run

# Execute full anonymization
ts-node --esm scripts/compliance/delete-or-anonymize-subject.ts --user-id <uuid> --mode anonymize
```

## Follow-on gaps

- Extend scope to LLM traces, observability logs, Neo4j entities, and object storage artifacts.
- Add tenant scoping and request audit logging to evidence handling of each DSAR.
- Provide structured receipts (PDF/JSON) for exports and deletion confirmations.
