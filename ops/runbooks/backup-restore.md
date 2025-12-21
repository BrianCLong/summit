# Backup/Restore
- Nightly logical backups via `pg_dump` to object storage (AES256).
- Restore drill monthly: create temp DB, restore, run verifier CLI on manifests.
