#!/usr/bin/env bash
set -euo pipefail

# Conductor BCDR Backup Script
# Creates comprehensive backup of all conductor data with integrity verification

# Configuration
BACKUP_BASE=${BACKUP_BASE:-./backups}
RETENTION_DAYS=${RETENTION_DAYS:-30}
ENCRYPTION_KEY=${ENCRYPTION_KEY:-}
S3_BUCKET=${S3_BUCKET:-}
NOTIFICATION_WEBHOOK=${NOTIFICATION_WEBHOOK:-}
DRY_RUN=${DRY_RUN:-false}
INCLUDE_POSTGRES=${INCLUDE_POSTGRES:-false}
VERIFY_ONLY=false

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }

# Initialize backup
init_backup() {
    local timestamp=$(date -u +%Y%m%dT%H%M%SZ)
    export BACKUP_ID="conductor-backup-${timestamp}"
    export BACKUP_DIR="$BACKUP_BASE/$BACKUP_ID"
    
    mkdir -p "$BACKUP_DIR"
    
    say "🔄 Starting Conductor Backup: $BACKUP_ID"
    echo "Timestamp: $(date -u -Iseconds)" > "$BACKUP_DIR/backup-info.txt"
    echo "Host: $(hostname)" >> "$BACKUP_DIR/backup-info.txt"
    echo "User: ${USER:-unknown}" >> "$BACKUP_DIR/backup-info.txt"
    echo "Backup ID: $BACKUP_ID" >> "$BACKUP_DIR/backup-info.txt"
}

# Backup Neo4j database
backup_neo4j() {
    say "Backing up Neo4j database"
    
    # Create database dump using neo4j-admin
    if docker exec neo4j sh -c 'neo4j-admin database dump neo4j --to-path=/tmp' 2>/dev/null; then
        docker cp neo4j:/tmp/neo4j.dump "$BACKUP_DIR/neo4j.dump"
        pass "Neo4j database dump created"
    else
        # Fallback: use cypher-shell export
        warn "Database dump failed, using cypher-shell export"
        
        docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
            "CALL apoc.export.cypher.all('/tmp/neo4j-export.cypher', {format: 'cypher-shell'})" \
            > "$BACKUP_DIR/neo4j-export.cypher" 2>/dev/null || true
        
        if [ -s "$BACKUP_DIR/neo4j-export.cypher" ]; then
            pass "Neo4j cypher export created"
        else
            fail "Neo4j backup failed"
            return 1
        fi
    fi
    
    # Export graph statistics
    docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
        "CALL db.stats.retrieve('GRAPH') YIELD section, data RETURN section, data" \
        > "$BACKUP_DIR/neo4j-stats.txt" 2>/dev/null || warn "Could not export graph statistics"
}

# Backup PostgreSQL database
backup_postgres() {
    say "Backing up PostgreSQL database"
    
    local postgres_url="${POSTGRES_URL:-postgres://intelgraph:devpassword@localhost:5432/intelgraph_dev}"
    
    if command -v pg_dump >/dev/null 2>&1; then
        # Use local pg_dump if available
        pg_dump "$postgres_url" --verbose --no-password --clean --create \
            > "$BACKUP_DIR/postgres.sql"
    else
        # Use docker exec if pg_dump not available locally
        docker exec postgres pg_dump -U "${POSTGRES_USER:-intelgraph}" \
            -d "${POSTGRES_DB:-intelgraph_dev}" --verbose --clean --create \
            > "$BACKUP_DIR/postgres.sql"
    fi
    
    if [ -s "$BACKUP_DIR/postgres.sql" ]; then
        pass "PostgreSQL database dump created"
        
        # Export table statistics
        echo "-- Table Statistics --" > "$BACKUP_DIR/postgres-stats.txt"
        docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
            -d "${POSTGRES_DB:-intelgraph_dev}" \
            -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;" \
            >> "$BACKUP_DIR/postgres-stats.txt" 2>/dev/null || warn "Could not export table statistics"
    else
        fail "PostgreSQL backup failed"
        return 1
    fi
}

