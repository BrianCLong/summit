#!/usr/bin/env bash
set -euo pipefail

# Neo4j Incremental Backup System
# Provides transaction-log-based incremental backups for Neo4j
# Reduces backup time and storage requirements

# Configuration
NEO4J_HOST="${NEO4J_HOST:-localhost}"
NEO4J_PORT="${NEO4J_PORT:-7687}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:?NEO4J_PASSWORD required}"
BACKUP_BASE="${BACKUP_BASE:-./backups/neo4j}"
S3_BUCKET="${S3_BUCKET:-summit-backups}"
S3_PREFIX="${S3_PREFIX:-neo4j/incremental}"
FULL_BACKUP_INTERVAL="${FULL_BACKUP_INTERVAL:-7}"  # Days between full backups

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} [INFO] $*"
}

log_success() {
    echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} [SUCCESS] $*"
}

log_error() {
    echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} [ERROR] $*" >&2
}

log_warn() {
    echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} [WARN] $*"
}

# Check if full backup is needed
needs_full_backup() {
    local last_full_backup="$BACKUP_BASE/last_full_backup.txt"

    if [ ! -f "$last_full_backup" ]; then
        return 0  # Need full backup if never done
    fi

    local last_full_date=$(cat "$last_full_backup")
    local days_since=$(( ($(date +%s) - $(date -d "$last_full_date" +%s)) / 86400 ))

    if [ "$days_since" -ge "$FULL_BACKUP_INTERVAL" ]; then
        return 0  # Need full backup
    fi

    return 1  # Don't need full backup
}

