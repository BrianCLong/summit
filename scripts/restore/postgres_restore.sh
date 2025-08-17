#!/bin/bash
# PostgreSQL restore script
set -euo pipefail

echo "Running PostgreSQL restore..."

BACKUP_DIR_CONTAINER=/backups

POSTGRES_DB=${POSTGRES_DB:-intelgraph_dev}
POSTGRES_USER=${POSTGRES_USER:-intelgraph}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-devpassword}

# Check for a backup file argument
if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_postgres_backup.sql>" >&2
  echo "Example: $0 ./backups/postgres/postgres-backup-20231027123456.sql" >&2
  exit 1
fi

BACKUP_FILE_PATH=$1
BACKUP_FILENAME=$(basename "$BACKUP_FILE_PATH")

if [ ! -f "$BACKUP_FILE_PATH" ]; then
  echo "Error: Backup file not found at $BACKUP_FILE_PATH" >&2
  exit 1
}

# Stop PostgreSQL service
echo "Stopping PostgreSQL service..."
docker-compose -f docker-compose.dev.yml stop postgres

# Remove existing data volume to ensure a clean restore
echo "Removing existing PostgreSQL data volume..."
docker-compose -f docker-compose.dev.yml rm -sv postgres

# Start PostgreSQL service to recreate the volume and initialize the database
echo "Starting PostgreSQL service to recreate volume and initialize database..."
docker-compose -f docker-compose.dev.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready for restore..."
local max_attempts=30
local attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        echo "PostgreSQL is ready."
        break
    fi
    if [ $attempt -eq $max_attempts ]; then
        echo "PostgreSQL failed to become ready for restore." >&2
        exit 1
    fi
    sleep 2
    ((attempt++))
done

# Copy the backup file into the PostgreSQL container
echo "Copying $BACKUP_FILE_PATH to PostgreSQL container..."
docker-compose -f docker-compose.dev.yml cp "$BACKUP_FILE_PATH" postgres:"${BACKUP_DIR_CONTAINER}/${BACKUP_FILENAME}"

# Restore the database using psql
echo "Restoring PostgreSQL database from ${BACKUP_DIR_CONTAINER}/${BACKUP_FILENAME} inside the container..."
docker-compose -f docker-compose.dev.yml exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${BACKUP_DIR_CONTAINER}/${BACKUP_FILENAME}"

# Restart PostgreSQL service to ensure all connections are refreshed
echo "Restarting PostgreSQL service..."
docker-compose -f docker-compose.dev.yml restart postgres

echo "PostgreSQL restore complete."