# Backup Redis data
backup_redis() {
    say "Backing up Redis data"
    
    local redis_url="${REDIS_URL:-redis://localhost:6379}"
    
    # Create Redis dump
    if command -v redis-cli >/dev/null 2>&1; then
        # Use BGSAVE to create snapshot
        redis-cli -u "$redis_url" BGSAVE > /dev/null
        
        # Wait for background save to complete
        while [ "$(redis-cli -u "$redis_url" LASTSAVE)" = "$(redis-cli -u "$redis_url" LASTSAVE)" ]; do
            sleep 1
        done
        
        # Copy the RDB file
        redis-cli -u "$redis_url" --rdb "$BACKUP_DIR/redis.rdb" > /dev/null
        pass "Redis database dump created"
        
        # Export Redis info
        redis-cli -u "$redis_url" INFO > "$BACKUP_DIR/redis-info.txt"
    else
        # Use docker exec
        docker exec redis redis-cli BGSAVE
        sleep 2
        docker cp redis:/data/dump.rdb "$BACKUP_DIR/redis.rdb"
        docker exec redis redis-cli INFO > "$BACKUP_DIR/redis-info.txt"
        pass "Redis database dump created"
    fi
}

# Backup conductor audit chain
backup_audit_chain() {
    say "Backing up conductor audit chain"
    
    local audit_path="${AUDIT_CHAIN_PATH:-./data/audit}"
    
    if [ -d "$audit_path" ]; then
        # Create tarball of audit directory
        tar -czf "$BACKUP_DIR/audit-chain.tar.gz" -C "$(dirname "$audit_path")" "$(basename "$audit_path")"
        
        # Run integrity verification
        if [ -f "./scripts/audit-verify.sh" ]; then
            ./scripts/audit-verify.sh --export-data > "$BACKUP_DIR/audit-verification.txt" 2>&1 || warn "Audit verification failed"
        fi
        
        pass "Audit chain backup created"
    else
        warn "Audit chain directory not found: $audit_path"
    fi
}

# Backup configuration files
backup_config() {
    say "Backing up configuration files"
    
    mkdir -p "$BACKUP_DIR/config"
    
    # Core configuration files
    local config_files=(
        "docker-compose.dev.yml"
        "docker-compose.prod.yml"
        ".env"
        "Justfile"
        "server/src/conductor/config.ts"
        "policy/opa-config.yaml"
        "observability/prometheus.yml"
        "observability/alert-rules.yml"
    )
    
    for config_file in "${config_files[@]}"; do
        if [ -f "$config_file" ]; then
            cp "$config_file" "$BACKUP_DIR/config/" 2>/dev/null || warn "Could not backup $config_file"
        fi
    done
    
    # Backup OPA policies
    if [ -d "server/src/conductor/security" ]; then
        cp -r "server/src/conductor/security" "$BACKUP_DIR/config/opa-policies"
    fi
    
    # Backup signed policy bundles
    if [ -d "policy/bundles" ]; then
        cp -r "policy/bundles" "$BACKUP_DIR/config/policy-bundles"
    fi
    
    pass "Configuration files backed up"
}

