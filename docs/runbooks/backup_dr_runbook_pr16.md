# Backup and DR Runbook (PR-16)

- Postgres backup: `scripts/backup/pg_neo4j_backup.sh backups/` (pg_dump placeholder)
- Neo4j backup: use `neo4j-admin backup` (see enterprise docs); placeholder recorded by script
- Schedule: nightly full + hourly WAL/transaction logs (prod)
- Restore drill: quarterly; verify ABAC/OPA policies and tenant isolation post-restore
- Audit: record backup and restore events in audit log (future)
