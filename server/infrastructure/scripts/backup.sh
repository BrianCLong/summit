#!/bin/sh

# IntelGraph Database Backup Script
# Runs automated backups for Neo4j, PostgreSQL, and Redis

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
LOG_FILE="$BACKUP_DIR/backup_$TIMESTAMP.log"

echo "Starting backup at $(date)" | tee -a $LOG_FILE

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR/neo4j
mkdir -p $BACKUP_DIR/postgres
mkdir -p $BACKUP_DIR/redis

# Install required tools
apk add --no-cache postgresql-client curl

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Neo4j Backup
log "Starting Neo4j backup..."
if curl -s -u "neo4j:$NEO4J_PASSWORD" \
   -X POST "$NEO4J_HOST:7474/db/manage/server/backup" \
   -H "Content-Type: application/json" \
   -d '{"destination": "/backups/neo4j/neo4j_backup_'$TIMESTAMP'.backup"}'; then
    log "Neo4j backup completed successfully"
else
    log "Neo4j backup failed"
fi

# PostgreSQL Backup
log "Starting PostgreSQL backup..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
    -h $POSTGRES_HOST \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --format=custom \
    --file="$BACKUP_DIR/postgres/postgres_backup_$TIMESTAMP.dump"

if [ $? -eq 0 ]; then
    log "PostgreSQL backup completed successfully"
else
    log "PostgreSQL backup failed"
    exit 1
fi

# Redis Backup
log "Starting Redis backup..."
if redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD BGSAVE; then
    sleep 10  # Wait for background save to complete
    
    # Copy the RDB file
    if [ -f /redis_data/dump.rdb ]; then
        cp /redis_data/dump.rdb "$BACKUP_DIR/redis/redis_backup_$TIMESTAMP.rdb"
        log "Redis backup completed successfully"
    else
        log "Redis RDB file not found"
    fi
else
    log "Redis backup failed"
fi

# Compress backups
log "Compressing backups..."
cd $BACKUP_DIR
tar -czf "intelgraph_backup_$TIMESTAMP.tar.gz" \
    neo4j/neo4j_backup_$TIMESTAMP.backup \
    postgres/postgres_backup_$TIMESTAMP.dump \
    redis/redis_backup_$TIMESTAMP.rdb \
    2>/dev/null || true

# Clean up old backups (keep last 7 days)
log "Cleaning up old backups..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR/neo4j -name "*.backup" -mtime +7 -delete
find $BACKUP_DIR/postgres -name "*.dump" -mtime +7 -delete
find $BACKUP_DIR/redis -name "*.rdb" -mtime +7 -delete

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/intelgraph_backup_$TIMESTAMP.tar.gz" 2>/dev/null | cut -f1 || echo "unknown")
log "Backup completed. Size: $BACKUP_SIZE"

# Send notification (if webhook URL is configured)
if [ ! -z "$BACKUP_WEBHOOK_URL" ]; then
    curl -X POST "$BACKUP_WEBHOOK_URL" \
         -H "Content-Type: application/json" \
         -d "{\"message\": \"IntelGraph backup completed\", \"timestamp\": \"$TIMESTAMP\", \"size\": \"$BACKUP_SIZE\"}" \
         2>/dev/null || log "Failed to send backup notification"
fi

log "Backup process finished at $(date)"