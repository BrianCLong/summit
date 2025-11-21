#!/usr/bin/env bash
set -euo pipefail

# WAL Archive Script for PostgreSQL PITR
# Archives WAL files to S3 using WAL-G
# Called by PostgreSQL archive_command

WAL_PATH="$1"
WAL_FILE="$2"

# Load WAL-G configuration
export $(cat /etc/wal-g.d/walg.json | jq -r 'to_entries | .[] | "\(.key)=\(.value)"')

# Log archive attempt
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Archiving WAL file: $WAL_FILE" >> /var/log/postgresql/wal-archive.log

# Archive using WAL-G
if /usr/local/bin/wal-g wal-push "$WAL_PATH" >> /var/log/postgresql/wal-archive.log 2>&1; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Successfully archived: $WAL_FILE" >> /var/log/postgresql/wal-archive.log

    # Update Prometheus metric
    cat <<EOF | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/postgres_pitr/instance/$(hostname) 2>/dev/null || true
# HELP postgres_wal_archive_success_total Total successful WAL archives
# TYPE postgres_wal_archive_success_total counter
postgres_wal_archive_success_total $(date +%s)
# HELP postgres_wal_archive_last_success_timestamp Last successful archive timestamp
# TYPE postgres_wal_archive_last_success_timestamp gauge
postgres_wal_archive_last_success_timestamp $(date +%s)
EOF

    exit 0
else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAILED to archive: $WAL_FILE" >> /var/log/postgresql/wal-archive.log

    # Update failure metric
    cat <<EOF | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/postgres_pitr/instance/$(hostname) 2>/dev/null || true
# HELP postgres_wal_archive_failure_total Total failed WAL archives
# TYPE postgres_wal_archive_failure_total counter
postgres_wal_archive_failure_total $(date +%s)
EOF

    exit 1
fi
