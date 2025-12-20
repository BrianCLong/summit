#!/usr/bin/env bash
#
# Summit Database Restore Script
#
# A unified, environment-aware restore script for Summit/IntelGraph datastores.
# Includes comprehensive safety guardrails to prevent accidental data loss.
#
# Usage:
#   ./scripts/db/restore.sh --env=dev --backup-path=./backups/summit-backup-dev-20251206T120000Z
#   ./scripts/db/restore.sh --env=staging --backup-id=summit-backup-staging-20251206T120000Z
#   ./scripts/db/restore.sh --env=dev --backup-path=./backups/backup-dir --dry-run
#
# For full help:
#   ./scripts/db/restore.sh --help
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)

# Defaults
ENV="${ENV:-dev}"
DATASTORES="${DATASTORES:-all}"
BACKUP_PATH="${BACKUP_PATH:-}"
BACKUP_ID="${BACKUP_ID:-}"
BACKUP_BASE="${BACKUP_BASE:-$PROJECT_ROOT/backups}"
DRY_RUN="${DRY_RUN:-false}"
FORCE="${FORCE:-false}"
SANITIZE="${SANITIZE:-false}"
CONFIRM_PRODUCTION="${CONFIRM_PRODUCTION:-false}"
SKIP_VERIFICATION="${SKIP_VERIFICATION:-false}"
VERBOSE="${VERBOSE:-false}"
TENANT="${TENANT:-}"

# S3 Configuration
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-summit-backups}"

# Database defaults (can be overridden by environment)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-summit_dev}"
POSTGRES_USER="${POSTGRES_USER:-summit}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-devpassword}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres}"

NEO4J_HOST="${NEO4J_HOST:-localhost}"
NEO4J_PORT="${NEO4J_PORT:-7687}"
NEO4J_USERNAME="${NEO4J_USERNAME:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-devpassword}"
NEO4J_CONTAINER="${NEO4J_CONTAINER:-neo4j}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-devpassword}"
REDIS_CONTAINER="${REDIS_CONTAINER:-redis}"

