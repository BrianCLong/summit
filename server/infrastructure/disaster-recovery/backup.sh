#!/bin/bash
set -eo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/backups"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
LOG_FILE="$BACKUP_ROOT/backup.log"
RETENTION_DAYS=${RETENTION_DAYS:-7}
VERSION="1.0.0"

# Ensure backup root exists
mkdir -p "$BACKUP_ROOT"

# Logging function
log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

notify() {
    local status="$1"
    local message="$2"
    if [ ! -z "$WEBHOOK_URL" ]; then
        log "Sending notification..."
        curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"status\": \"$status\", \"message\": \"$message\", \"timestamp\": \"$TIMESTAMP\"}" \
            "$WEBHOOK_URL" || log "Warning: Failed to send notification"
    fi
}

error_handler() {
    log "ERROR: Backup failed at line $1"
    notify "error" "Backup failed at line $1"
    exit 1
}
trap 'error_handler ${LINENO}' ERR

log "Starting backup process: $TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Initialize hashes
PG_HASH=""
REDIS_HASH=""
NEO4J_HASH=""

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

# Use --rdb to save to specific file. Note: This requires redis-cli to support --rdb (Redis 3+)
if $REDIS_CLI_CMD --rdb "$BACKUP_DIR/redis.rdb"; then
    log "Redis RDB backup successful."
    REDIS_HASH=$(sha256sum "$BACKUP_DIR/redis.rdb" | cut -d ' ' -f 1)
    log "Redis RDB SHA256: $REDIS_HASH"
else
    log "Warning: Redis backup failed or not available. Continuing..."
    REDIS_HASH="FAILED"
fi

# Neo4j Backup
log "Backing up Neo4j..."
if [ -d "/neo4j_data" ]; then
    log "Archiving /neo4j_data..."
    # Create archive of the mounted volume
    if tar -czf "$BACKUP_DIR/neo4j_data.tar.gz" -C / neo4j_data; then
        log "Neo4j backup successful."
        NEO4J_HASH=$(sha256sum "$BACKUP_DIR/neo4j_data.tar.gz" | cut -d ' ' -f 1)
        log "Neo4j SHA256: $NEO4J_HASH"
    else
        log "Error: Neo4j backup failed."
        exit 1
    fi
else
    log "Warning: /neo4j_data not found. Skipping Neo4j backup."
    NEO4J_HASH="SKIPPED"
fi

# Create Metadata JSON
cat <<EOF > "$BACKUP_DIR/metadata.json"
{
  "version": "$VERSION",
  "timestamp": "$TIMESTAMP",
  "created_at": "$(date -u -Iseconds)",
  "hashes": {
    "postgres": "$PG_HASH",
    "redis": "$REDIS_HASH",
    "neo4j": "$NEO4J_HASH"
  }
}
EOF
log "Metadata file created."

# Archive
log "Archiving backup..."
ARCHIVE_NAME="backup-$TIMESTAMP.tar.gz"
tar -czf "$BACKUP_ROOT/$ARCHIVE_NAME" -C "$BACKUP_ROOT" "$TIMESTAMP"

# Calculate Archive Hash
ARCHIVE_HASH=$(sha256sum "$BACKUP_ROOT/$ARCHIVE_NAME" | cut -d ' ' -f 1)
log "Archive SHA256: $ARCHIVE_HASH"

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

# Verify Backup
log "Running backup verification..."
# Assuming scripts are in /scripts inside the container
VERIFY_SCRIPT="/scripts/verify_backup.sh"
if [ ! -f "$VERIFY_SCRIPT" ]; then
    # Fallback if running outside container or different path
    VERIFY_SCRIPT="$(dirname "$0")/verify_backup.sh"
fi

if [ -f "$VERIFY_SCRIPT" ]; then
    if $VERIFY_SCRIPT; then
        log "Backup verification passed."
        notify "success" "Backup $ARCHIVE_NAME completed successfully."
    else
        log "ERROR: Backup verification FAILED."
        notify "failure" "Backup $ARCHIVE_NAME verification failed."
        exit 1
    fi
else
    log "Warning: verify_backup.sh not found. Skipping verification."
fi

log "Backup completed successfully."
