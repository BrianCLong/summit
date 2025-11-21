#!/usr/bin/env bash
set -euo pipefail

# Enhanced Restore Script for Summit
# Supports full, selective restore with data sanitization for dev/test environments
# Integrates with backup-sets.yaml configuration

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_CONFIG="${BACKUP_CONFIG:-$PROJECT_ROOT/config/backup-sets.yaml}"
BACKUP_BASE="${BACKUP_BASE:-./backups}"
RESTORE_MODE="${RESTORE_MODE:-full}"
RESTORE_ENV="${RESTORE_ENV:-production}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
DRY_RUN="${DRY_RUN:-false}"
SANITIZE="${SANITIZE:-auto}"  # auto, true, false

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Logging
say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }
info() { printf "${CYAN}ℹ️  %s${NC}\n" "$*"; }
sanitize_info() { printf "${MAGENTA}🔒 %s${NC}\n" "$*"; }

# Determine if sanitization should be applied
should_sanitize() {
    if [ "$SANITIZE" = "true" ]; then
        return 0
    elif [ "$SANITIZE" = "false" ]; then
        return 1
    elif [ "$SANITIZE" = "auto" ]; then
        # Auto-enable sanitization for dev/test environments
        case "$RESTORE_ENV" in
            "dev"|"test"|"development"|"testing")
                return 0
                ;;
            *)
                return 1
                ;;
        esac
    fi
    return 1
}

# Verify backup integrity
verify_backup_integrity() {
    local backup_dir="$1"

    say "Verifying backup integrity"

    if [ ! -f "$backup_dir/CHECKSUMS" ]; then
        fail "Checksums file not found in backup"
        return 1
    fi

    if (cd "$backup_dir" && sha256sum -c CHECKSUMS --quiet 2>/dev/null); then
        pass "Backup integrity verified"
        return 0
    else
        fail "Backup integrity check failed"
        return 1
    fi
}

# Stop services
stop_services() {
    say "Stopping Summit services"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would stop services"
        return 0
    fi

    if [ -f "docker-compose.yml" ]; then
        docker compose stop || warn "Could not stop some services"
    fi

    docker stop neo4j postgres redis 2>/dev/null || warn "Some services were not running"

    pass "Services stopped"
}

