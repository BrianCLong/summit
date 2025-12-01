#!/usr/bin/env bash
set -euo pipefail

# Neo4j Incremental Restore Script
# Restores Neo4j from full backup + incremental backups

# Configuration
NEO4J_HOST="${NEO4J_HOST:-localhost}"
NEO4J_PORT="${NEO4J_PORT:-7687}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:?NEO4J_PASSWORD required}"
BACKUP_BASE="${BACKUP_BASE:-./backups/neo4j}"

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

# Restore full backup
restore_full_backup() {
    local backup_dir="$1"

    log_info "Restoring full backup from: $backup_dir"

    if [ ! -f "$backup_dir/neo4j.dump" ]; then
        log_error "Full backup file not found: $backup_dir/neo4j.dump"
        return 1
    fi

    # Stop Neo4j
    log_info "Stopping Neo4j..."
    docker stop neo4j || true

    # Copy backup into container
    log_info "Copying backup file..."
    docker cp "$backup_dir/neo4j.dump" neo4j:/tmp/

    # Restore backup
    log_info "Restoring database..."
    docker start neo4j
    sleep 10

    docker exec neo4j neo4j-admin database load neo4j --from-path=/tmp

    # Restart Neo4j
    log_info "Restarting Neo4j..."
    docker restart neo4j
    sleep 15

    # Verify restoration
    if docker exec neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        "MATCH (n) RETURN COUNT(n) AS count" --format plain | tail -1; then
        log_success "Full backup restored successfully"
        return 0
    else
        log_error "Failed to verify restoration"
        return 1
    fi
}

# Apply incremental backups
apply_incremental_backups() {
    local base_backup_dir="$1"
    shift
    local incremental_backups=("$@")

    log_info "Applying ${#incremental_backups[@]} incremental backups..."

    for backup_dir in "${incremental_backups[@]}"; do
        log_info "Applying incremental backup: $backup_dir"

        # Load metadata
        local metadata=$(cat "$backup_dir/metadata.json")
        local tx_id=$(echo "$metadata" | jq -r '.current_transaction_id')

        log_info "Transaction ID: $tx_id"

        # Apply nodes
        if [ -f "$backup_dir/nodes.json" ]; then
            log_info "Applying node changes..."
            # Use APOC to import JSON
            docker exec neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
                "CALL apoc.import.json('file:///$backup_dir/nodes.json')" || log_warn "Node import had warnings"
        fi

        # Apply relationships
        if [ -f "$backup_dir/relationships.json" ]; then
            log_info "Applying relationship changes..."
            docker exec neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
                "CALL apoc.import.json('file:///$backup_dir/relationships.json')" || log_warn "Relationship import had warnings"
        fi

        log_success "Incremental backup applied: $backup_dir"
    done
}

# Find all incremental backups after a full backup
find_incremental_backups() {
    local base_backup_dir="$1"
    local base_timestamp=$(basename "$base_backup_dir" | sed 's/full-//')

    # Find all incremental backups after this full backup
    find "$BACKUP_BASE" -type d -name "incremental-*" | sort | while read -r inc_dir; do
        local inc_timestamp=$(basename "$inc_dir" | sed 's/incremental-//')
        if [ "$inc_timestamp" \> "$base_timestamp" ]; then
            echo "$inc_dir"
        fi
    done
}

# Main restore function
main() {
    local target_backup="${1:-}"

    if [ -z "$target_backup" ]; then
        log_error "Usage: $0 <full-backup-dir> [--with-incrementals]"
        exit 1
    fi

    local with_incrementals=false
    if [ "${2:-}" = "--with-incrementals" ]; then
        with_incrementals=true
    fi

    # Restore full backup
    restore_full_backup "$target_backup"

    # Apply incremental backups if requested
    if [ "$with_incrementals" = true ]; then
        log_info "Finding incremental backups..."
        local incremental_dirs=()
        while IFS= read -r line; do
            incremental_dirs+=("$line")
        done < <(find_incremental_backups "$target_backup")

        if [ ${#incremental_dirs[@]} -gt 0 ]; then
            apply_incremental_backups "$target_backup" "${incremental_dirs[@]}"
            log_success "Restoration complete with ${#incremental_dirs[@]} incremental backups applied"
        else
            log_warn "No incremental backups found to apply"
        fi
    else
        log_success "Full backup restoration complete"
    fi
}

# Run main function
main "$@"
