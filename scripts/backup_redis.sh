#!/bin/bash
set -e

# Redis Backup Script
# Usage: ./backup_redis.sh [container_name] [destination_dir]

CONTAINER_NAME=${1:-maestro-redis}
DEST_DIR=${2:-./backups/redis}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="dump_${TIMESTAMP}.rdb"

mkdir -p "$DEST_DIR"

echo "Starting Redis backup from container $CONTAINER_NAME..."

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Error: Container $CONTAINER_NAME is not running."
    exit 1
fi

echo "Triggering BGSAVE..."
REDIS_CMD="redis-cli"
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CMD="redis-cli -a $REDIS_PASSWORD --no-auth-warning"
fi

docker exec "$CONTAINER_NAME" sh -c "$REDIS_CMD bgsave"

echo "Waiting for BGSAVE to complete..."
while true; do
    IN_PROGRESS=$(docker exec "$CONTAINER_NAME" sh -c "$REDIS_CMD info persistence" | grep rdb_bgsave_in_progress | tr -d '\r' | cut -d: -f2)
    if [ "$IN_PROGRESS" == "0" ]; then
        break
    fi
    echo "Backup in progress..."
    sleep 2
done

# Copy the dump file
echo "Copying dump.rdb to $DEST_DIR/$BACKUP_FILE..."
docker cp "$CONTAINER_NAME":/data/dump.rdb "$DEST_DIR/$BACKUP_FILE"

echo "Backup completed: $DEST_DIR/$BACKUP_FILE"