# Start services
start_services() {
    say "Starting Summit services"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would start services"
        return 0
    fi

    if [ -f "docker-compose.yml" ]; then
        docker compose up -d
        pass "Services started"

        sleep 10

        # Verify services are healthy
        local services=("neo4j" "postgres" "redis")
        for service in "${services[@]}"; do
            if docker compose ps "$service" 2>/dev/null | grep -q "Up"; then
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

# Sanitize PostgreSQL data
sanitize_postgres_data() {
    say "Sanitizing PostgreSQL data for $RESTORE_ENV environment"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would sanitize PostgreSQL data"
        return 0
    fi

    local postgres_url="${POSTGRES_URL:-postgres://intelgraph:devpassword@localhost:5432/intelgraph_dev}"

    # Create sanitization SQL script
    cat > /tmp/sanitize-postgres.sql << 'EOF'
-- Sanitize PII fields
UPDATE users SET
    email = 'dev_' || id || '@example.com',
    phone = '+1-555-' || LPAD(id::text, 7, '0'),
    address = NULL
WHERE email NOT LIKE '%@example.com';

-- Sanitize entity contact information
UPDATE entities SET
    contact_email = 'entity_' || id || '@example.com',
    phone_number = '+1-555-' || LPAD(id::text, 7, '0')
WHERE contact_email IS NOT NULL AND contact_email NOT LIKE '%@example.com';

-- Redact sensitive investigation data
UPDATE investigations SET
    classified_info = '[REDACTED FOR DEV/TEST]',
    internal_notes = '[REDACTED FOR DEV/TEST]'
WHERE classified_info IS NOT NULL OR internal_notes IS NOT NULL;

-- Hash audit log IPs
UPDATE audit_logs SET
    user_ip = MD5(user_ip || 'dev_salt'),
    session_data = NULL
WHERE user_ip IS NOT NULL;

-- Update credentials to dev values
UPDATE configuration SET
    value = 'dev_test_key_' || name
WHERE name LIKE '%_KEY' OR name LIKE '%_SECRET' OR name LIKE '%_PASSWORD';

-- Redact billing information
UPDATE billing SET
    credit_card = '****-****-****-0000',
    bank_account = '****0000'
WHERE credit_card IS NOT NULL OR bank_account IS NOT NULL;
EOF

    sanitize_info "Applying data sanitization rules..."

    if command -v psql >/dev/null 2>&1; then
        psql "$postgres_url" -f /tmp/sanitize-postgres.sql 2>&1 | grep -E "(UPDATE|ERROR)" || true
    else
        docker cp /tmp/sanitize-postgres.sql postgres:/tmp/
        docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
            -d "${POSTGRES_DB:-intelgraph_dev}" -f /tmp/sanitize-postgres.sql 2>&1 | grep -E "(UPDATE|ERROR)" || true
    fi

    rm -f /tmp/sanitize-postgres.sql

    pass "PostgreSQL data sanitized"
}

# Apply data reduction (for dev/test environments)
apply_data_reduction() {
    local reduction_factor="${1:-0.1}"  # Default 10%

    say "Applying data reduction (keeping ${reduction_factor}% of data)"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would apply data reduction"
        return 0
    fi

    local postgres_url="${POSTGRES_URL:-postgres://intelgraph:devpassword@localhost:5432/intelgraph_dev}"

    # Create data reduction SQL script
    cat > /tmp/reduce-data.sql << EOF
-- Keep only a sample of non-critical data
DELETE FROM audit_logs
WHERE id NOT IN (
    SELECT id FROM audit_logs
    ORDER BY created_at DESC
    LIMIT (SELECT CEIL(COUNT(*) * $reduction_factor) FROM audit_logs)
);

DELETE FROM analytics_traces
WHERE id NOT IN (
    SELECT id FROM analytics_traces
    ORDER BY timestamp DESC
    LIMIT (SELECT CEIL(COUNT(*) * $reduction_factor) FROM analytics_traces)
);

-- Keep recent events only for TimescaleDB
DELETE FROM events
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Vacuum to reclaim space
VACUUM FULL ANALYZE;
EOF

    sanitize_info "Reducing dataset size..."

    if command -v psql >/dev/null 2>&1; then
        psql "$postgres_url" -f /tmp/reduce-data.sql
    else
        docker cp /tmp/reduce-data.sql postgres:/tmp/
        docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
            -d "${POSTGRES_DB:-intelgraph_dev}" -f /tmp/reduce-data.sql
    fi

    rm -f /tmp/reduce-data.sql

    pass "Data reduction applied"
}

# Restore Neo4j database
restore_neo4j() {
    local backup_dir="$1"

    say "Restoring Neo4j database"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would restore Neo4j database"
        return 0
    fi

    docker stop neo4j 2>/dev/null || warn "Neo4j was not running"

    # Remove existing data
    docker volume rm summit_neo4j_data 2>/dev/null || docker volume rm intelgraph_neo4j_data 2>/dev/null || warn "Neo4j data volume not found"
    docker volume create summit_neo4j_data || docker volume create intelgraph_neo4j_data

    if [ -f "$backup_dir/neo4j.dump" ]; then
        docker run --rm -v summit_neo4j_data:/data -v "$backup_dir":/backup \
            neo4j:5-community neo4j-admin database load neo4j --from-path=/backup --overwrite-destination=true
        pass "Neo4j database restored from dump"
    elif [ -f "$backup_dir/neo4j-export.cypher" ]; then
        warn "Restoring from cypher export (less reliable)"

        docker start neo4j
        sleep 15

        docker cp "$backup_dir/neo4j-export.cypher" neo4j:/tmp/restore.cypher
        docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
            --file /tmp/restore.cypher || warn "Some cypher statements may have failed"

        pass "Neo4j database restored from cypher export"
    else
        fail "No Neo4j backup file found"
        return 1
    fi
}

# Sanitize Neo4j data
sanitize_neo4j_data() {
    say "Sanitizing Neo4j data for $RESTORE_ENV environment"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would sanitize Neo4j data"
        return 0
    fi

    # Create sanitization Cypher script
    cat > /tmp/sanitize-neo4j.cypher << 'EOF'
// Sanitize email addresses
MATCH (u:User)
WHERE u.email IS NOT NULL AND NOT u.email ENDS WITH '@example.com'
SET u.email = 'dev_' + id(u) + '@example.com';

// Sanitize phone numbers
MATCH (n)
WHERE n.phone IS NOT NULL
SET n.phone = '+1-555-' + substring(toString(id(n)), 0, 7);

// Redact classified properties
MATCH (n)
WHERE n.classified IS NOT NULL
SET n.classified = '[REDACTED FOR DEV/TEST]';

// Remove sensitive labels
MATCH (n:Classified)
REMOVE n:Classified
SET n:DevData;

RETURN "Sanitization complete" AS status;
EOF

    sanitize_info "Applying Neo4j sanitization rules..."

    docker cp /tmp/sanitize-neo4j.cypher neo4j:/tmp/
    docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
        --file /tmp/sanitize-neo4j.cypher || warn "Some sanitization statements may have failed"

    rm -f /tmp/sanitize-neo4j.cypher

    pass "Neo4j data sanitized"
}

# Restore PostgreSQL database
restore_postgres() {
    local backup_dir="$1"

    say "Restoring PostgreSQL database"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would restore PostgreSQL database"
        return 0
    fi

    # Find the backup file (support both .sql and .dump formats)
    local backup_file=""
    if [ -f "$backup_dir/postgres-full.dump" ]; then
        backup_file="$backup_dir/postgres-full.dump"
    elif [ -f "$backup_dir/postgres.sql" ]; then
        backup_file="$backup_dir/postgres.sql"
    elif [ -f "$backup_dir/postgres-core.dump" ]; then
        backup_file="$backup_dir/postgres-core.dump"
    else
        fail "PostgreSQL backup file not found"
        return 1
    fi

    docker stop postgres 2>/dev/null || warn "PostgreSQL was not running"

    # Remove existing data
    docker volume rm summit_postgres_data 2>/dev/null || docker volume rm intelgraph_postgres_data 2>/dev/null || warn "PostgreSQL data volume not found"
    docker volume create summit_postgres_data || docker volume create intelgraph_postgres_data

    docker start postgres
    sleep 10

    # Restore database
    local postgres_url="${POSTGRES_URL:-postgres://intelgraph:devpassword@localhost:5432/intelgraph_dev}"

    if [[ "$backup_file" == *.dump ]]; then
        # Custom format backup
        if command -v pg_restore >/dev/null 2>&1; then
            pg_restore -d "$postgres_url" --clean --if-exists "$backup_file"
        else
            docker cp "$backup_file" postgres:/tmp/restore.dump
            docker exec postgres pg_restore -U "${POSTGRES_USER:-intelgraph}" \
                -d "${POSTGRES_DB:-intelgraph_dev}" --clean --if-exists /tmp/restore.dump
        fi
    else
        # SQL format backup
        if command -v psql >/dev/null 2>&1; then
            psql "$postgres_url" < "$backup_file"
        else
            docker cp "$backup_file" postgres:/tmp/restore.sql
            docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
                -d "${POSTGRES_DB:-intelgraph_dev}" -f /tmp/restore.sql
        fi
    fi

    pass "PostgreSQL database restored"
}

# Restore Redis data
restore_redis() {
    local backup_dir="$1"

    say "Restoring Redis data"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would restore Redis data"
        return 0
    fi

    if [ ! -f "$backup_dir/redis.rdb" ]; then
        fail "Redis backup file not found"
        return 1
    fi

    docker stop redis 2>/dev/null || warn "Redis was not running"

    # Remove existing data
    docker volume rm summit_redis_data 2>/dev/null || docker volume rm intelgraph_redis_data 2>/dev/null || warn "Redis data volume not found"
    docker volume create summit_redis_data || docker volume create intelgraph_redis_data

    # Copy backup file to volume
    docker run --rm -v summit_redis_data:/data -v "$backup_dir":/backup \
        alpine cp /backup/redis.rdb /data/dump.rdb || \
    docker run --rm -v intelgraph_redis_data:/data -v "$backup_dir":/backup \
        alpine cp /backup/redis.rdb /data/dump.rdb

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

# Restore configuration
restore_config() {
    local backup_dir="$1"

    say "Restoring configuration files"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would restore configuration files"
        return 0
    fi

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
        mkdir -p "server/src/conductor"
        cp -r "$backup_dir/config/opa-policies" "server/src/conductor/security"
        pass "OPA policies restored"
    fi

    pass "Configuration files restored"
}

# Post-restore verification
verify_restore() {
    say "Verifying restore completion"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would verify restore"
        return 0
    fi

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

# Main restore execution
main() {
    local backup_id="$1"
    local backup_dir="$BACKUP_BASE/$backup_id"

    if [ ! -d "$backup_dir" ]; then
        fail "Backup directory not found: $backup_dir"
        exit 1
    fi

    say "🔄 Starting Summit Restore"
    say "Backup ID: $backup_id"
    say "Restore Mode: $RESTORE_MODE"
    say "Environment: $RESTORE_ENV"
    say "Backup Directory: $backup_dir"

    if should_sanitize; then
        sanitize_info "Data sanitization ENABLED for $RESTORE_ENV environment"
    else
        info "Data sanitization disabled for $RESTORE_ENV environment"
    fi

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

    # Perform restore
    restore_neo4j "$backup_dir"
    restore_postgres "$backup_dir"
    restore_redis "$backup_dir"
    restore_config "$backup_dir"

    # Start services before sanitization
    start_services

    # Apply sanitization if needed
    if should_sanitize; then
        sanitize_postgres_data
        sanitize_neo4j_data

        # Apply data reduction for dev/test
        if [ "$RESTORE_ENV" = "dev" ]; then
            apply_data_reduction 0.1  # 10% of data
        elif [ "$RESTORE_ENV" = "test" ]; then
            apply_data_reduction 0.2  # 20% of data
        fi
    fi

    # Verify restore
    if verify_restore; then
        say "🎉 Restore Completed Successfully"

        cat << EOF

📋 Post-Restore Checklist:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Verify application functionality
□ Check health endpoints
□ Run smoke tests
$(should_sanitize && echo "✓ Data sanitization applied" || echo "□ Review data security")
□ Update environment-specific configs
□ Test backup/restore procedures

EOF

        return 0
    else
        fail "Restore completed with errors - manual intervention required"
        return 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help)
        cat << EOF
Usage: $0 <backup-id> [options]

Summit Enhanced Restore Script

Arguments:
  backup-id                 Backup ID to restore from

Options:
  --mode=MODE              Restore mode: full|selective|verify-only
  --env=ENV                Target environment: production|staging|dr_rehearsal|dev|test
  --sanitize=BOOL          Force sanitization: auto|true|false (default: auto)
  --dry-run                Simulate restore without executing
  --help                   Show this help

Environment Variables:
  BACKUP_BASE=./backups            Backup directory
  RESTORE_MODE=full                Restore mode
  RESTORE_ENV=production           Target environment
  SANITIZE=auto                    Sanitization mode
  ENCRYPTION_KEY=secret            Encryption key for secrets

Examples:
  # Full restore to production (no sanitization)
  ./scripts/restore-enhanced.sh summit-backup-full-20250120T120000Z --env=production

  # Restore to dev environment (auto-sanitize)
  ./scripts/restore-enhanced.sh summit-backup-full-20250120T120000Z --env=dev

  # Restore to test environment with forced sanitization
  ./scripts/restore-enhanced.sh summit-backup-full-20250120T120000Z --env=test --sanitize=true

  # DR rehearsal restore
  ./scripts/restore-enhanced.sh summit-backup-disaster_recovery-20250120T120000Z --env=dr_rehearsal

  # Verify backup only
  ./scripts/restore-enhanced.sh summit-backup-full-20250120T120000Z --mode=verify-only

  # Dry run
  ./scripts/restore-enhanced.sh summit-backup-full-20250120T120000Z --env=dev --dry-run

EOF
        exit 0
        ;;
    --mode=*)
        export RESTORE_MODE="${1#*=}"
        shift
        main "$@"
        ;;
    --env=*)
        export RESTORE_ENV="${1#*=}"
        shift
        main "$@"
        ;;
    --sanitize=*)
        export SANITIZE="${1#*=}"
        shift
        main "$@"
        ;;
    --dry-run)
        export DRY_RUN=true
        shift
        main "$@"
        ;;
    "")
        fail "Backup ID required"
        echo "Use --help for usage information"
        exit 1
        ;;
    *)
        main "$@"
        ;;
esac
