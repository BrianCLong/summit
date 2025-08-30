#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +"%Y-%m-%dT%H-%M-%S")
FILE="neo4j-${DATE}.dump"

echo "Creating Neo4j dump: ${FILE}"
neo4j-admin database dump neo4j --to-path=/tmp --overwrite

echo "Uploading to S3: s3://${BACKUP_BUCKET}/neo4j/${FILE}"
aws s3 cp /tmp/neo4j.dump "s3://${BACKUP_BUCKET}/neo4j/${FILE}"
echo "Done."

