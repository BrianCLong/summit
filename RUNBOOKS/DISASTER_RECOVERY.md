# Disaster Recovery Runbook

## Overview
Summit uses a Point-In-Time Recovery (PITR) strategy for its primary PostgreSQL database. This allows restoring the database to any specific second within the retention window (default 7 days).

## Architecture
- **Database**: PostgreSQL 16 with `pgvector` and `pg_partman`.
- **Archiving**: `WAL-G` streams Write-Ahead Logs (WAL) to S3 continuously.
- **Base Backups**: Full backups are taken daily.

## Backup Verification
Check the logs of the `postgres-pitr` container to ensure archives are being pushed successfully.
```bash
docker logs summit-postgres-pitr | grep "WAL-G"
```

## Recovery Procedure

### 1. Identify Target Time
Determine the exact timestamp you want to restore to (e.g., just before an accidental deletion).
Format: `YYYY-MM-DDTHH:MM:SSZ` (UTC).

### 2. Stop the Database
Stop the running database container to prevent further data changes.
```bash
docker stop summit-postgres-pitr
```

### 3. Run Restoration
Use the `pitr-restore.sh` script inside the container to restore data to the volume.

**Example:**
```bash
# Ensure you have the correct image name (check docker-compose.pitr.yml build)
IMAGE_NAME=$(docker inspect --format='{{.Config.Image}}' summit-postgres-pitr)

docker run --rm -it \
  --volumes-from summit-postgres-pitr \
  --env-file .env \
  -e TARGET_TIME="2025-02-10T14:30:00Z" \
  $IMAGE_NAME \
  /usr/local/bin/pitr-restore.sh
```
*Note: Ensure `.env` contains necessary AWS credentials and WALG config.*

### 4. Verify and Restart
After restoration, start the database. It will perform recovery and promote itself to primary.
```bash
docker start summit-postgres-pitr
```
Check logs to confirm it has reached a consistent state.

## Troubleshooting
- **Missing WAL files**: If restoration fails due to missing WAL files, check S3 bucket directly.
- **Permission Errors**: Ensure AWS credentials have `s3:ListBucket`, `s3:GetObject`, and `s3:PutObject` permissions.
