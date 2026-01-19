#!/bin/bash
set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/redis}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
# Note: In a containerized env, we might just copy the dump.rdb file from the volume.
# This script assumes we have access to redis-cli and potentially the filesystem.
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "Starting Redis backup at $DATE..."

if ! command -v redis-cli &> /dev/null; then
    echo "Error: redis-cli is not installed."
    exit 1
fi

AUTH_ARGS=""
if [ -n "$REDIS_PASSWORD" ]; then
    AUTH_ARGS="-a $REDIS_PASSWORD"
fi

# Get the last save time BEFORE triggering the new save
LAST_SAVE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $AUTH_ARGS LASTSAVE)

# Trigger a background save
echo "Triggering BGSAVE..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $AUTH_ARGS BGSAVE

# Wait for BGSAVE to finish
echo "Waiting for BGSAVE to complete..."
CURRENT_SAVE=$LAST_SAVE
while [ "$CURRENT_SAVE" == "$LAST_SAVE" ]; do
    sleep 1
    CURRENT_SAVE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $AUTH_ARGS LASTSAVE)
done

echo "BGSAVE completed. New save time: $CURRENT_SAVE"

# In a real scenario, we would now copy the dump.rdb file.
# Since we might be running outside the container, we can't easily access /data/dump.rdb directly
# unless it's mounted.
# Alternatively, we can use the --rdb option if available or just assume the volume is backed up separately.

# For this script, we'll simulate the "export" by noting that persistence is handled by the volume,
# but we can try to copy it if we know the path (e.g. mounted volume).

# Assuming a mounted volume path might be provided:
REDIS_DATA_DIR="${REDIS_DATA_DIR:-./redis_data}"

if [ -f "$REDIS_DATA_DIR/dump.rdb" ]; then
    cp "$REDIS_DATA_DIR/dump.rdb" "$BACKUP_DIR/redis_dump_${DATE}.rdb"
    if [ -f "$REDIS_DATA_DIR/appendonly.aof" ]; then
        cp "$REDIS_DATA_DIR/appendonly.aof" "$BACKUP_DIR/redis_appendonly_${DATE}.aof"
    fi
    echo "Backup files copied to $BACKUP_DIR"
else
    echo "Warning: dump.rdb not found at $REDIS_DATA_DIR. If running in Docker, ensure the volume is mounted."
    echo "Redis data is persisted on disk by the server."
fi

# Rotate old backups
find "$BACKUP_DIR" -name "redis_dump_*.rdb" -mtime +7 -delete
echo "Old backups cleaned up."
