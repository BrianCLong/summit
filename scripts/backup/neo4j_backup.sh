#!/bin/bash
# Neo4j backup script
set -euo pipefail

echo "Running Neo4j backup..."

BACKUP_DIR_CONTAINER=/backups
BACKUP_DIR_HOST=./backups/neo4j
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE=neo4j-backup-${TIMESTAMP}.dump

# Ensure the host backup directory exists
mkdir -p "$BACKUP_DIR_HOST"

# Check if the Neo4j service is running
if ! docker-compose -f docker-compose.dev.yml ps -q neo4j | grep -q .; then
  echo "Neo4j service is not running. Please start it first." >&2
  exit 1
fi

# Perform the backup using neo4j-admin dump inside the container
echo "Dumping Neo4j database to ${BACKUP_DIR_CONTAINER}/${BACKUP_FILE} inside the container..."
docker-compose -f docker-compose.dev.yml exec neo4j neo4j-admin dump --database=neo4j --to=${BACKUP_DIR_CONTAINER}/${BACKUP_FILE}

echo "Neo4j backup complete. Backup saved to ${BACKUP_DIR_HOST}/${BACKUP_FILE}"
"