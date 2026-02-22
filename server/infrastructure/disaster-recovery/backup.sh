#!/bin/bash
set -eo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="./tmp_backups"
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

if command -v redis-cli &> /dev/null; then
    REDIS_CLI_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
    if [ ! -z "$REDIS_PASSWORD" ] && [ "$REDIS_PASSWORD" != "devpassword" ]; then
        REDIS_CLI_CMD="$REDIS_CLI_CMD -a $REDIS_PASSWORD --no-auth-warning"
    fi

    log "Triggering Redis RDB transfer..."
    if $REDIS_CLI_CMD --rdb "$BACKUP_DIR/redis.rdb"; then
        log "Redis RDB backup successful."
        REDIS_HASH=$(sha256sum "$BACKUP_DIR/redis.rdb" | cut -d ' ' -f 1)
        log "Redis RDB SHA256: $REDIS_HASH"
    else
        log "Warning: Redis backup command failed. Check connection or permissions."
    fi
else
    log "Warning: redis-cli not found. Skipping Redis backup."
fi

# Neo4j Backup
log "Backing up Neo4j..."
NEO4J_BACKED_UP=false

# Attempt Logical Export if cypher-shell is available (Preferred for consistency)
if command -v cypher-shell &> /dev/null; then
    log "cypher-shell found. Attempting logical export (APOC)..."
    NEO4J_USER=${NEO4J_USER:-neo4j}
    NEO4J_PASSWORD=${NEO4J_PASSWORD:-test1234}
    NEO4J_URI=${NEO4J_URI:-bolt://neo4j:7687}

    # Try APOC export
    if cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" "CALL apoc.export.json.all(null, {stream:true}) YIELD data RETURN data" > "$BACKUP_DIR/neo4j_export.json" 2>/dev/null; then
         if [ -s "$BACKUP_DIR/neo4j_export.json" ]; then
             log "Neo4j logical export successful."
             NEO4J_BACKED_UP=true
         else
             log "Neo4j logical export empty (APOC might be missing). Falling back to volume backup."
             rm -f "$BACKUP_DIR/neo4j_export.json"
         fi
    else
         log "Neo4j cypher-shell execution failed. Falling back to volume backup."
    fi
fi

if [ "$NEO4J_BACKED_UP" = false ]; then
    if [ -d "/neo4j_data" ]; then
        log "Archiving /neo4j_data (Volume Backup)..."
        # Create archive of the mounted volume
        if tar -czf "$BACKUP_DIR/neo4j_data.tar.gz" -C / neo4j_data; then
            log "Neo4j volume backup successful."
            NEO4J_HASH=$(sha256sum "$BACKUP_DIR/neo4j_data.tar.gz" | cut -d ' ' -f 1)
            log "Neo4j SHA256: $NEO4J_HASH"
        else
            log "Error: Neo4j volume backup failed."
            exit 1
        fi
    else
        log "Warning: /neo4j_data not found and cypher-shell unavailable. Skipping Neo4j backup."
    fi
fi

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
        AWS_ARGS="$AWS_ARGS --endpoint-url $S3_ENDPOINT"
    fi

    if [ ! -z "$S3_REGION" ]; then
        AWS_ARGS="$AWS_ARGS --region $S3_REGION"
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
if /scripts/verify_backup.sh; then
    log "Backup verification passed."
else
    log "ERROR: Backup verification FAILED."
    exit 1
fi

log "Backup completed successfully."
