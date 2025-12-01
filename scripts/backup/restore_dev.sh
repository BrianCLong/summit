#!/bin/bash
set -euo pipefail

# Usage check
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <backup_directory_path>"
    echo "Example: $0 backups/20250925_120000"
    exit 1
fi

BACKUP_DIR="$1"
CONTAINER_POSTGRES="postgres"
CONTAINER_NEO4J="neo4j"
DB_POSTGRES="intelgraph_dev"
USER_POSTGRES="intelgraph"
DIR_UPLOADS="server/uploads"

# Validation
if [ ! -d "${BACKUP_DIR}" ]; then
    echo "Error: Backup directory ${BACKUP_DIR} not found."
    exit 1
fi

echo "WARNING: This script will OVERWRITE current database state and files."
echo "Target: Postgres (${DB_POSTGRES}), Neo4j (neo4j), Uploads (${DIR_UPLOADS})"
echo "Press Ctrl+C to cancel or Enter to continue (5 seconds)..."
sleep 5

echo "Starting restore from ${BACKUP_DIR}..."

# 1. Postgres Restore
if [ -f "${BACKUP_DIR}/postgres.dump" ]; then
    echo "Restoring Postgres..."
    if docker ps -q -f name=${CONTAINER_POSTGRES} | grep -q .; then
        # Drop and recreate DB to ensure clean slate
        docker exec ${CONTAINER_POSTGRES} dropdb -U ${USER_POSTGRES} --if-exists ${DB_POSTGRES}
        docker exec ${CONTAINER_POSTGRES} createdb -U ${USER_POSTGRES} ${DB_POSTGRES}

        # Restore dump
        # We need to pipe the file content into the container
        cat "${BACKUP_DIR}/postgres.dump" | docker exec -i ${CONTAINER_POSTGRES} pg_restore -U ${USER_POSTGRES} -d ${DB_POSTGRES} --clean --if-exists
        echo "Postgres restore complete."
    else
        echo "ERROR: Postgres container ${CONTAINER_POSTGRES} not running."
        exit 1
    fi
else
    echo "WARNING: postgres.dump not found in ${BACKUP_DIR}. Skipping Postgres restore."
fi

# 2. Neo4j Restore
if [ -f "${BACKUP_DIR}/neo4j.dump" ]; then
    echo "Restoring Neo4j..."

    echo "Stopping Neo4j container..."
    docker stop ${CONTAINER_NEO4J} || true

    echo "Loading Neo4j dump..."
    # We overwrite the database 'neo4j'
    docker run --rm \
        -v neo4j_data:/data \
        -v "$(pwd)/${BACKUP_DIR}:/backup" \
        neo4j:5.8 \
        neo4j-admin database load neo4j --from-path=/backup --overwrite-destination=true

    echo "Restarting Neo4j container..."
    docker start ${CONTAINER_NEO4J}

    # Wait for Neo4j to be ready
    echo "Waiting for Neo4j to start..."
    timeout 60s bash -c 'until docker exec neo4j cypher-shell -u neo4j -p dev_password "RETURN 1" > /dev/null 2>&1; do sleep 2; done'
    echo "Neo4j restore complete."
else
     echo "WARNING: neo4j.dump not found in ${BACKUP_DIR}. Skipping Neo4j restore."
fi

# 3. Evidence Files Restore
if [ -f "${BACKUP_DIR}/uploads.tar.gz" ]; then
    echo "Restoring Evidence Files..."
    # Remove existing uploads to be clean
    rm -rf "${DIR_UPLOADS}"
    mkdir -p server
    tar -xzf "${BACKUP_DIR}/uploads.tar.gz" -C server
    echo "Evidence files restore complete."
else
    echo "WARNING: uploads.tar.gz not found. Skipping."
fi

echo "Restore process finished successfully."
