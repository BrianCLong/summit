#!/bin/bash
# Redis restore script
set -euo pipefail

echo "Running Redis restore..."

BACKUP_DIR_HOST=./backups/redis
REDIS_DATA_DIR_CONTAINER=/data

# Check for a backup file argument
if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_redis_backup.rdb>" >&2
  echo "Example: $0 ./backups/redis/redis-20231027123456.rdb" >&2
  exit 1
fi

BACKUP_FILE_PATH=$1

if [ ! -f "$BACKUP_FILE_PATH" ]; then
  echo "Error: Backup file not found at $BACKUP_FILE_PATH" >&2
  exit 1
fi

# Stop Redis service
echo "Stopping Redis service..."
docker-compose -f docker-compose.dev.yml stop redis

# Copy the backup file into the Redis container's data directory
echo "Copying $BACKUP_FILE_PATH to Redis container..."
docker-compose -f docker-compose.dev.yml cp "$BACKUP_FILE_PATH" redis:"${REDIS_DATA_DIR_CONTAINER}/dump.rdb"

# Start Redis service
echo "Starting Redis service..."
docker-compose -f docker-compose.dev.yml start redis

echo "Redis restore complete."
