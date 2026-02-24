#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $TIMESTAMP..."

# Postgres Backup
echo "Backing up PostgreSQL..."
# Defaults if not set
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-postgres}

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "Warning: POSTGRES_PASSWORD not set, using default 'postgres'"
    POSTGRES_PASSWORD=postgres
fi

PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -F c -f "$BACKUP_DIR/postgres.dump"

# Redis Backup
echo "Backing up Redis..."
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}

REDIS_CLI_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ ! -z "$REDIS_PASSWORD" ] && [ "$REDIS_PASSWORD" != "devpassword" ]; then
    REDIS_CLI_CMD="$REDIS_CLI_CMD -a $REDIS_PASSWORD --no-auth-warning"
fi

# Try to use --rdb if available (remote backup), otherwise warn
if $REDIS_CLI_CMD --rdb "$BACKUP_DIR/redis.rdb"; then
    echo "Redis RDB backup successful."
else
    echo "Warning: Redis backup failed. Ensure redis-cli is installed and accessible."
fi

echo "Backup completed successfully at $BACKUP_DIR"