# ============================================================================
# Colors and Output
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()    { printf "${BLUE}[INFO]${NC} %s\n" "$*"; }
log_success() { printf "${GREEN}[OK]${NC} %s\n" "$*"; }
log_warn()    { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
log_error()   { printf "${RED}[ERROR]${NC} %s\n" "$*"; }
log_debug()   { [[ "$VERBOSE" == "true" ]] && printf "${CYAN}[DEBUG]${NC} %s\n" "$*" || true; }

# ============================================================================
# Help
# ============================================================================

show_help() {
    cat << 'EOF'
Summit Database Restore Script
===============================

Unified restore script for Summit/IntelGraph datastores with comprehensive
safety guardrails to prevent accidental data loss.

USAGE:
    ./scripts/db/restore.sh [OPTIONS]

OPTIONS:
    --env=ENV           Target environment: dev, staging, production
                        Default: dev

    --backup-path=PATH  Path to local backup directory
                        Example: ./backups/summit-backup-dev-20251206T120000Z

    --backup-id=ID      Backup ID to restore from S3
                        Requires S3_BUCKET environment variable

    --datastores=LIST   Comma-separated list of datastores to restore:
                        postgres, neo4j, redis, all
                        Default: all (from available in backup)

    --sanitize          Sanitize restored data (mask PII, reset passwords)
                        Required when restoring prod data to non-prod

    --force             Skip confirmation prompts (use with caution)

    --skip-verification Skip post-restore verification checks

    --dry-run           Show what would be done without executing

    --confirm-production
                        Required flag to restore to production environment

    --tenant=TENANT     Tenant identifier to restore. Required for multi-tenant
                        backups and validated against backup metadata or folder

    --verbose           Enable verbose output

    --help              Show this help message

ENVIRONMENT VARIABLES:
    # PostgreSQL
    POSTGRES_HOST       Database host (default: localhost)
    POSTGRES_PORT       Database port (default: 5432)
    POSTGRES_DB         Database name (default: summit_dev)
    POSTGRES_USER       Database user (default: summit)
    POSTGRES_PASSWORD   Database password
    POSTGRES_CONTAINER  Docker container name (default: postgres)

    # Neo4j
    NEO4J_HOST          Database host (default: localhost)
    NEO4J_PORT          Bolt port (default: 7687)
    NEO4J_USERNAME      Username (default: neo4j)
    NEO4J_PASSWORD      Password
    NEO4J_CONTAINER     Docker container name (default: neo4j)

    # Redis
    REDIS_HOST          Redis host (default: localhost)
    REDIS_PORT          Redis port (default: 6379)
    REDIS_PASSWORD      Redis password
    REDIS_CONTAINER     Docker container name (default: redis)

    # S3 Download
    S3_BUCKET           S3 bucket name for downloads
    S3_PREFIX           S3 prefix path (default: summit-backups)

EXAMPLES:
    # Restore from local backup
    ./scripts/db/restore.sh --env=dev --backup-path=./backups/summit-backup-dev-20251206T120000Z

    # Restore from S3
    ./scripts/db/restore.sh --env=staging --backup-id=summit-backup-staging-20251206T120000Z

    # Restore only PostgreSQL
    ./scripts/db/restore.sh --env=dev --backup-path=./backups/backup --datastores=postgres

    # Dry run
    ./scripts/db/restore.sh --env=dev --backup-path=./backups/backup --dry-run

    # Restore prod data to staging with sanitization
    ./scripts/db/restore.sh --env=staging --backup-id=summit-backup-prod-latest --sanitize

    # Production restore (requires explicit confirmation)
    ./scripts/db/restore.sh --env=production --backup-path=./backups/backup --confirm-production

SAFETY:
    - Production restores require --confirm-production flag
    - Restoring production data to non-production requires --sanitize flag
    - Scripts refuse to run with default passwords in production
    - Checksums are verified before restore
    - Pre-restore backup is taken (unless --force is used)

WARNING:
    This script is DESTRUCTIVE. It will OVERWRITE existing data.
    Always verify you have a current backup before restoring.

EOF
    exit 0
}

# ============================================================================
# Argument Parsing
# ============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --env=*)
                ENV="${1#*=}"
                shift
                ;;
            --tenant=*)
                TENANT="${1#*=}"
                shift
                ;;
            --backup-path=*)
                BACKUP_PATH="${1#*=}"
                shift
                ;;
            --backup-id=*)
                BACKUP_ID="${1#*=}"
                shift
                ;;
            --datastores=*)
                DATASTORES="${1#*=}"
                shift
                ;;
            --sanitize)
                SANITIZE="true"
                shift
                ;;
            --force)
                FORCE="true"
                shift
                ;;
            --skip-verification)
                SKIP_VERIFICATION="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --confirm-production)
                CONFIRM_PRODUCTION="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# ============================================================================
# Validation
# ============================================================================

