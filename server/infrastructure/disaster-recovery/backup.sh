#!/bin/bash
set -eo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/backups"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
LOG_FILE="$BACKUP_ROOT/backup.log"
RETENTION_DAYS=${RETENTION_DAYS:-7}
NEO4J_DATA_DIR="/neo4j_data" # Mounted volume

# Ensure backup root exists
mkdir -p "$BACKUP_ROOT"

# Logging function
log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

error_handler() {
    log "ERROR: Backup failed at line $1"
    # We exit on error because of set -e, but trap allows logging
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

MAX_RETRIES=3
RETRY_DELAY=5
PG_SUCCESS=false

for i in $(seq 1 $MAX_RETRIES); do
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c -f "$BACKUP_DIR/postgres.dump"; then
        log "Postgres backup successful."
        PG_HASH=$(sha256sum "$BACKUP_DIR/postgres.dump" | cut -d ' ' -f 1)
        log "Postgres dump SHA256: $PG_HASH"
        PG_SUCCESS=true
        break
    else
        log "Postgres backup attempt $i failed. Retrying in $RETRY_DELAY seconds..."
        sleep $RETRY_DELAY
    fi
done

if [ "$PG_SUCCESS" = false ]; then
    log "Error: Postgres backup failed after $MAX_RETRIES attempts."
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

# Try trigger save
$REDIS_CLI_CMD BGSAVE || true

REDIS_SUCCESS=false
for i in $(seq 1 $MAX_RETRIES); do
    if $REDIS_CLI_CMD --rdb "$BACKUP_DIR/redis.rdb"; then
        log "Redis RDB backup successful."
        REDIS_HASH=$(sha256sum "$BACKUP_DIR/redis.rdb" | cut -d ' ' -f 1)
        log "Redis RDB SHA256: $REDIS_HASH"
        REDIS_SUCCESS=true
        break
    else
        log "Redis backup attempt $i failed. Retrying..."
        sleep $RETRY_DELAY
    fi
done

if [ "$REDIS_SUCCESS" = false ]; then
    log "Warning: Redis backup failed. Continuing..."
fi

# Neo4j Raw File Backup (Fail-safe)
if [ -d "$NEO4J_DATA_DIR" ]; then
    log "Backing up Neo4j data directory (Raw File Copy)..."
    # Warning: This is not consistent if Neo4j is writing!
    # But it's better than nothing for disaster recovery.

    mkdir -p "$BACKUP_DIR/neo4j_raw"
    if tar -czf "$BACKUP_DIR/neo4j_raw.tar.gz" -C "$NEO4J_DATA_DIR" .; then
        log "Neo4j raw backup successful."
        NEO_HASH=$(sha256sum "$BACKUP_DIR/neo4j_raw.tar.gz" | cut -d ' ' -f 1)
        log "Neo4j raw SHA256: $NEO_HASH"
    else
        log "Error: Neo4j raw backup failed."
    fi
else
    log "Warning: Neo4j data directory not found at $NEO4J_DATA_DIR. Skipping raw backup."
fi

# Archive
log "Archiving backup..."
ARCHIVE_NAME="backup-$TIMESTAMP.tar.gz"
tar -czf "$BACKUP_ROOT/$ARCHIVE_NAME" -C "$BACKUP_ROOT" "$TIMESTAMP"

# Calculate Archive Hash
ARCHIVE_HASH=$(sha256sum "$BACKUP_ROOT/$ARCHIVE_NAME" | cut -d ' ' -f 1)
log "Archive SHA256: $ARCHIVE_HASH"

# Cleanup Temp
rm -rf "$BACKUP_DIR"

# S3 Upload (Improved)
if [ ! -z "$S3_BUCKET" ]; then
    log "Uploading to S3..."
    AWS_ARGS=""
    if [ ! -z "$S3_ENDPOINT" ]; then
        AWS_ARGS="--endpoint-url $S3_ENDPOINT"
    fi

    S3_SUCCESS=false
    for i in $(seq 1 $MAX_RETRIES); do
        if aws s3 cp $AWS_ARGS "$BACKUP_ROOT/$ARCHIVE_NAME" "s3://$S3_BUCKET/$ARCHIVE_NAME"; then
             log "S3 upload successful."
             # Checksum
             echo "$ARCHIVE_HASH  $ARCHIVE_NAME" > "$BACKUP_ROOT/$ARCHIVE_NAME.sha256"
             aws s3 cp $AWS_ARGS "$BACKUP_ROOT/$ARCHIVE_NAME.sha256" "s3://$S3_BUCKET/$ARCHIVE_NAME.sha256"
             S3_SUCCESS=true
             break
        else
             log "S3 upload attempt $i failed. Retrying..."
             sleep $RETRY_DELAY
        fi
    done

    if [ "$S3_SUCCESS" = false ]; then
        log "Error: S3 upload failed after retries."
        exit 1
    fi
else
    log "S3_BUCKET not set, skipping upload."
fi

# Retention Policy
log "Cleaning up local backups older than $RETENTION_DAYS days..."
find "$BACKUP_ROOT" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_ROOT" -name "backup-*.sha256" -mtime +$RETENTION_DAYS -delete

# Verify
log "Running backup verification..."
if /scripts/verify_backup.sh; then
    log "Backup verification passed."
else
    log "ERROR: Backup verification FAILED."
    exit 1
fi

log "Backup completed successfully."
