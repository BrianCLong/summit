# Disaster Recovery & Backup

Summit implements a robust disaster recovery (DR) strategy to ensure data durability and rapid recovery capabilities.

## Technical Implementation

The DR system resides in `server/infrastructure/disaster-recovery`. It includes automated scripts for backing up PostgreSQL and Redis.

### Key Features

- **Automated Backups**: Scheduled via Cron in a dedicated `backup-service` container.
- **Offsite Storage**: Supports streaming backups to S3-compatible storage.
- **Data Integrity**: All backups are checksummed (SHA256) and verified.
- **Metadata**: Backups include metadata manifest for auditing.

### Quick Links

- [Technical Documentation & Scripts](../../server/infrastructure/disaster-recovery/README.md)
- [Backup Script](../../server/infrastructure/disaster-recovery/backup.sh)
- [Restore Script](../../server/infrastructure/disaster-recovery/restore.sh)

## Procedures

### 1. Daily Operations

Backups run automatically at 03:00 UTC. Check logs in `backup-service` container or S3 bucket for verification.

### 2. Recovery Scenario

In the event of data loss:

1. **Identify the Recovery Point**: Choose the latest valid backup timestamp.
2. **Execute Restore**:
   ```bash
   # Enter the backup container

   docker-compose exec backup-service bash

   # Run restore

   ./restore.sh <TIMESTAMP>
   ```

3. **Verify**: Run application health checks.

## Configuration

Ensure the following environment variables are set in production:
- `S3_BUCKET`: Target bucket for offsite backups.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: Credentials with write access to the bucket.
- `RETENTION_DAYS`: Number of days to keep local backups (default: 7).
