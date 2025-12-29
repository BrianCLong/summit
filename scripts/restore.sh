#!/usr/bin/env bash
set -euo pipefail

# Conductor BCDR Restore Script
# Restores conductor data from backup with integrity verification

# Configuration
BACKUP_BASE=${BACKUP_BASE:-./backups}
RESTORE_MODE=${RESTORE_MODE:-full}  # full|selective|verify-only
ENCRYPTION_KEY=${ENCRYPTION_KEY:-}
DRY_RUN=${DRY_RUN:-false}
TARGET_BACKUP_ID=""

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

# Verify backup integrity before restore
verify_backup_integrity() {
    local backup_dir="$1"
    
    say "Verifying backup integrity"
    
    if [ ! -f "$backup_dir/CHECKSUMS" ]; then
        fail "Checksums file not found in backup"
        return 1
    fi
    
    # Change to backup directory for checksum verification
    if (cd "$backup_dir" && sha256sum -c CHECKSUMS --quiet); then
        pass "Backup integrity verified"
        return 0
    else
        fail "Backup integrity check failed"
        return 1
    fi
}

# Stop services before restore
stop_services() {
    say "Stopping conductor services"
    
    # Stop conductor stack
    if [ -f "docker-compose.dev.yml" ]; then
        docker compose -f docker-compose.dev.yml stop || warn "Could not stop some services"
    fi
    
    # Stop individual services if needed
    docker stop neo4j postgres redis || warn "Some services were not running"
    
    pass "Services stopped"
}

# Start services after restore
start_services() {
    say "Starting conductor services"
    
    if [ -f "docker-compose.dev.yml" ]; then
        docker compose -f docker-compose.dev.yml up -d
        pass "Services started"
        
        # Wait for services to be ready
        sleep 10
        
        # Verify services are healthy
        local services=("neo4j" "postgres" "redis")
        for service in "${services[@]}"; do
            if docker compose -f docker-compose.dev.yml ps "$service" | grep -q "Up"; then
                pass "$service is running"
            else
                warn "$service may not be running properly"
            fi
        done
    else
        fail "Docker compose file not found"
        return 1
    fi
}

# Restore Neo4j database
restore_neo4j() {
    local backup_dir="$1"
    
    say "Restoring Neo4j database"
    
    # Stop Neo4j first
    docker stop neo4j || warn "Neo4j was not running"
    
    # Remove existing data
    docker volume rm intelgraph_neo4j_data || warn "Neo4j data volume not found"
    docker volume create intelgraph_neo4j_data
    
    if [ -f "$backup_dir/neo4j.dump" ]; then
        # Restore from dump file
        docker run --rm -v intelgraph_neo4j_data:/data -v "$backup_dir":/backup \
            neo4j:5-community neo4j-admin database load neo4j --from-path=/backup/neo4j.dump --overwrite-destination=true
        pass "Neo4j database restored from dump"
    elif [ -f "$backup_dir/neo4j-export.cypher" ]; then
        # Restore from cypher export
        warn "Restoring from cypher export (less reliable)"
        
        # Start Neo4j temporarily
        docker start neo4j
        sleep 15
        
        # Import cypher file
        docker cp "$backup_dir/neo4j-export.cypher" neo4j:/tmp/restore.cypher
        docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
            --file /tmp/restore.cypher || warn "Some cypher statements may have failed"
        
        pass "Neo4j database restored from cypher export"
    else
        fail "No Neo4j backup file found"
        return 1
    fi
}

# Restore PostgreSQL database
restore_postgres() {
    local backup_dir="$1"
    
    say "Restoring PostgreSQL database"
    
    if [ ! -f "$backup_dir/postgres.sql" ]; then
        fail "PostgreSQL backup file not found"
        return 1
    fi
    
    # Stop Postgres
    docker stop postgres || warn "PostgreSQL was not running"
    
    # Remove existing data
    docker volume rm intelgraph_postgres_data || warn "PostgreSQL data volume not found"
    docker volume create intelgraph_postgres_data
    
    # Start PostgreSQL
    docker start postgres
    sleep 10
    
    # Restore database
    local postgres_url="${POSTGRES_URL:-postgres://intelgraph:devpassword@localhost:5432/intelgraph_dev}"
    
    if command -v psql >/dev/null 2>&1; then
        # Use local psql if available
        psql "$postgres_url" < "$backup_dir/postgres.sql"
    else
        # Use docker exec
        docker cp "$backup_dir/postgres.sql" postgres:/tmp/restore.sql
        docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
            -d "${POSTGRES_DB:-intelgraph_dev}" -f /tmp/restore.sql
    fi
    
    pass "PostgreSQL database restored"
}

