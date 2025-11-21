#!/bin/bash
set -euo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="backups"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
CONTAINER_POSTGRES="postgres"
CONTAINER_NEO4J="neo4j"
DB_POSTGRES="intelgraph_dev"
USER_POSTGRES="intelgraph"
DIR_UPLOADS="server/uploads"

# Create backup directory
mkdir -p "${BACKUP_DIR}"
echo "Starting backup to ${BACKUP_DIR}..."

# 1. Postgres Backup
echo "Backing up Postgres..."
if docker ps -q -f name=${CONTAINER_POSTGRES} | grep -q .; then
  docker exec ${CONTAINER_POSTGRES} pg_dump -U ${USER_POSTGRES} -d ${DB_POSTGRES} -F c > "${BACKUP_DIR}/postgres.dump"
  echo "Postgres backup complete."
else
  echo "ERROR: Postgres container ${CONTAINER_POSTGRES} not running."
  exit 1
fi

# 2. Neo4j Backup (Offline Dump)
echo "Backing up Neo4j..."
# We must stop Neo4j to use neo4j-admin dump securely on Community Edition
# We use a temporary container to perform the dump to avoid issues with the main container's entrypoint/status
if docker ps -q -f name=${CONTAINER_NEO4J} | grep -q .; then
  echo "Stopping Neo4j container..."
  docker stop ${CONTAINER_NEO4J}

  echo "Running Neo4j dump..."
  # We mount the volume 'neo4j_data' to /data and the backup dir to /backup
  # Note: We must match the neo4j version
  docker run --rm \
    -v neo4j_data:/data \
    -v "$(pwd)/${BACKUP_DIR}:/backup" \
    neo4j:5.8 \
    neo4j-admin database dump neo4j --to-path=/backup

  echo "Restarting Neo4j container..."
  docker start ${CONTAINER_NEO4J}
  echo "Neo4j backup complete."
else
  echo "WARNING: Neo4j container not running. Attempting dump anyway..."
    docker run --rm \
    -v neo4j_data:/data \
    -v "$(pwd)/${BACKUP_DIR}:/backup" \
    neo4j:5.8 \
    neo4j-admin database dump neo4j --to-path=/backup
  echo "Neo4j backup complete."
fi

# 3. Evidence Files Backup
echo "Backing up Evidence Files..."
if [ -d "${DIR_UPLOADS}" ]; then
  tar -czf "${BACKUP_DIR}/uploads.tar.gz" -C server uploads
  echo "Evidence files backup complete."
else
  echo "WARNING: ${DIR_UPLOADS} does not exist. Skipping."
fi

echo "Backup process finished successfully."
echo "Artifacts stored in ${BACKUP_DIR}"
