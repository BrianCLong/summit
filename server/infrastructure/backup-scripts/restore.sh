#!/bin/bash
set -e

TIMESTAMP=$1

if [ -z "$TIMESTAMP" ]; then
    echo "Usage: ./restore.sh <timestamp> or <path>"
    exit 1
fi

# S3 Download if needed
if [ ! -d "/backups/$TIMESTAMP" ] && [ ! -f "/backups/backup-$TIMESTAMP.tar.gz" ]; then
     if [ ! -z "$S3_BUCKET" ]; then
        echo "Downloading from S3..."
        AWS_ARGS=""
        if [ ! -z "$S3_ENDPOINT" ]; then
            AWS_ARGS="--endpoint-url $S3_ENDPOINT"
        fi
        aws s3 cp $AWS_ARGS "s3://$S3_BUCKET/backup-$TIMESTAMP.tar.gz" "/backups/backup-$TIMESTAMP.tar.gz"
        tar -xzf "/backups/backup-$TIMESTAMP.tar.gz" -C "/backups"
     fi
fi

# Support passing just timestamp or full path
if [ -d "/backups/$TIMESTAMP" ]; then
    BACKUP_DIR="/backups/$TIMESTAMP"
elif [ -d "$1" ]; then
    BACKUP_DIR="$1"
else
    echo "Error: Backup not found at $1 or in /backups"
    exit 1
fi

echo "Restoring from $BACKUP_DIR..."

# Postgres
echo "Restoring PostgreSQL..."
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-postgres}
PGPASSWORD=${POSTGRES_PASSWORD:-postgres}

pg_restore -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists "$BACKUP_DIR/postgres.dump"

# Redis
if [ -f "$BACKUP_DIR/redis.rdb" ]; then
    if [ -d "/redis_data" ]; then
        echo "Restoring Redis data..."
        cp "$BACKUP_DIR/redis.rdb" "/redis_data/dump.rdb"
        echo "Redis dump replaced. Attempting to restart Redis..."

        REDIS_HOST=${REDIS_HOST:-redis}

        REDIS_CLI_CMD="redis-cli -h $REDIS_HOST"
        if [ ! -z "$REDIS_PASSWORD" ] && [ "$REDIS_PASSWORD" != "devpassword" ]; then
            REDIS_CLI_CMD="$REDIS_CLI_CMD -a $REDIS_PASSWORD --no-auth-warning"
        fi

        # Shutdown redis so it restarts and reloads data
        $REDIS_CLI_CMD shutdown nosave || true
        echo "Redis shutdown signal sent. Docker should restart it automatically."
    else
        echo "Warning: /redis_data not mounted. Cannot automate Redis restore."
        echo "Manual step: Copy $BACKUP_DIR/redis.rdb to redis volume and restart redis."
    fi
else
    echo "No redis.rdb found in backup."
fi

echo "Restore completed."