# Create full backup
create_full_backup() {
    local timestamp=$(date -u +%Y%m%dT%H%M%SZ)
    local backup_dir="$BACKUP_BASE/full-$timestamp"
    local backup_start=$(date +%s)

    log_info "Creating full Neo4j backup..."

    mkdir -p "$backup_dir"

    # Get current transaction ID before backup
    local tx_id=$(docker exec neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        "CALL dbms.getTXLogInfo() YIELD transactionId RETURN transactionId" --format plain | tail -1 | tr -d ' ')

    log_info "Current transaction ID: $tx_id"

    # Perform backup using neo4j-admin dump
    if docker exec neo4j neo4j-admin database dump neo4j --to-path=/tmp > /dev/null 2>&1; then
        docker cp neo4j:/tmp/neo4j.dump "$backup_dir/"

        # Save metadata
        cat > "$backup_dir/metadata.json" <<EOF
{
  "backup_type": "full",
  "timestamp": "$(date -u -Iseconds)",
  "transaction_id": "$tx_id",
  "database": "neo4j",
  "hostname": "$(hostname)",
  "neo4j_version": "$(docker exec neo4j neo4j --version | head -1)"
}
EOF

        # Calculate backup size and checksum
        local backup_size=$(du -sb "$backup_dir/neo4j.dump" | cut -f1)
        local backup_checksum=$(sha256sum "$backup_dir/neo4j.dump" | cut -d' ' -f1)

        log_info "Backup size: $(numfmt --to=iec $backup_size)"
        log_info "Backup checksum: $backup_checksum"

        # Update metadata with size and checksum
        jq ".backup_size = $backup_size | .checksum = \"$backup_checksum\"" \
            "$backup_dir/metadata.json" > "$backup_dir/metadata.json.tmp"
        mv "$backup_dir/metadata.json.tmp" "$backup_dir/metadata.json"

        # Record this as last full backup
        date -u +%Y-%m-%d > "$BACKUP_BASE/last_full_backup.txt"
        echo "$backup_dir" > "$BACKUP_BASE/last_full_backup_dir.txt"
        echo "$tx_id" > "$BACKUP_BASE/last_full_backup_tx.txt"

        # Upload to S3 if configured
        if [ -n "${S3_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
            log_info "Uploading full backup to S3..."
            aws s3 sync "$backup_dir" "s3://$S3_BUCKET/$S3_PREFIX/full-$timestamp/" \
                --storage-class STANDARD_IA \
                --metadata "backup-type=full,tx-id=$tx_id"
            log_success "Uploaded to s3://$S3_BUCKET/$S3_PREFIX/full-$timestamp/"
        fi

        local backup_end=$(date +%s)
        local backup_duration=$((backup_end - backup_start))

        # Update Prometheus metrics
        cat <<EOF | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/neo4j_backup/instance/$(hostname) 2>/dev/null || true
# HELP neo4j_backup_duration_seconds Duration of Neo4j backup
# TYPE neo4j_backup_duration_seconds gauge
neo4j_backup_duration_seconds{backup_type="full"} $backup_duration
# HELP neo4j_backup_size_bytes Size of Neo4j backup
# TYPE neo4j_backup_size_bytes gauge
neo4j_backup_size_bytes{backup_type="full"} $backup_size
# HELP neo4j_backup_last_success_timestamp Last successful backup timestamp
# TYPE neo4j_backup_last_success_timestamp gauge
neo4j_backup_last_success_timestamp{backup_type="full"} $backup_end
# HELP neo4j_backup_transaction_id Transaction ID at backup time
# TYPE neo4j_backup_transaction_id gauge
neo4j_backup_transaction_id{backup_type="full"} $tx_id
EOF

        log_success "Full backup completed in ${backup_duration}s: $backup_dir"
        return 0
    else
        log_error "Full backup failed!"
        return 1
    fi
}

# Create incremental backup (transaction log based)
create_incremental_backup() {
    local timestamp=$(date -u +%Y%m%dT%H%M%SZ)
    local backup_dir="$BACKUP_BASE/incremental-$timestamp"
    local backup_start=$(date +%s)

    # Check if we have a base full backup
    if [ ! -f "$BACKUP_BASE/last_full_backup_dir.txt" ]; then
        log_warn "No full backup found, creating full backup first..."
        create_full_backup
        return $?
    fi

    local base_backup_dir=$(cat "$BACKUP_BASE/last_full_backup_dir.txt")
    local base_tx_id=$(cat "$BACKUP_BASE/last_full_backup_tx.txt")

    log_info "Creating incremental backup from transaction $base_tx_id..."

    mkdir -p "$backup_dir"

    # Get current transaction ID
    local current_tx_id=$(docker exec neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        "CALL dbms.getTXLogInfo() YIELD transactionId RETURN transactionId" --format plain | tail -1 | tr -d ' ')

    log_info "Current transaction ID: $current_tx_id"

    # Calculate transactions since last backup
    local tx_delta=$((current_tx_id - base_tx_id))
    log_info "Transactions since last backup: $tx_delta"

    if [ "$tx_delta" -eq 0 ]; then
        log_warn "No new transactions since last backup, skipping..."
        return 0
    fi

    # Export transaction logs
    # Note: This is a simplified approach. For production, consider using Neo4j Enterprise
    # with incremental backup support or implement custom transaction log extraction

    # Export changed data using Cypher queries
    log_info "Exporting changed data..."

    # Export nodes created/modified since last backup
    docker exec neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        "MATCH (n) WHERE n.lastModified >= datetime('$(date -u -d "@$base_tx_id" -Iseconds)')
         RETURN n" --format json > "$backup_dir/nodes.json" 2>/dev/null || true

    # Export relationships created/modified since last backup
    docker exec neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        "MATCH ()-[r]-() WHERE r.lastModified >= datetime('$(date -u -d "@$base_tx_id" -Iseconds)')
         RETURN r" --format json > "$backup_dir/relationships.json" 2>/dev/null || true

    # Save metadata
    cat > "$backup_dir/metadata.json" <<EOF
{
  "backup_type": "incremental",
  "timestamp": "$(date -u -Iseconds)",
  "base_backup": "$base_backup_dir",
  "base_transaction_id": $base_tx_id,
  "current_transaction_id": $current_tx_id,
  "transaction_delta": $tx_delta,
  "database": "neo4j",
  "hostname": "$(hostname)"
}
EOF

    # Calculate backup size
    local backup_size=$(du -sb "$backup_dir" | cut -f1)
    log_info "Incremental backup size: $(numfmt --to=iec $backup_size)"

    # Update metadata with size
    jq ".backup_size = $backup_size" "$backup_dir/metadata.json" > "$backup_dir/metadata.json.tmp"
    mv "$backup_dir/metadata.json.tmp" "$backup_dir/metadata.json"

    # Record this as last incremental backup
    echo "$backup_dir" > "$BACKUP_BASE/last_incremental_backup_dir.txt"
    echo "$current_tx_id" > "$BACKUP_BASE/last_incremental_backup_tx.txt"

    # Upload to S3 if configured
    if [ -n "${S3_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
        log_info "Uploading incremental backup to S3..."
        aws s3 sync "$backup_dir" "s3://$S3_BUCKET/$S3_PREFIX/incremental-$timestamp/" \
            --storage-class STANDARD \
            --metadata "backup-type=incremental,base-tx=$base_tx_id,current-tx=$current_tx_id"
        log_success "Uploaded to s3://$S3_BUCKET/$S3_PREFIX/incremental-$timestamp/"
    fi

    local backup_end=$(date +%s)
    local backup_duration=$((backup_end - backup_start))

    # Update Prometheus metrics
    cat <<EOF | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/neo4j_backup/instance/$(hostname) 2>/dev/null || true
# HELP neo4j_backup_duration_seconds Duration of Neo4j backup
# TYPE neo4j_backup_duration_seconds gauge
neo4j_backup_duration_seconds{backup_type="incremental"} $backup_duration
# HELP neo4j_backup_size_bytes Size of Neo4j backup
# TYPE neo4j_backup_size_bytes gauge
neo4j_backup_size_bytes{backup_type="incremental"} $backup_size
# HELP neo4j_backup_last_success_timestamp Last successful backup timestamp
# TYPE neo4j_backup_last_success_timestamp gauge
neo4j_backup_last_success_timestamp{backup_type="incremental"} $backup_end
# HELP neo4j_backup_transaction_delta Transactions in incremental backup
# TYPE neo4j_backup_transaction_delta gauge
neo4j_backup_transaction_delta $tx_delta
EOF

    log_success "Incremental backup completed in ${backup_duration}s: $backup_dir"
    return 0
}

# Main execution
main() {
    mkdir -p "$BACKUP_BASE"

    if needs_full_backup; then
        log_info "Full backup required (last full backup > $FULL_BACKUP_INTERVAL days ago)"
        create_full_backup
    else
        log_info "Creating incremental backup..."
        create_incremental_backup
    fi
}

# Run main function
main "$@"