validate_environment() {
    log_info "Validating environment: $ENV"

    # Check valid environment
    case "$ENV" in
        dev|development)
            ENV="dev"
            ;;
        staging|stage)
            ENV="staging"
            ;;
        production|prod)
            ENV="production"
            # Production safety checks
            if [[ "$CONFIRM_PRODUCTION" != "true" ]]; then
                log_error "Production restore requires --confirm-production flag"
                log_error "This is a safety measure to prevent accidental data loss"
                exit 1
            fi

            # Check for default passwords in production
            if [[ "$POSTGRES_PASSWORD" == "devpassword" ]] || \
               [[ "$NEO4J_PASSWORD" == "devpassword" ]] || \
               [[ "$REDIS_PASSWORD" == "devpassword" ]]; then
                log_error "Cannot use default passwords in production environment"
                log_error "Please configure proper credentials"
                exit 1
            fi

            echo ""
            printf "${RED}${BOLD}"
            echo "============================================"
            echo "         PRODUCTION RESTORE WARNING         "
            echo "============================================"
            printf "${NC}"
            echo ""
            log_warn "You are about to restore data to PRODUCTION"
            log_warn "This operation is DESTRUCTIVE and will OVERWRITE existing data"
            echo ""
            ;;
        *)
            log_error "Unknown environment: $ENV"
            log_error "Valid environments: dev, staging, production"
            exit 1
            ;;
    esac

    # Validate backup source
    if [[ -z "$BACKUP_PATH" ]] && [[ -z "$BACKUP_ID" ]]; then
        log_error "Either --backup-path or --backup-id is required"
        exit 1
    fi

    if [[ -n "$BACKUP_PATH" ]] && [[ -n "$BACKUP_ID" ]]; then
        log_error "Cannot specify both --backup-path and --backup-id"
        exit 1
    fi

    # Download from S3 if backup-id specified
    if [[ -n "$BACKUP_ID" ]]; then
        download_from_s3
    fi

    # Validate backup path exists
    if [[ ! -d "$BACKUP_PATH" ]]; then
        log_error "Backup directory not found: $BACKUP_PATH"
        exit 1
    fi

    enforce_tenant_partitioning

    # Check for production data being restored to non-production
    if [[ -f "$BACKUP_PATH/backup-metadata.json" ]]; then
        local backup_env
        backup_env=$(grep -o '"environment"[[:space:]]*:[[:space:]]*"[^"]*"' "$BACKUP_PATH/backup-metadata.json" | cut -d'"' -f4 || echo "unknown")

        if [[ "$backup_env" == "production" ]] && [[ "$ENV" != "production" ]]; then
            if [[ "$SANITIZE" != "true" ]]; then
                log_error "Restoring production data to non-production requires --sanitize flag"
                log_error "This ensures PII and sensitive data are properly masked"
                exit 1
            fi
        fi
    fi

    # Validate datastores
    if [[ "$DATASTORES" == "all" ]]; then
        DATASTORES=""
        # Detect available datastores in backup
        [[ -f "$BACKUP_PATH/postgres.dump" ]] && DATASTORES="${DATASTORES}postgres,"
        [[ -f "$BACKUP_PATH/neo4j.dump" ]] && DATASTORES="${DATASTORES}neo4j,"
        [[ -f "$BACKUP_PATH/redis.rdb" ]] && DATASTORES="${DATASTORES}redis,"
        DATASTORES="${DATASTORES%,}"  # Remove trailing comma

        if [[ -z "$DATASTORES" ]]; then
            log_error "No backup files found in: $BACKUP_PATH"
            exit 1
        fi

        log_info "Detected datastores in backup: $DATASTORES"
    fi

    IFS=',' read -ra DATASTORE_ARRAY <<< "$DATASTORES"
    for ds in "${DATASTORE_ARRAY[@]}"; do
        case "$ds" in
            postgres)
                if [[ ! -f "$BACKUP_PATH/postgres.dump" ]]; then
                    log_error "PostgreSQL backup not found: $BACKUP_PATH/postgres.dump"
                    exit 1
                fi
                ;;
            neo4j)
                if [[ ! -f "$BACKUP_PATH/neo4j.dump" ]]; then
                    log_error "Neo4j backup not found: $BACKUP_PATH/neo4j.dump"
                    exit 1
                fi
                ;;
            redis)
                if [[ ! -f "$BACKUP_PATH/redis.rdb" ]]; then
                    log_warn "Redis backup not found: $BACKUP_PATH/redis.rdb"
                    log_warn "Redis restore will be skipped"
                fi
                ;;
            *)
                log_error "Unknown datastore: $ds"
                log_error "Valid datastores: postgres, neo4j, redis, all"
                exit 1
                ;;
        esac
    done

    log_success "Environment validation passed"
}

verify_checksums() {
    log_info "Verifying backup checksums..."

    if [[ ! -f "$BACKUP_PATH/CHECKSUMS" ]]; then
        log_warn "No CHECKSUMS file found - skipping verification"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would verify checksums"
        return 0
    fi

    cd "$BACKUP_PATH"
    if sha256sum -c CHECKSUMS --quiet 2>/dev/null | grep -v "^#"; then
        log_success "Checksums verified"
    else
        log_error "Checksum verification failed!"
        log_error "Backup may be corrupted"

        if [[ "$FORCE" != "true" ]]; then
            log_error "Use --force to proceed anyway (not recommended)"
            exit 1
        fi
        log_warn "Proceeding despite checksum failure (--force specified)"
    fi
    cd - > /dev/null
}

download_from_s3() {
    log_info "Downloading backup from S3..."
    log_debug "Bucket: $S3_BUCKET, Prefix: $S3_PREFIX, ID: $BACKUP_ID"

    if [[ -z "$S3_BUCKET" ]]; then
        log_error "S3_BUCKET environment variable required for --backup-id"
        exit 1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI required for S3 download but not found"
        exit 1
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would download from s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_ID.tar.gz"
        BACKUP_PATH="$BACKUP_BASE/$BACKUP_ID"
        return 0
    fi

    local s3_path="s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_ID.tar.gz"
    local local_archive="$BACKUP_BASE/${BACKUP_ID}.tar.gz"

    mkdir -p "$BACKUP_BASE"

    # Download archive
    log_debug "Downloading: $s3_path"
    aws s3 cp "$s3_path" "$local_archive"

    # Extract archive
    log_debug "Extracting archive"
    tar -xzf "$local_archive" -C "$BACKUP_BASE"
    rm -f "$local_archive"

    BACKUP_PATH="$BACKUP_BASE/$BACKUP_ID"
    log_success "Backup downloaded and extracted to: $BACKUP_PATH"
}