# Restore Redis data
restore_redis() {
    local backup_dir="$1"
    
    say "Restoring Redis data"
    
    if [ ! -f "$backup_dir/redis.rdb" ]; then
        fail "Redis backup file not found"
        return 1
    fi
    
    # Stop Redis
    docker stop redis || warn "Redis was not running"
    
    # Remove existing data
    docker volume rm intelgraph_redis_data || warn "Redis data volume not found"
    docker volume create intelgraph_redis_data
    
    # Copy backup file to volume
    docker run --rm -v intelgraph_redis_data:/data -v "$backup_dir":/backup \
        alpine cp /backup/redis.rdb /data/dump.rdb
    
    # Start Redis
    docker start redis
    sleep 5
    
    # Verify Redis is working
    local redis_url="${REDIS_URL:-redis://localhost:6379}"
    if command -v redis-cli >/dev/null 2>&1; then
        redis-cli -u "$redis_url" ping > /dev/null
    else
        docker exec redis redis-cli ping > /dev/null
    fi
    
    pass "Redis data restored"
}

# Restore audit chain
restore_audit_chain() {
    local backup_dir="$1"
    
    say "Restoring conductor audit chain"
    
    if [ ! -f "$backup_dir/audit-chain.tar.gz" ]; then
        warn "Audit chain backup not found, skipping"
        return 0
    fi
    
    local audit_path="${AUDIT_CHAIN_PATH:-./data/audit}"
    
    # Backup existing audit chain
    if [ -d "$audit_path" ]; then
        mv "$audit_path" "${audit_path}.backup.$(date +%s)" || warn "Could not backup existing audit chain"
    fi
    
    # Create audit directory
    mkdir -p "$(dirname "$audit_path")"
    
    # Extract audit chain
    tar -xzf "$backup_dir/audit-chain.tar.gz" -C "$(dirname "$audit_path")"
    
    # Verify audit chain integrity
    if [ -f "./scripts/audit-verify.sh" ]; then
        if ./scripts/audit-verify.sh; then
            pass "Audit chain restored and verified"
        else
            warn "Audit chain integrity verification failed"
        fi
    else
        pass "Audit chain restored (verification skipped)"
    fi
}

# Restore configuration
restore_config() {
    local backup_dir="$1"
    
    say "Restoring configuration files"
    
    if [ ! -d "$backup_dir/config" ]; then
        warn "Configuration backup not found, skipping"
        return 0
    fi
    
    # Backup existing configuration
    local config_backup="./config.backup.$(date +%s)"
    mkdir -p "$config_backup"
    
    # Restore OPA policies
    if [ -d "$backup_dir/config/opa-policies" ]; then
        if [ -d "server/src/conductor/security" ]; then
            cp -r "server/src/conductor/security" "$config_backup/"
        fi
        cp -r "$backup_dir/config/opa-policies" "server/src/conductor/security"
        pass "OPA policies restored"
    fi
    
    # Restore policy bundles
    if [ -d "$backup_dir/config/policy-bundles" ]; then
        mkdir -p "policy"
        cp -r "$backup_dir/config/policy-bundles" "policy/bundles"
        pass "Policy bundles restored"
    fi
    
    # Restore other config files (with caution)
    local safe_configs=("observability/prometheus.yml" "observability/alert-rules.yml" "policy/opa-config.yaml")
    for config in "${safe_configs[@]}"; do
        if [ -f "$backup_dir/config/$(basename "$config")" ]; then
            mkdir -p "$(dirname "$config")"
            cp "$backup_dir/config/$(basename "$config")" "$config"
            pass "Restored: $config"
        fi
    done
    
    pass "Configuration files restored"
}

