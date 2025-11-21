#!/usr/bin/env bash
set -euo pipefail

# Base Backup Script for PostgreSQL PITR
# Creates full database backup using WAL-G
# Should be run periodically (daily) via cron/CronJob

# Load WAL-G configuration
export $(cat /etc/wal-g.d/walg.json | jq -r 'to_entries | .[] | "\(.key)=\(.value)"')

log_info() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [INFO] $*"
}

log_error() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [ERROR] $*" >&2
}

# Start backup
log_info "Starting base backup..."
BACKUP_START=$(date +%s)

# Create backup using WAL-G
if /usr/local/bin/wal-g backup-push "$PGDATA"; then
    BACKUP_END=$(date +%s)
    BACKUP_DURATION=$((BACKUP_END - BACKUP_START))

    log_info "Base backup completed successfully in ${BACKUP_DURATION}s"

    # Get backup info
    BACKUP_NAME=$(wal-g backup-list --json | jq -r '.[0].backup_name')
    BACKUP_SIZE=$(wal-g backup-list --json | jq -r '.[0].uncompressed_size')

    log_info "Backup name: $BACKUP_NAME"
    log_info "Backup size: $BACKUP_SIZE bytes"

    # Update Prometheus metrics
    cat <<EOF | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/postgres_pitr/instance/$(hostname) 2>/dev/null || true
# HELP postgres_base_backup_duration_seconds Duration of base backup
# TYPE postgres_base_backup_duration_seconds gauge
postgres_base_backup_duration_seconds $BACKUP_DURATION
# HELP postgres_base_backup_size_bytes Size of base backup
# TYPE postgres_base_backup_size_bytes gauge
postgres_base_backup_size_bytes $BACKUP_SIZE
# HELP postgres_base_backup_last_success_timestamp Last successful base backup
# TYPE postgres_base_backup_last_success_timestamp gauge
postgres_base_backup_last_success_timestamp $BACKUP_END
# HELP postgres_base_backup_success_total Total successful base backups
# TYPE postgres_base_backup_success_total counter
postgres_base_backup_success_total 1
EOF

    # Cleanup old backups (keep last 30 days)
    log_info "Cleaning up old backups (retention: 30 days)..."
    wal-g delete retain FULL 30 --confirm

    exit 0
else
    log_error "Base backup failed!"

    # Update failure metric
    cat <<EOF | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/postgres_pitr/instance/$(hostname) 2>/dev/null || true
# HELP postgres_base_backup_failure_total Total failed base backups
# TYPE postgres_base_backup_failure_total counter
postgres_base_backup_failure_total 1
EOF

    exit 1
fi
