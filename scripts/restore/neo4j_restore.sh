#!/bin/bash
# Neo4j restore script
set -euo pipefail

echo "Running Neo4j restore..."

BACKUP_DIR_CONTAINER=/backups
NEO4J_DATA_DIR_CONTAINER=/data

# Check for a backup file argument
if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_neo4j_backup.dump>" >&2
  echo "Example: $0 ./backups/neo4j/neo4j-backup-20231027123456.dump" >&2
  exit 1
fi

BACKUP_FILE_PATH=$1
BACKUP_FILENAME=$(basename "$BACKUP_FILE_PATH")

if [ ! -f "$BACKUP_FILE_PATH" ]; then
  echo "Error: Backup file not found at $BACKUP_FILE_PATH" >&2
  exit 1
fi

# Stop Neo4j service
echo "Stopping Neo4j service..."
docker-compose -f docker-compose.dev.yml stop neo4j

# Clear existing Neo4j data (important for a clean restore)
echo "Clearing existing Neo4j data..."
docker-compose -f docker-compose.dev.yml run --rm neo4j bash -c "rm -rf ${NEO4J_DATA_DIR_CONTAINER}/databases/neo4j/* ${NEO4J_DATA_DIR_CONTAINER}/transactions/neo4j/*"

# Copy the backup file into the Neo4j container's backup directory
echo "Copying $BACKUP_FILE_PATH to Neo4j container..."
docker-compose -f docker-compose.dev.yml cp "$BACKUP_FILE_PATH" neo4j:"${BACKUP_DIR_CONTAINER}/${BACKUP_FILENAME}"

# Load the backup using neo4j-admin load
echo "Loading Neo4j database from ${BACKUP_DIR_CONTAINER}/${BACKUP_FILENAME} inside the container..."
docker-compose -f docker-compose.dev.yml exec neo4j neo4j-admin load --from=${BACKUP_DIR_CONTAINER}/${BACKUP_FILENAME} --database=neo4j --force

# Start Neo4j service
echo "Starting Neo4j service..."
docker-compose -f docker-compose.dev.yml start neo4j

echo "Neo4j restore complete."
