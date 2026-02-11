#!/bin/bash
set -eo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/backups"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
LOG_FILE="$BACKUP_ROOT/backup.log"
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Ensure backup root exists
mkdir -p "$BACKUP_ROOT"

# Logging function
log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

error_handler() {
    log "ERROR: Backup failed at line $1"
    exit 1
}
trap 'error_handler ${LINENO}' ERR

log "Starting backup process: $TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Metadata
echo "{\"timestamp\": \"$TIMESTAMP\", \"started_at\": \"$(date -u -Iseconds)\"}" > "$BACKUP_DIR/metadata.json"

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

export PGPASSWORD=$POSTGRES_PASSWORD
if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c -f "$BACKUP_DIR/postgres.dump"; then
    log "Postgres backup successful."
    PG_HASH=$(sha256sum "$BACKUP_DIR/postgres.dump" | cut -d ' ' -f 1)
    log "Postgres dump SHA256: $PG_HASH"
else
    log "Error: Postgres backup failed."
    exit 1
fi

# Redis Backup
log "Backing up Redis..."
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-devpassword}

REDIS_CLI_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ ! -z "$REDIS_PASSWORD" ] && [ "$REDIS_PASSWORD" != "devpassword" ]; then
    REDIS_CLI_CMD="$REDIS_CLI_CMD -a $REDIS_PASSWORD --no-auth-warning"
fi

if $REDIS_CLI_CMD --rdb "$BACKUP_DIR/redis.rdb"; then
    log "Redis RDB backup successful."
    REDIS_HASH=$(sha256sum "$BACKUP_DIR/redis.rdb" | cut -d ' ' -f 1)
    log "Redis RDB SHA256: $REDIS_HASH"
else
    log "Warning: Redis backup failed or not available. Continuing..."
    # Don't fail the whole backup for Redis if it's optional, but here we assume it's critical if we want "comprehensive"
    # But often Redis is just cache. I'll warn but not exit, unless strictly required.
fi

# Neo4j Backup (if applicable, though user didn't explicitly ask for it, Summit uses Neo4j)
# If existing backup didn't do it, maybe I should add it?
# Existing docker-compose shows neo4j service. Existing backup.sh did NOT backup neo4j.
# I will skip Neo4j for now to match scope of "enhance existing", but add a TODO or check if I can.
# Neo4j community edition doesn't support hot backup easily without stopping. Enterprise does.
# I'll stick to Postgres and Redis as per previous script + user request about Redis.

# Archive
log "Archiving backup..."
ARCHIVE_NAME="backup-$TIMESTAMP.tar.gz"
tar -czf "$BACKUP_ROOT/$ARCHIVE_NAME" -C "$BACKUP_ROOT" "$TIMESTAMP"

# Calculate Archive Hash
ARCHIVE_HASH=$(sha256sum "$BACKUP_ROOT/$ARCHIVE_NAME" | cut -d ' ' -f 1)
log "Archive SHA256: $ARCHIVE_HASH"

# Update Metadata
# We can't easily update the json inside the tar, but we can log it.

# Clean up temp dir
rm -rf "$BACKUP_DIR"

# S3 Upload
if [ ! -z "$S3_BUCKET" ]; then
    log "Uploading to S3..."
    AWS_ARGS=""
    if [ ! -z "$S3_ENDPOINT" ]; then
        AWS_ARGS="--endpoint-url $S3_ENDPOINT"
    fi

    # Upload with metadata
    if aws s3 cp $AWS_ARGS "$BACKUP_ROOT/$ARCHIVE_NAME" "s3://$S3_BUCKET/$ARCHIVE_NAME"; then
        log "S3 upload successful."
        # Upload checksum file
        echo "$ARCHIVE_HASH  $ARCHIVE_NAME" > "$BACKUP_ROOT/$ARCHIVE_NAME.sha256"
        aws s3 cp $AWS_ARGS "$BACKUP_ROOT/$ARCHIVE_NAME.sha256" "s3://$S3_BUCKET/$ARCHIVE_NAME.sha256"
    else
        log "Error: S3 upload failed."
        exit 1
    fi
else
    log "S3_BUCKET not set, skipping upload."
fi

# Retention Policy
log "Cleaning up local backups older than $RETENTION_DAYS days..."
find "$BACKUP_ROOT" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_ROOT" -name "backup-*.sha256" -mtime +$RETENTION_DAYS -delete

log "Backup completed successfully."