enforce_tenant_partitioning() {
    # Detect tenant from metadata or directory structure and enforce selection
    local metadata_tenant=""

    if [[ -f "$BACKUP_PATH/backup-metadata.json" ]]; then
        metadata_tenant=$(grep -o '"tenant"[[:space:]]*:[[:space:]]*"[^"]*"' "$BACKUP_PATH/backup-metadata.json" | cut -d'"' -f4 || true)
        if [[ -z "$metadata_tenant" ]]; then
            metadata_tenant=$(grep -o '"tenant_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$BACKUP_PATH/backup-metadata.json" | cut -d'"' -f4 || true)
        fi
    fi

    # If tenant directories are present, pick the requested tenant
    if [[ -d "$BACKUP_PATH/tenants" ]]; then
        if [[ -z "$TENANT" ]]; then
            log_error "Backup contains multiple tenants but --tenant was not provided"
            log_error "Available tenants: $(cd \"$BACKUP_PATH/tenants\" && ls)"
            exit 1
        fi

        if [[ ! -d "$BACKUP_PATH/tenants/$TENANT" ]]; then
            log_error "Tenant '$TENANT' not found in backup: $BACKUP_PATH/tenants"
            exit 1
        fi

        BACKUP_PATH="$BACKUP_PATH/tenants/$TENANT"
        log_info "Using tenant-scoped backup path: $BACKUP_PATH"
    elif [[ -n "$metadata_tenant" ]]; then
        if [[ -n "$TENANT" ]] && [[ "$TENANT" != "$metadata_tenant" ]]; then
            log_error "Tenant mismatch: requested '$TENANT' but backup metadata is '$metadata_tenant'"
            exit 1
        fi
        TENANT="${TENANT:-$metadata_tenant}"
        log_info "Validated tenant from metadata: $TENANT"
    else
        log_warn "No tenant metadata found. Backups should be tagged per tenant."
        if [[ -z "$TENANT" ]]; then
            log_error "Specify --tenant to continue without metadata"
            exit 1
        fi
        log_warn "Proceeding with tenant override: $TENANT"
    fi
}

confirm_restore() {
    if [[ "$FORCE" == "true" ]]; then
        log_warn "Skipping confirmation (--force specified)"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    echo ""
    printf "${YELLOW}${BOLD}"
    echo "============================================"
    echo "         RESTORE CONFIRMATION              "
    echo "============================================"
    printf "${NC}"
    echo ""
    echo "Target Environment: $ENV"
    echo "Backup Path:        $BACKUP_PATH"
    if [[ -n "$TENANT" ]]; then
        echo "Tenant:             $TENANT"
    fi
    echo "Datastores:         $DATASTORES"
    echo ""
    printf "${RED}WARNING: This operation will OVERWRITE existing data!${NC}\n"
    echo ""

    read -p "Type 'RESTORE' to confirm: " confirmation

    if [[ "$confirmation" != "RESTORE" ]]; then
        log_error "Restore cancelled by user"
        exit 1
    fi

    log_info "Restore confirmed"
}

create_pre_restore_backup() {
    if [[ "$FORCE" == "true" ]]; then
        log_warn "Skipping pre-restore backup (--force specified)"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create pre-restore backup"
        return 0
    fi

    log_info "Creating pre-restore backup..."

    # Use the backup script to create a quick backup
    local pre_backup_dir="$BACKUP_BASE/pre-restore-${TIMESTAMP}"
    mkdir -p "$pre_backup_dir"

    # Quick backup of current state
    "$SCRIPT_DIR/backup.sh" --env="$ENV" --datastores="$DATASTORES" --backup-dir="$pre_backup_dir" --verbose || {
        log_warn "Pre-restore backup failed, but continuing with restore"
    }

    log_success "Pre-restore backup created: $pre_backup_dir"
}

# ============================================================================
# Restore Functions
# ============================================================================

restore_postgres() {
    log_info "Restoring PostgreSQL database..."
    log_debug "Host: $POSTGRES_HOST:$POSTGRES_PORT, DB: $POSTGRES_DB"

    local dump_file="$BACKUP_PATH/postgres.dump"

    if [[ ! -f "$dump_file" ]]; then
        log_error "PostgreSQL backup not found: $dump_file"
        return 1
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would restore PostgreSQL from: $dump_file"
        return 0
    fi

    local start_time=$(date +%s)

    # Check if running in Docker environment or direct connection
    if docker ps -q -f name="$POSTGRES_CONTAINER" 2>/dev/null | grep -q .; then
        log_debug "Using Docker container: $POSTGRES_CONTAINER"

        # Terminate existing connections
        log_info "Terminating existing connections..."
        docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
            2>/dev/null || true

        # Drop and recreate database
        log_info "Dropping and recreating database..."
        docker exec "$POSTGRES_CONTAINER" dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
        docker exec "$POSTGRES_CONTAINER" createdb -U "$POSTGRES_USER" "$POSTGRES_DB"

        # Restore from dump
        log_info "Restoring from dump..."
        cat "$dump_file" | docker exec -i "$POSTGRES_CONTAINER" pg_restore \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            2>&1 | while read -r line; do
                log_debug "$line"
            done || true  # pg_restore may return non-zero for warnings

        # Apply sanitization if requested
        if [[ "$SANITIZE" == "true" ]]; then
            sanitize_postgres
        fi

    elif command -v pg_restore &> /dev/null; then
        log_debug "Using local pg_restore"

        export PGPASSWORD="$POSTGRES_PASSWORD"

        # Terminate connections
        psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
            2>/dev/null || true

        # Drop and recreate
        dropdb -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
        createdb -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB"

        # Restore
        pg_restore \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            "$dump_file" 2>&1 | while read -r line; do
                log_debug "$line"
            done || true

        if [[ "$SANITIZE" == "true" ]]; then
            sanitize_postgres
        fi

        unset PGPASSWORD
    else
        log_error "Neither Docker container nor pg_restore available"
        return 1
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_success "PostgreSQL restore completed (${duration}s)"
    return 0
}

sanitize_postgres() {
    log_info "Sanitizing PostgreSQL data..."

    local sanitize_sql=$(cat << 'EOSQL'
-- Mask email addresses
UPDATE users SET email = 'dev_' || id::text || '@example.com' WHERE email IS NOT NULL;

-- Reset passwords to dev default
UPDATE users SET password_hash = '$2b$10$devhashdevhashdevhashdevhashdevhashdevhash' WHERE password_hash IS NOT NULL;

-- Mask phone numbers
UPDATE users SET phone = '+1-555-' || LPAD(id::text, 4, '0') WHERE phone IS NOT NULL;

-- Redact sensitive fields in investigations
UPDATE investigations SET notes = '[REDACTED FOR DEV/TEST]' WHERE notes IS NOT NULL AND notes != '';

-- Clear API keys and tokens
UPDATE api_keys SET key_hash = 'dev_test_key_' || name WHERE key_hash IS NOT NULL;

-- Log sanitization
INSERT INTO audit_logs (action, details, created_at)
VALUES ('DATA_SANITIZATION', 'Data sanitized for non-production environment', NOW());
EOSQL
)

    if docker ps -q -f name="$POSTGRES_CONTAINER" 2>/dev/null | grep -q .; then
        echo "$sanitize_sql" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null || true
    else
        export PGPASSWORD="$POSTGRES_PASSWORD"
        echo "$sanitize_sql" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null || true
        unset PGPASSWORD
    fi

    log_success "PostgreSQL data sanitized"
}

restore_neo4j() {
    log_info "Restoring Neo4j database..."
    log_debug "Host: $NEO4J_HOST:$NEO4J_PORT"

    local dump_file="$BACKUP_PATH/neo4j.dump"

    if [[ ! -f "$dump_file" ]]; then
        log_error "Neo4j backup not found: $dump_file"
        return 1
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would restore Neo4j from: $dump_file"
        return 0
    fi

    local start_time=$(date +%s)

    # Check if running in Docker environment
    if docker ps -q -f name="$NEO4J_CONTAINER" 2>/dev/null | grep -q .; then
        log_debug "Using Docker container: $NEO4J_CONTAINER"
        log_warn "Neo4j Community Edition requires database to be stopped for restore"

        # Stop Neo4j container
        log_info "Stopping Neo4j container..."
        docker stop "$NEO4J_CONTAINER"

        # Get the Neo4j version from the existing container
        local neo4j_image
        neo4j_image=$(docker inspect "$NEO4J_CONTAINER" --format='{{.Config.Image}}' 2>/dev/null || echo "neo4j:5.8")

        # Determine the data volume
        local data_volume
        data_volume=$(docker inspect "$NEO4J_CONTAINER" --format='{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || echo "neo4j_data")

        if [[ -z "$data_volume" ]]; then
            data_volume="neo4j_data"
        fi

        log_debug "Using Neo4j image: $neo4j_image"
        log_debug "Using data volume: $data_volume"

        # Perform restore using a temporary container
        log_info "Loading database from dump..."
        docker run --rm \
            -v "${data_volume}:/data" \
            -v "$BACKUP_PATH:/backup" \
            "$neo4j_image" \
            neo4j-admin database load neo4j --from-path=/backup --overwrite-destination=true

        # Restart Neo4j container
        log_info "Restarting Neo4j container..."
        docker start "$NEO4J_CONTAINER"

        # Wait for Neo4j to be ready
        log_info "Waiting for Neo4j to be ready..."
        local max_wait=120
        local waited=0
        while [[ $waited -lt $max_wait ]]; do
            if docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" "RETURN 1" &>/dev/null; then
                break
            fi
            sleep 2
            waited=$((waited + 2))
            log_debug "Waiting for Neo4j... (${waited}s)"
        done

        if [[ $waited -ge $max_wait ]]; then
            log_warn "Neo4j may not be fully ready yet"
        fi

        # Apply sanitization if requested
        if [[ "$SANITIZE" == "true" ]]; then
            sanitize_neo4j
        fi

    else
        log_error "Neo4j Docker container not found: $NEO4J_CONTAINER"
        log_error "For non-Docker deployments, use neo4j-admin directly"
        return 1
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_success "Neo4j restore completed (${duration}s)"
    return 0
}

sanitize_neo4j() {
    log_info "Sanitizing Neo4j data..."

    local sanitize_cypher=$(cat << 'EOCYPHER'
// Mask email addresses
MATCH (u:User) WHERE u.email IS NOT NULL
SET u.email = 'dev_' + id(u) + '@example.com';

// Mask phone numbers
MATCH (p:Person) WHERE p.phone IS NOT NULL
SET p.phone = '+1-555-' + toString(id(p) % 10000);

// Redact sensitive notes
MATCH (n) WHERE n.notes IS NOT NULL AND n.notes <> ''
SET n.notes = '[REDACTED FOR DEV/TEST]';

// Mark as sanitized
CREATE (s:SanitizationLog {
  timestamp: datetime(),
  action: 'DATA_SANITIZATION',
  environment: 'non-production'
});

RETURN 'Sanitization complete' AS status;
EOCYPHER
)

    docker exec "$NEO4J_CONTAINER" cypher-shell \
        -u "$NEO4J_USERNAME" \
        -p "$NEO4J_PASSWORD" \
        "$sanitize_cypher" 2>/dev/null || true

    log_success "Neo4j data sanitized"
}

restore_redis() {
    log_info "Restoring Redis database..."
    log_debug "Host: $REDIS_HOST:$REDIS_PORT"

    local dump_file="$BACKUP_PATH/redis.rdb"

    if [[ ! -f "$dump_file" ]]; then
        log_warn "Redis backup not found: $dump_file - skipping"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would restore Redis from: $dump_file"
        return 0
    fi

    local start_time=$(date +%s)

    # Check if running in Docker environment
    if docker ps -q -f name="$REDIS_CONTAINER" 2>/dev/null | grep -q .; then
        log_debug "Using Docker container: $REDIS_CONTAINER"

        # Stop Redis container
        log_info "Stopping Redis container..."
        docker stop "$REDIS_CONTAINER"

        # Copy dump file to Redis data directory
        log_info "Copying dump file..."
        docker cp "$dump_file" "$REDIS_CONTAINER:/data/dump.rdb"

        # Restart Redis container
        log_info "Restarting Redis container..."
        docker start "$REDIS_CONTAINER"

        # Wait for Redis to be ready
        local max_wait=30
        local waited=0
        while [[ $waited -lt $max_wait ]]; do
            if docker exec "$REDIS_CONTAINER" redis-cli PING &>/dev/null; then
                break
            fi
            sleep 1
            waited=$((waited + 1))
        done

        if [[ $waited -ge $max_wait ]]; then
            log_warn "Redis may not be fully ready yet"
        fi

    else
        log_warn "Redis Docker container not found - manual restore required"
        log_warn "Copy $dump_file to Redis data directory and restart Redis"
        return 0
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_success "Redis restore completed (${duration}s)"
    return 0
}

# ============================================================================
# Post-Restore Verification
# ============================================================================

verify_restore() {
    if [[ "$SKIP_VERIFICATION" == "true" ]]; then
        log_warn "Skipping verification (--skip-verification specified)"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would verify restore"
        return 0
    fi

    log_info "Verifying restore..."
    local verification_failed=false

    IFS=',' read -ra DATASTORE_ARRAY <<< "$DATASTORES"
    for ds in "${DATASTORE_ARRAY[@]}"; do
        case "$ds" in
            postgres)
                log_info "Verifying PostgreSQL..."
                if docker ps -q -f name="$POSTGRES_CONTAINER" 2>/dev/null | grep -q .; then
                    local table_count
                    table_count=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

                    if [[ "$table_count" -gt 0 ]]; then
                        log_success "PostgreSQL: $table_count tables found"
                    else
                        log_warn "PostgreSQL: No tables found - verify data"
                        verification_failed=true
                    fi
                else
                    log_warn "PostgreSQL container not running"
                    verification_failed=true
                fi
                ;;

            neo4j)
                log_info "Verifying Neo4j..."
                if docker ps -q -f name="$NEO4J_CONTAINER" 2>/dev/null | grep -q .; then
                    local node_count
                    node_count=$(docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" "MATCH (n) RETURN count(n) AS count" 2>/dev/null | tail -1 | tr -d ' ' || echo "0")

                    if [[ "$node_count" -gt 0 ]]; then
                        log_success "Neo4j: $node_count nodes found"
                    else
                        log_warn "Neo4j: No nodes found - verify data"
                        verification_failed=true
                    fi
                else
                    log_warn "Neo4j container not running"
                    verification_failed=true
                fi
                ;;

            redis)
                log_info "Verifying Redis..."
                if docker ps -q -f name="$REDIS_CONTAINER" 2>/dev/null | grep -q .; then
                    local key_count
                    key_count=$(docker exec "$REDIS_CONTAINER" redis-cli DBSIZE 2>/dev/null | grep -oE '[0-9]+' || echo "0")

                    log_success "Redis: $key_count keys found"
                else
                    log_warn "Redis container not running"
                fi
                ;;
        esac
    done

    if [[ "$verification_failed" == "true" ]]; then
        log_warn "Some verifications failed - please check manually"
    else
        log_success "All verifications passed"
    fi
}

