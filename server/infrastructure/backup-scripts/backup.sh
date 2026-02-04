#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$TIMESTAMP"
RETENTION_DAYS=${RETENTION_DAYS:-7}
LOG_FILE="/backups/backup.log"

mkdir -p "$BACKUP_DIR"

log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Starting backup at $TIMESTAMP..."

# Postgres Backup
log "Backing up PostgreSQL..."
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-postgres}

if [ -z "$POSTGRES_PASSWORD" ]; then
    log "Warning: POSTGRES_PASSWORD not set, using default 'postgres'"
    POSTGRES_PASSWORD=postgres
fi

PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -F c -f "$BACKUP_DIR/postgres.dump"

# Redis Backup
log "Backing up Redis..."
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}

REDIS_CLI_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ ! -z "$REDIS_PASSWORD" ] && [ "$REDIS_PASSWORD" != "devpassword" ]; then
    REDIS_CLI_CMD="$REDIS_CLI_CMD -a $REDIS_PASSWORD --no-auth-warning"
fi

# Try to use --rdb if available (remote backup), otherwise warn
if $REDIS_CLI_CMD --rdb "$BACKUP_DIR/redis.rdb"; then
    log "Redis RDB backup successful."
else
    log "Warning: Redis backup failed. Ensure redis-cli is installed and accessible."
fi

# Archive
log "Archiving backup..."
tar -czf "/backups/backup-$TIMESTAMP.tar.gz" -C "/backups" "$TIMESTAMP"
rm -rf "$BACKUP_DIR"

# S3 Upload
if [ ! -z "$S3_BUCKET" ]; then
    log "Uploading to S3..."
    AWS_ARGS=""
    if [ ! -z "$S3_ENDPOINT" ]; then
        AWS_ARGS="--endpoint-url $S3_ENDPOINT"
    fi

    if aws s3 cp $AWS_ARGS "/backups/backup-$TIMESTAMP.tar.gz" "s3://$S3_BUCKET/backup-$TIMESTAMP.tar.gz"; then
        log "S3 upload successful."
    else
        log "Error: S3 upload failed."
    fi
else
    log "S3_BUCKET not set, skipping upload."
fi

# Retention Policy
log "Cleaning up local backups older than $RETENTION_DAYS days..."
find /backups -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

log "Backup completed successfully."
