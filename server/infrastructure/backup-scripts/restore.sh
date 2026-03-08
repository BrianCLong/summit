#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <timestamp_folder>"
    exit 1
fi

TIMESTAMP=$1
BACKUP_DIR="/backups/$TIMESTAMP"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory $BACKUP_DIR does not exist."
    exit 1
fi

echo "Starting restore from $BACKUP_DIR..."

# Postgres Restore
echo "Restoring PostgreSQL..."
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-postgres}

if [ -z "$POSTGRES_PASSWORD" ]; then
    POSTGRES_PASSWORD=postgres
fi

# pg_restore with --clean drops objects before recreating them
PGPASSWORD=$POSTGRES_PASSWORD pg_restore -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists "$BACKUP_DIR/postgres.dump"

echo "Redis restore requires manual steps to replace the dump.rdb file and restart the service."
echo "Redis RDB file is available at: $BACKUP_DIR/redis.rdb"

echo "Restore completed (Postgres restored, Redis manual step required)."
