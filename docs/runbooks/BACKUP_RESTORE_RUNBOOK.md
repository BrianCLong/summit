# Backup and Restore Runbook (Postgres)

This runbook describes how to backup and restore the primary Postgres database for the CompanyOS/IntelGraph platform.

## Prerequisites

- Access to the server hosting the Docker containers.
- `docker` and `openssl` installed and available in the path.
- `BACKUP_ENCRYPTION_KEY` environment variable set (for backups) or known (for restores).

## Scripts

All scripts are located in `scripts/ops/`.

### 1. Automated Backup (`scripts/ops/backup_postgres.sh`)

This script performs the following:

1.  Connects to the `maestro-postgres` container.
2.  Runs `pg_dump` to stream the database content.
3.  Encrypts the stream using `openssl` (AES-256-CBC) with the key from `BACKUP_ENCRYPTION_KEY`.
4.  Saves the encrypted file to `backups/postgres/`.
5.  Deletes backups older than 7 days.

**Usage:**

```bash
export BACKUP_ENCRYPTION_KEY="your-secure-passphrase"
./scripts/ops/backup_postgres.sh
```

### 2. Restore (`scripts/ops/restore_postgres.sh`)

**WARNING:** This operation is destructive. It drops the public schema and recreates it from the backup.

This script:

1.  Takes the path to an encrypted backup file as an argument.
2.  Decrypts the file.
3.  Drops and recreates the `public` schema in the `maestro` database.
4.  Restores the data using `psql`.

**Usage:**

```bash
export BACKUP_ENCRYPTION_KEY="your-secure-passphrase"
./scripts/ops/restore_postgres.sh backups/postgres/maestro_backup_YYYYMMDD_HHMMSS.sql.enc
```

### 3. Drill / Verification (`scripts/ops/backup_restore_drill.sh`)

This script simulates a disaster recovery scenario without affecting the production database.

It:

1.  Runs a backup.
2.  Creates a temporary database `maestro_restore_drill`.
3.  Restores the backup to this temporary database.
4.  Verifies table counts.
5.  Drops the temporary database.

**Usage:**

```bash
./scripts/ops/backup_restore_drill.sh
```

## Evidence Artifacts

For compliance (SOC2/Audit), the drill script output serves as evidence. Capture the output:

```bash
./scripts/ops/backup_restore_drill.sh > restore_drill_evidence_$(date +%Y%m%d).log
```

The log file will contain:

- Timestamp of backup.
- Verification of backup file creation.
- Confirmation of restore success to test DB.
- Table count verification.

## Troubleshooting

- **Encryption Key Mismatch:** `bad decrypt` error from openssl. Ensure `BACKUP_ENCRYPTION_KEY` is correct.
- **Docker Connection:** Ensure user has permission to execute docker commands.
- **Disk Space:** Check available space in `backups/postgres`.