# Restore secrets (encrypted)
restore_secrets() {
    local backup_dir="$1"
    
    say "Restoring application secrets"
    
    local secrets_file="$backup_dir/secrets.enc"
    if [ ! -f "$secrets_file" ]; then
        warn "Secrets backup not found, skipping"
        return 0
    fi
    
    if [ -z "$ENCRYPTION_KEY" ]; then
        warn "ENCRYPTION_KEY not provided, cannot decrypt secrets"
        return 0
    fi
    
    # Decrypt secrets
    local temp_secrets=$(mktemp)
    
    if command -v gpg >/dev/null 2>&1; then
        gpg --decrypt --batch --yes --passphrase "$ENCRYPTION_KEY" \
            --output "$temp_secrets" "$secrets_file" 2>/dev/null
    else
        # Fallback to openssl
        openssl enc -aes-256-cbc -d -in "$secrets_file" -out "$temp_secrets" \
            -pass "pass:$ENCRYPTION_KEY" 2>/dev/null
    fi
    
    if [ -s "$temp_secrets" ]; then
        # Restore environment variables to .env.restored
        grep -E "^[A-Z_]+=.*" "$temp_secrets" > ".env.restored" || true
        
        warn "Secrets restored to .env.restored - review and merge manually"
        pass "Secrets decrypted successfully"
    else
        fail "Failed to decrypt secrets"
    fi
    
    rm -f "$temp_secrets"
}

# Post-restore verification
verify_restore() {
    say "Verifying restore completion"
    
    local checks=0
    local passed=0
    
    # Check Neo4j
    if docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
        "RETURN 'Neo4j OK' AS status" >/dev/null 2>&1; then
        pass "Neo4j is accessible"
        ((passed++))
    else
        fail "Neo4j is not accessible"
    fi
    ((checks++))
    
    # Check PostgreSQL
    if docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
        -d "${POSTGRES_DB:-intelgraph_dev}" -c "SELECT 'PostgreSQL OK';" >/dev/null 2>&1; then
        pass "PostgreSQL is accessible"
        ((passed++))
    else
        fail "PostgreSQL is not accessible"
    fi
    ((checks++))
    
    # Check Redis
    if docker exec redis redis-cli ping >/dev/null 2>&1; then
        pass "Redis is accessible"
        ((passed++))
    else
        fail "Redis is not accessible"
    fi
    ((checks++))
    
    # Summary
    if [ $passed -eq $checks ]; then
        pass "All verification checks passed ($passed/$checks)"
        return 0
    else
        fail "Some verification checks failed ($passed/$checks)"
        return 1
    fi
}

validate_backup_dir() {
    local backup_id="$1"
    local backup_dir="$BACKUP_BASE/$backup_id"

    if [ -z "$backup_id" ]; then
        fail "Backup ID required"
        echo "Use --help for usage information"
        exit 1
    fi

    if [ ! -d "$backup_dir" ]; then
        fail "Backup directory not found: $backup_dir"
        exit 1
    fi

    if [ ! -r "$backup_dir" ]; then
        fail "Backup directory is not readable: $backup_dir"
        exit 1
    fi
}

print_restore_plan() {
    local backup_id="$1"
    local backup_dir="$BACKUP_BASE/$backup_id"

    say "🧪 DRY RUN: validation only"
    cat <<EOF
- Validated backup directory: $backup_dir
- Restore mode: $RESTORE_MODE
- Would stop application services prior to restoration.
- Would restore Neo4j, Redis, configuration, secrets, and audit artifacts based on mode toggles.
- PostgreSQL restore hook remains opt-in via RESTORE_POSTGRES/RESTORE_MODE.
- Would perform post-restore verification and service restarts.
EOF
}