# Backup application secrets (encrypted)
backup_secrets() {
    say "Backing up application secrets"
    
    local secrets_file="$BACKUP_DIR/secrets.enc"
    
    # Create temporary secrets file
    local temp_secrets=$(mktemp)
    
    {
        echo "# Conductor Application Secrets Backup"
        echo "# Generated: $(date -u -Iseconds)"
        echo ""
        
        # Extract secrets from environment (be careful not to expose in logs)
        if [ -f ".env" ]; then
            grep -E "(API_KEY|SECRET|PASSWORD|TOKEN)" .env || true
        fi
        
        # Add Docker secrets if available
        if [ -d "/run/secrets" ]; then
            for secret_file in /run/secrets/*; do
                if [ -f "$secret_file" ]; then
                    echo "DOCKER_SECRET_$(basename "$secret_file")=$(cat "$secret_file" | base64 -w 0)"
                fi
            done
        fi
        
    } > "$temp_secrets"
    
    # Encrypt secrets if key provided
    if [ -n "$ENCRYPTION_KEY" ]; then
        if command -v gpg >/dev/null 2>&1; then
            gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
                --passphrase "$ENCRYPTION_KEY" --batch --yes \
                --output "$secrets_file" "$temp_secrets"
            pass "Secrets encrypted and backed up"
        else
            # Fallback to openssl
            openssl enc -aes-256-cbc -salt -in "$temp_secrets" -out "$secrets_file" \
                -pass "pass:$ENCRYPTION_KEY" 2>/dev/null
            pass "Secrets encrypted with OpenSSL"
        fi
    else
        cp "$temp_secrets" "$secrets_file"
        warn "Secrets backed up without encryption (ENCRYPTION_KEY not set)"
    fi
    
    rm -f "$temp_secrets"
    chmod 600 "$secrets_file"
}

# Generate backup checksums
generate_checksums() {
    say "Generating integrity checksums"
    
    local checksums_file="$BACKUP_DIR/CHECKSUMS"
    
    # Generate SHA-256 checksums for all backup files
    find "$BACKUP_DIR" -type f ! -name "CHECKSUMS" ! -name "backup-info.txt" \
        -exec sha256sum {} \; | sed "s|$BACKUP_DIR/||" > "$checksums_file"
    
    # Add file sizes
    echo "" >> "$checksums_file"
    echo "# File Sizes" >> "$checksums_file"
    find "$BACKUP_DIR" -type f ! -name "CHECKSUMS" \
        -exec ls -la {} \; | awk '{print $5, $9}' | sed "s|$BACKUP_DIR/||" >> "$checksums_file"
    
    # Add backup summary
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local file_count=$(find "$BACKUP_DIR" -type f | wc -l)
    
    echo "" >> "$checksums_file"
    echo "# Backup Summary" >> "$checksums_file"
    echo "Total Size: $total_size" >> "$checksums_file"
    echo "File Count: $file_count" >> "$checksums_file"
    echo "Generated: $(date -u -Iseconds)" >> "$checksums_file"
    
    pass "Checksums generated: $file_count files, $total_size"
}

# Upload to S3 (optional)
upload_to_s3() {
    if [ -z "$S3_BUCKET" ]; then
        return 0
    fi
    
    say "Uploading backup to S3: $S3_BUCKET"
    
    if command -v aws >/dev/null 2>&1; then
        # Create compressed archive
        local archive_file="$BACKUP_BASE/$BACKUP_ID.tar.gz"
        tar -czf "$archive_file" -C "$BACKUP_BASE" "$BACKUP_ID"
        
        # Upload to S3
        aws s3 cp "$archive_file" "s3://$S3_BUCKET/conductor-backups/$BACKUP_ID.tar.gz" \
            --storage-class STANDARD_IA
        
        # Upload checksums separately
        aws s3 cp "$BACKUP_DIR/CHECKSUMS" "s3://$S3_BUCKET/conductor-backups/$BACKUP_ID.checksums"
        
        pass "Backup uploaded to S3"
        
        # Clean up local archive if upload successful
        rm -f "$archive_file"
    else
        warn "AWS CLI not available, skipping S3 upload"
    fi
}

# Clean old backups
cleanup_old_backups() {
    say "Cleaning up old backups (retention: $RETENTION_DAYS days)"
    
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d || date -v -${RETENTION_DAYS}d +%Y%m%d)
    
    local deleted_count=0
    for backup_dir in "$BACKUP_BASE"/conductor-backup-*; do
        if [ -d "$backup_dir" ]; then
            local backup_date=$(basename "$backup_dir" | sed 's/conductor-backup-//g' | cut -c1-8)
            if [ "$backup_date" -lt "$cutoff_date" ]; then
                rm -rf "$backup_dir"
                ((deleted_count++))
            fi
        fi
    done
    
    if [ $deleted_count -gt 0 ]; then
        pass "Cleaned up $deleted_count old backups"
    else
        pass "No old backups to clean up"
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        local payload=$(cat << EOF
{
  "text": "Conductor Backup $status",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Conductor Backup $status*\n$message\n\nBackup ID: \`$BACKUP_ID\`\nHost: \`$(hostname)\`\nTimestamp: \`$(date -u -Iseconds)\`"
      }
    }
  ]
}
EOF
        )
        
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "$payload" > /dev/null 2>&1 || warn "Failed to send notification"
    fi
}

# Verify backup integrity
verify_backup() {
    say "Verifying backup integrity"
    
    local checksums_file="$BACKUP_DIR/CHECKSUMS"
    if [ ! -f "$checksums_file" ]; then
        fail "Checksums file not found"
        return 1
    fi
    
    # Verify checksums
    if sha256sum -c "$checksums_file" --quiet; then
        pass "Backup integrity verified"
        return 0
    else
        fail "Backup integrity check failed"
        return 1
    fi
}

print_dry_run_plan() {
    local timestamp=$(date -u +%Y%m%dT%H%M%SZ)
    local planned_dir="$BACKUP_BASE/conductor-backup-${timestamp}"

    say "🧪 DRY RUN: no connections or secrets required"
    cat <<EOF
- Would initialize backup at: $planned_dir
- Would capture Neo4j graph export and Redis snapshot.
- PostgreSQL dump hook: $( [ "$INCLUDE_POSTGRES" = true ] && echo "requested (opt-in)" || echo "skipped by default" ).
- Would gather configuration, secrets, and audit chain artifacts.
- Would generate integrity checksums and upload to S3 bucket: ${S3_BUCKET:-<not set>}.
- Would enforce retention: keep latest ${RETENTION_DAYS} day(s).
EOF
}

# Main backup execution
main() {
    local start_time=$(date +%s)

    if [ "$DRY_RUN" = true ]; then
        print_dry_run_plan
        return 0
    fi

    # Initialize backup
    init_backup
    
    # Perform backups
    backup_neo4j || fail "Neo4j backup failed"
    if [ "$INCLUDE_POSTGRES" = true ]; then
        backup_postgres || fail "PostgreSQL backup failed"
    else
        warn "PostgreSQL backup skipped (enable with --include-postgres or INCLUDE_POSTGRES=true)"
    fi
    backup_redis || fail "Redis backup failed"
    backup_audit_chain
    backup_config
    backup_secrets
    
    # Generate integrity data
    generate_checksums
    
    # Verify backup
    if verify_backup; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local size=$(du -sh "$BACKUP_DIR" | cut -f1)
        
        local success_message="Backup completed successfully in ${duration}s (${size})"
        pass "$success_message"
        
        # Upload and cleanup
        upload_to_s3
        cleanup_old_backups
        
        # Send success notification
        send_notification "Success" "$success_message"
        
        say "🎉 Backup Complete: $BACKUP_ID"
        echo "Location: $BACKUP_DIR"
        echo "Size: $size"
        echo "Duration: ${duration}s"
        
        return 0
    else
        local error_message="Backup integrity verification failed"
        fail "$error_message"
        send_notification "Failed" "$error_message"
        return 1
    fi
}

usage() {
    cat << EOF
Usage: $0 [options]

Conductor BCDR Backup Script

Options:
  --dry-run            Preview the backup plan without executing.
  --include-postgres   Enable PostgreSQL dump hook (opt-in; skipped by default).
  --output <dir>       Override BACKUP_BASE for backup artifacts.
  --verify-only        Only verify an existing backup (requires BACKUP_ID).
  --help               Show this help.

Environment Variables:
  BACKUP_BASE=./backups                   Backup directory
  RETENTION_DAYS=30                       Backup retention period
  ENCRYPTION_KEY=secret                   Encryption key for secrets
  S3_BUCKET=my-backup-bucket              S3 bucket for remote storage
  NOTIFICATION_WEBHOOK=https://hooks...   Webhook for notifications

Database URLs:
  NEO4J_PASSWORD=password                 Neo4j password
  POSTGRES_URL=postgres://...             PostgreSQL connection (opt-in)
  REDIS_URL=redis://...                   Redis connection
  AUDIT_CHAIN_PATH=./data/audit           Audit chain directory

Examples:
  # Dry-run preview
  ./scripts/backup.sh --dry-run

  # Backup with PostgreSQL dump enabled
  INCLUDE_POSTGRES=true ./scripts/backup.sh --include-postgres

  # Verify existing backup
  BACKUP_ID=conductor-backup-20240315T120000Z ./scripts/backup.sh --verify-only

EOF
}

parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --include-postgres)
                INCLUDE_POSTGRES=true
                shift
                ;;
            --output)
                if [ -z "${2:-}" ]; then
                    fail "--output requires a directory"
                    usage
                    exit 1
                fi
                BACKUP_BASE="$2"
                shift 2
                ;;
            --verify-only)
                VERIFY_ONLY=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                fail "Unknown argument: $1"
                usage
                exit 1
                ;;
        esac
    done
}

parse_args "$@"

if [ "$VERIFY_ONLY" = true ]; then
    if [ -z "${BACKUP_ID:-}" ]; then
        fail "BACKUP_ID environment variable required for verification"
        exit 1
    fi
    BACKUP_DIR="$BACKUP_BASE/$BACKUP_ID"
    if [ ! -d "$BACKUP_DIR" ]; then
        fail "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    verify_backup
    exit $?
fi

main
