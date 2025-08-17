#!/bin/bash
# PostgreSQL backup script
set -euo pipefail

echo "Running PostgreSQL backup..."

BACKUP_DIR_CONTAINER=/backups
BACKUP_DIR_HOST=./backups/postgres
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE=postgres-backup-${TIMESTAMP}.sql

POSTGRES_DB=${POSTGRES_DB:-intelgraph_dev}
POSTGRES_USER=${POSTGRES_USER:-intelgraph}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-devpassword}

# Ensure the host backup directory exists
mkdir -p "$BACKUP_DIR_HOST"

# Check if the PostgreSQL service is running
if ! docker-compose -f docker-compose.dev.yml ps -q postgres | grep -q .; then
  echo "PostgreSQL service is not running. Please start it first." >&2
  exit 1
fi

# Perform the backup using pg_dump inside the container
echo "Dumping PostgreSQL database to ${BACKUP_DIR_CONTAINER}/${BACKUP_FILE} inside the container..."
docker-compose -f docker-compose.dev.yml exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_DIR_HOST/$BACKUP_FILE"

echo "PostgreSQL backup complete. Backup saved to ${BACKUP_DIR_HOST}/${BACKUP_FILE}"
"