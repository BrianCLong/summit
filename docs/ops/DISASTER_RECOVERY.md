# Disaster Recovery (Backup & Restore)

This guide documents how to run the lightweight backup and restore scripts along with the operational objectives that govern their use.

## Objectives

- **Recovery Point Objective (RPO):** _TBD_ (define after data classification and replication review).
- **Recovery Time Objective (RTO):** _TBD_ (calibrate after timed restore drills).

## Preconditions

- Access to the repository and permission to run scripts in `scripts/`.
- Adequate storage space in the target backup location.
- (Optional) PostgreSQL credentials and network access if enabling database exports/restores.

## Backup Workflow

1. Ensure the destination directory exists or can be created (the script will attempt to create it if `--output` is provided).
2. Run a dry run to validate arguments and preview actions:
   ```bash
   ./scripts/backup.sh --output /tmp/backups --dry-run
   ```
3. Execute a backup when ready (this records a manifest; PostgreSQL export remains opt-in):
   ```bash
   ./scripts/backup.sh --output /tmp/backups --include-postgres
   ```
4. To enable the PostgreSQL dump hook, set the opt-in flag (defaults to skip):
   ```bash
   INCLUDE_POSTGRES=true ENABLE_POSTGRES_DUMP=true ./scripts/backup.sh --output /tmp/backups --include-postgres
   ```

## Restore Workflow

1. Confirm you have the correct backup artifact path and ensure it is readable.
2. Run a dry run to validate the input and preview the restore steps:
   ```bash
   BACKUP_BASE=/tmp/backups ./scripts/restore.sh --dry-run conductor-backup-20240315T120000Z
   ```
3. Execute the restore when ready (PostgreSQL restore hook is disabled unless explicitly enabled):
   ```bash
   BACKUP_BASE=/tmp/backups ./scripts/restore.sh conductor-backup-20240315T120000Z
   ```
4. To opt into the PostgreSQL restore hook:
   ```bash
   BACKUP_BASE=/tmp/backups RESTORE_POSTGRES=true ./scripts/restore.sh conductor-backup-20240315T120000Z
   ```

## Validation & Monitoring

- Both scripts exit with a non-zero status on invalid inputs (missing paths, unreadable files, or unknown flags).
- Dry-run mode requires no secrets and performs only validation and planning output.
- Backup runs produce a manifest file with a timestamp to aid auditability.
- Integrate periodic DR drills by running the dry-run modes on a schedule and capturing the output in runbooks.

## Safety Notes

- Keep secrets out of command history; prefer environment variables for sensitive inputs.
- Ensure backups are stored in encrypted and access-controlled locations.
- After a restore, validate application health checks and run smoke tests before reopening user traffic.