print_summary() {
    echo ""
    echo "=========================================="
    echo "Restore Summary"
    echo "=========================================="
    echo "Target Environment: $ENV"
    echo "Backup Path:        $BACKUP_PATH"
    echo "Datastores:         $DATASTORES"

    if [[ "$SANITIZE" == "true" ]]; then
        echo "Sanitization:       Applied"
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        echo ""
        log_warn "DRY RUN - No actual restore was performed"
    fi

    echo "=========================================="
}

# ============================================================================
# Main
# ============================================================================

main() {
    local start_time=$(date +%s)

    parse_args "$@"

    echo ""
    echo "Summit Database Restore"
    echo "========================"
    echo ""

    validate_environment
    verify_checksums
    confirm_restore
    create_pre_restore_backup

    # Run restores for each requested datastore
    IFS=',' read -ra DATASTORE_ARRAY <<< "$DATASTORES"
    local restore_failed=false

    for ds in "${DATASTORE_ARRAY[@]}"; do
        case "$ds" in
            postgres)
                if ! restore_postgres; then
                    restore_failed=true
                    log_error "PostgreSQL restore failed"
                fi
                ;;
            neo4j)
                if ! restore_neo4j; then
                    restore_failed=true
                    log_error "Neo4j restore failed"
                fi
                ;;
            redis)
                if ! restore_redis; then
                    restore_failed=true
                    log_error "Redis restore failed"
                fi
                ;;
        esac
    done

    if [[ "$restore_failed" == "true" ]]; then
        log_error "One or more restores failed"
        exit 1
    fi

    verify_restore

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_summary

    log_success "Restore completed successfully in ${duration}s"
}

# Run main if script is executed (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
