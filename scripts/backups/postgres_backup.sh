#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +"%Y-%m-%dT%H-%M-%S")
FILE="postgres-${DATE}.sql.gz"

echo "Dumping Postgres database ${PGDATABASE}"
pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" | gzip > "/tmp/${FILE}"

echo "Uploading to S3: s3://${BACKUP_BUCKET}/postgres/${FILE}"
aws s3 cp "/tmp/${FILE}" "s3://${BACKUP_BUCKET}/postgres/${FILE}"
echo "Done."