# Main restore execution
main() {
    local backup_id="$1"
    local backup_dir="$BACKUP_BASE/$backup_id"

    validate_backup_dir "$backup_id"

    if [ "$DRY_RUN" = true ]; then
        print_restore_plan "$backup_id"
        return 0
    fi

    say "🔄 Starting Conductor Restore"
    say "Backup ID: $backup_id"
    say "Restore Mode: $RESTORE_MODE"
    say "Backup Directory: $backup_dir"

    # Verify backup integrity first
    if ! verify_backup_integrity "$backup_dir"; then
        exit 1
    fi
    
    if [ "$RESTORE_MODE" = "verify-only" ]; then
        pass "Backup verification completed successfully"
        return 0
    fi
    
    # Stop services
    stop_services
    
    # Perform restore based on mode
    case "$RESTORE_MODE" in
        "full")
            restore_neo4j "$backup_dir"
            restore_postgres "$backup_dir"
            restore_redis "$backup_dir"
            restore_audit_chain "$backup_dir"
            restore_config "$backup_dir"
            restore_secrets "$backup_dir"
            ;;
        "selective")
            if [ "${RESTORE_NEO4J:-true}" = "true" ]; then
                restore_neo4j "$backup_dir"
            fi
            if [ "${RESTORE_POSTGRES:-true}" = "true" ]; then
                restore_postgres "$backup_dir"
            fi
            if [ "${RESTORE_REDIS:-true}" = "true" ]; then
                restore_redis "$backup_dir"
            fi
            if [ "${RESTORE_AUDIT:-false}" = "true" ]; then
                restore_audit_chain "$backup_dir"
            fi
            if [ "${RESTORE_CONFIG:-false}" = "true" ]; then
                restore_config "$backup_dir"
            fi
            ;;
        *)
            fail "Unknown restore mode: $RESTORE_MODE"
            exit 1
            ;;
    esac
    
    # Start services
    start_services
    
    # Verify restore
    if verify_restore; then
        say "🎉 Restore Completed Successfully"
        
        cat << EOF

📋 Post-Restore Checklist:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Verify application functionality
□ Check conductor health endpoints
□ Run smoke tests
□ Review restored configuration
□ Update secrets if needed
□ Test backup/restore procedures

EOF
        
        return 0
    else
        fail "Restore completed with errors - manual intervention required"
        return 1
    fi
}

usage() {
    cat << EOF
Usage: $0 [options] <backup_id>

Conductor BCDR Restore Script

Options:
  --dry-run                    Validate inputs and preview restore steps.
  --mode=full|selective|verify-only  Restore mode (default: full)
  --help                       Show this help

Environment Variables:
  BACKUP_BASE=./backups              Backup directory
  RESTORE_MODE=full                  full|selective|verify-only
  ENCRYPTION_KEY=secret              Encryption key for secrets
  RESTORE_NEO4J=true                 Restore Neo4j database
  RESTORE_POSTGRES=true              Restore PostgreSQL database (opt-in execution)
  RESTORE_REDIS=true                 Restore Redis data
  RESTORE_AUDIT=false                Restore audit chain
  RESTORE_CONFIG=false               Restore configuration

Database Configuration:
  NEO4J_PASSWORD=password          Neo4j password
  POSTGRES_URL=postgres://...      PostgreSQL connection
  POSTGRES_USER=user               PostgreSQL user
  POSTGRES_DB=dbname               PostgreSQL database
  REDIS_URL=redis://...            Redis connection
  AUDIT_CHAIN_PATH=./data/audit    Audit chain directory

Examples:
  # Full restore
  ./scripts/restore.sh conductor-backup-20240315T120000Z

  # Dry-run with validation
  ./scripts/restore.sh --dry-run conductor-backup-20240315T120000Z

  # Verify backup only
  RESTORE_MODE=verify-only ./scripts/restore.sh conductor-backup-20240315T120000Z

  # Selective restore (databases only)
  RESTORE_MODE=selective RESTORE_CONFIG=false ./scripts/restore.sh conductor-backup-20240315T120000Z

EOF
}

parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --mode=*)
                RESTORE_MODE="${1#*=}"
                shift
                ;;
            --mode)
                if [ -z "${2:-}" ]; then
                    fail "--mode requires a value"
                    usage
                    exit 1
                fi
                RESTORE_MODE="$2"
                shift 2
                ;;
            --help)
                usage
                exit 0
                ;;
            --*)
                fail "Unknown argument: $1"
                usage
                exit 1
                ;;
            *)
                if [ -z "$TARGET_BACKUP_ID" ]; then
                    TARGET_BACKUP_ID="$1"
                    shift
                else
                    fail "Unexpected argument: $1"
                    usage
                    exit 1
                fi
                ;;
        esac
    done
}

parse_args "$@"

if [ -z "$TARGET_BACKUP_ID" ]; then
    fail "Backup ID required"
    echo "Use --help for usage information"
    exit 1
fi

main "$TARGET_BACKUP_ID"
