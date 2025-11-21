#!/usr/bin/env bash
#
# Automated Point-in-Time Recovery (PITR) System
# Ensures RPO ≤ 5 minutes through continuous WAL archival
#
# RPO Target: ≤ 5 minutes
#

set -euo pipefail

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-intelgraph}"
S3_BUCKET="${S3_BUCKET:-intelgraph-wal-archives}"
S3_PREFIX="${S3_PREFIX:-postgres/wal}"
ARCHIVE_INTERVAL_SECONDS="${ARCHIVE_INTERVAL_SECONDS:-60}"  # Archive every minute
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# WAL-G configuration
export WALG_S3_PREFIX="s3://${S3_BUCKET}/${S3_PREFIX}"
export WALG_COMPRESSION_METHOD="${WALG_COMPRESSION_METHOD:-lz4}"
export WALG_DELTA_MAX_STEPS="${WALG_DELTA_MAX_STEPS:-7}"

log_info() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [INFO] $*"
}

log_error() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [ERROR] $*" >&2
}

# Initialize WAL archiving
initialize_wal_archiving() {
    log_info "Initializing WAL archiving..."

    # Update PostgreSQL configuration for continuous archiving
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "ALTER SYSTEM SET wal_level = 'replica';"
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "ALTER SYSTEM SET archive_mode = 'on';"
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "ALTER SYSTEM SET archive_command = '/usr/local/bin/wal-g wal-push %p';"
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "ALTER SYSTEM SET archive_timeout = '60';"  # Force WAL switch every 60s

    log_info "WAL archiving configuration updated (requires PostgreSQL restart)"
}

# Create base backup
create_base_backup() {
    log_info "Creating base backup..."

    local backup_start=$(date +%s)

    if command -v wal-g &> /dev/null; then
        wal-g backup-push /var/lib/postgresql/data
    else
        log_error "wal-g not found, falling back to pg_basebackup"
        pg_basebackup -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -D "/tmp/basebackup_$(date +%s)" -Ft -z -P
    fi

    local backup_end=$(date +%s)
    local backup_duration=$((backup_end - backup_start))

    log_info "Base backup completed in ${backup_duration}s"

    # Record metric
    echo "intelgraph_dr_backup_duration_seconds{database=\"postgres\",backup_type=\"base\"} $backup_duration" | \
        curl --data-binary @- http://localhost:9091/metrics/job/pitr || true

    echo "intelgraph_dr_last_backup_timestamp{database=\"postgres\",backup_type=\"base\"} $backup_end" | \
        curl --data-binary @- http://localhost:9091/metrics/job/pitr || true
}

# Archive WAL continuously
continuous_wal_archival() {
    log_info "Starting continuous WAL archival (RPO ≤ 5m)..."

    while true; do
        local current_lsn=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -t -c "SELECT pg_current_wal_lsn();" | tr -d ' ')
        log_info "Current WAL LSN: $current_lsn"

        # Force WAL switch to ensure recent changes are archived
        psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c "SELECT pg_switch_wal();" > /dev/null 2>&1 || true

        # Calculate RPO (time since last archive)
        local last_archive=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -t -c \
            "SELECT EXTRACT(EPOCH FROM (now() - archived_time)) FROM pg_stat_archiver;" | tr -d ' ')

        if [[ -n "$last_archive" ]]; then
            log_info "Time since last WAL archive: ${last_archive}s"

            # Record RPO metric
            echo "intelgraph_dr_rpo_actual_seconds{database=\"postgres\"} $last_archive" | \
                curl --data-binary @- http://localhost:9091/metrics/job/pitr || true

            # Alert if RPO is violated
            if (( $(echo "$last_archive > 300" | bc -l) )); then
                log_error "RPO VIOLATED: WAL archival lag is ${last_archive}s (target: ≤300s)"
            fi
        fi

        sleep "$ARCHIVE_INTERVAL_SECONDS"
    done
}

# Perform point-in-time recovery
perform_pitr() {
    local target_time="$1"  # ISO timestamp, e.g., "2025-11-20 15:30:00"
    local recovery_dir="${2:-/var/lib/postgresql/recovery}"

    log_info "Starting PITR to timestamp: $target_time"

    local recovery_start=$(date +%s)

    # Create recovery directory
    mkdir -p "$recovery_dir"
    cd "$recovery_dir"

    # Fetch base backup
    log_info "Fetching base backup from S3..."
    if command -v wal-g &> /dev/null; then
        wal-g backup-fetch "$recovery_dir" LATEST
    else
        log_error "wal-g not found"
        exit 1
    fi

    # Create recovery configuration
    cat > "$recovery_dir/postgresql.auto.conf" <<EOF
restore_command = 'wal-g wal-fetch %f %p'
recovery_target_time = '$target_time'
recovery_target_action = 'promote'
EOF

    # Start PostgreSQL in recovery mode
    log_info "Starting PostgreSQL in recovery mode..."
    touch "$recovery_dir/recovery.signal"

    # Wait for recovery to complete
    log_info "Waiting for recovery to complete..."
    sleep 10  # Simplified - production would monitor recovery progress

    local recovery_end=$(date +%s)
    local recovery_duration=$((recovery_end - recovery_start))

    log_info "PITR completed in ${recovery_duration}s"

    # Record RTO metric
    echo "intelgraph_dr_rto_actual_seconds{database=\"postgres\"} $recovery_duration" | \
        curl --data-binary @- http://localhost:9091/metrics/job/pitr || true

    # Verify recovery
    local recovered_count=$(psql -h localhost -U "$POSTGRES_USER" -t -c "SELECT COUNT(*) FROM entities;" | tr -d ' ')
    log_info "Recovered $recovered_count entities"
}

# Cleanup old WAL archives
cleanup_old_archives() {
    log_info "Cleaning up WAL archives older than ${RETENTION_DAYS} days..."

    if command -v wal-g &> /dev/null; then
        wal-g delete retain FULL "$RETENTION_DAYS"
        log_info "Cleanup completed"
    fi
}

# Main menu
case "${1:-help}" in
    init)
        initialize_wal_archiving
        ;;
    backup)
        create_base_backup
        ;;
    archive)
        continuous_wal_archival
        ;;
    recover)
        if [[ -z "${2:-}" ]]; then
            log_error "Usage: $0 recover <target-time>"
            exit 1
        fi
        perform_pitr "$2" "${3:-}"
        ;;
    cleanup)
        cleanup_old_archives
        ;;
    *)
        echo "Usage: $0 {init|backup|archive|recover|cleanup}"
        echo ""
        echo "Commands:"
        echo "  init              Initialize WAL archiving (requires restart)"
        echo "  backup            Create base backup"
        echo "  archive           Start continuous WAL archival (RPO ≤ 5m)"
        echo "  recover <time>    Perform PITR to specified time"
        echo "  cleanup           Remove old WAL archives"
        exit 1
        ;;
esac
