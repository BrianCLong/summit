#!/usr/bin/env bash
#
# Summit Database Backup Script
#
# A unified, environment-aware backup script for Summit/IntelGraph datastores.
# Supports PostgreSQL, Neo4j, and Redis with safety guardrails.
#
# Usage:
#   ./scripts/db/backup.sh --env=dev --datastores=all
#   ./scripts/db/backup.sh --env=staging --datastores=postgres,neo4j --upload-s3
#   ./scripts/db/backup.sh --env=dev --datastores=postgres --dry-run
#
# For full help:
#   ./scripts/db/backup.sh --help
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
BACKUP_BASE="${BACKUP_BASE:-$PROJECT_ROOT/backups}"
DRY_RUN="${DRY_RUN:-false}"
UPLOAD_S3="${UPLOAD_S3:-false}"
CONFIRM_PRODUCTION="${CONFIRM_PRODUCTION:-false}"
VERBOSE="${VERBOSE:-false}"

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
Summit Database Backup Script
==============================

Unified backup script for Summit/IntelGraph datastores with environment-aware
safety guardrails.

USAGE:
    ./scripts/db/backup.sh [OPTIONS]

OPTIONS:
    --env=ENV           Target environment: dev, staging, production
                        Default: dev

    --datastores=LIST   Comma-separated list of datastores to backup:
                        postgres, neo4j, redis, all
                        Default: all

    --backup-dir=PATH   Custom backup directory
                        Default: ./backups

    --upload-s3         Upload backup to S3 after completion
                        Requires S3_BUCKET environment variable

    --dry-run           Show what would be done without executing

    --confirm-production
                        Required flag to backup production environment

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

    # S3 Upload
    S3_BUCKET           S3 bucket name for uploads
    S3_PREFIX           S3 prefix path (default: summit-backups)

EXAMPLES:
    # Full backup in development
    ./scripts/db/backup.sh --env=dev --datastores=all

    # PostgreSQL only with S3 upload
    ./scripts/db/backup.sh --env=staging --datastores=postgres --upload-s3

    # Dry run to see what would happen
    ./scripts/db/backup.sh --env=dev --datastores=all --dry-run

    # Production backup (requires explicit confirmation)
    ./scripts/db/backup.sh --env=production --datastores=all --confirm-production

SAFETY:
    - Production backups require --confirm-production flag
    - Scripts refuse to run with default passwords in production
    - Checksums are generated for all backup files
    - Backup metadata includes environment, timestamp, and host info

OUTPUT:
    Backups are stored in:
    ./backups/summit-backup-<env>-<timestamp>/
        ├── backup-metadata.json
        ├── postgres.dump          (if PostgreSQL backed up)
        ├── neo4j.dump             (if Neo4j backed up)
        ├── redis.rdb              (if Redis backed up)
        └── CHECKSUMS

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
            --datastores=*)
                DATASTORES="${1#*=}"
                shift
                ;;
            --backup-dir=*)
                BACKUP_BASE="${1#*=}"
                shift
                ;;
            --upload-s3)
                UPLOAD_S3="true"
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
                log_error "Production backup requires --confirm-production flag"
                log_error "This is a safety measure to prevent accidental operations"
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

            log_warn "PRODUCTION BACKUP - Please confirm this is intentional"
            ;;
        *)
            log_error "Unknown environment: $ENV"
            log_error "Valid environments: dev, staging, production"
            exit 1
            ;;
    esac

    # Validate datastores
    if [[ "$DATASTORES" == "all" ]]; then
        DATASTORES="postgres,neo4j,redis"
    fi

    IFS=',' read -ra DATASTORE_ARRAY <<< "$DATASTORES"
    for ds in "${DATASTORE_ARRAY[@]}"; do
        case "$ds" in
            postgres|neo4j|redis)
                ;;
            *)
                log_error "Unknown datastore: $ds"
                log_error "Valid datastores: postgres, neo4j, redis, all"
                exit 1
                ;;
        esac
    done

    # Validate S3 settings if upload requested
    if [[ "$UPLOAD_S3" == "true" ]]; then
        if [[ -z "$S3_BUCKET" ]]; then
            log_error "S3_BUCKET environment variable required for --upload-s3"
            exit 1
        fi
        if ! command -v aws &> /dev/null; then
            log_error "AWS CLI required for S3 upload but not found"
            exit 1
        fi
    fi

    log_success "Environment validation passed"
}

# ============================================================================
# Backup Functions
# ============================================================================

init_backup() {
    BACKUP_ID="summit-backup-${ENV}-${TIMESTAMP}"
    BACKUP_DIR="$BACKUP_BASE/$BACKUP_ID"

    log_info "Initializing backup: $BACKUP_ID"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "DRY RUN MODE - No actual backups will be performed"
        return 0
    fi

    mkdir -p "$BACKUP_DIR"

    # Write metadata
    cat > "$BACKUP_DIR/backup-metadata.json" << EOF
{
    "backup_id": "$BACKUP_ID",
    "environment": "$ENV",
    "timestamp": "$(date -u -Iseconds)",
    "hostname": "$(hostname)",
    "user": "${USER:-unknown}",
    "datastores": "$DATASTORES",
    "dry_run": $DRY_RUN,
    "script_version": "1.0.0",
    "components": {}
}
EOF

    log_success "Backup directory created: $BACKUP_DIR"
}

backup_postgres() {
    log_info "Backing up PostgreSQL database..."
    log_debug "Host: $POSTGRES_HOST:$POSTGRES_PORT, DB: $POSTGRES_DB"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would backup PostgreSQL: $POSTGRES_DB"
        return 0
    fi

    local start_time=$(date +%s)
    local dump_file="$BACKUP_DIR/postgres.dump"

    # Check if running in Docker environment or direct connection
    if docker ps -q -f name="$POSTGRES_CONTAINER" 2>/dev/null | grep -q .; then
        log_debug "Using Docker container: $POSTGRES_CONTAINER"

        # Backup via Docker
        docker exec "$POSTGRES_CONTAINER" pg_dump \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            -Fc \
            --verbose \
            -f /tmp/postgres-backup.dump 2>&1 | while read -r line; do
                log_debug "$line"
            done

        docker cp "$POSTGRES_CONTAINER:/tmp/postgres-backup.dump" "$dump_file"
        docker exec "$POSTGRES_CONTAINER" rm -f /tmp/postgres-backup.dump
    elif command -v pg_dump &> /dev/null; then
        log_debug "Using local pg_dump"

        export PGPASSWORD="$POSTGRES_PASSWORD"
        pg_dump \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            -Fc \
            --verbose \
            -f "$dump_file" 2>&1 | while read -r line; do
                log_debug "$line"
            done
        unset PGPASSWORD
    else
        log_error "Neither Docker container nor pg_dump available"
        return 1
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(du -h "$dump_file" 2>/dev/null | cut -f1 || echo "unknown")

    log_success "PostgreSQL backup completed (${duration}s, ${size})"
    return 0
}

backup_neo4j() {
    log_info "Backing up Neo4j database..."
    log_debug "Host: $NEO4J_HOST:$NEO4J_PORT"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would backup Neo4j database"
        return 0
    fi

    local start_time=$(date +%s)
    local dump_file="$BACKUP_DIR/neo4j.dump"

    # Check if running in Docker environment
    if docker ps -q -f name="$NEO4J_CONTAINER" 2>/dev/null | grep -q .; then
        log_debug "Using Docker container: $NEO4J_CONTAINER"
        log_warn "Neo4j Community Edition requires database to be stopped for backup"

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

        # Perform backup using a temporary container
        docker run --rm \
            -v "${data_volume}:/data" \
            -v "$BACKUP_DIR:/backup" \
            "$neo4j_image" \
            neo4j-admin database dump neo4j --to-path=/backup

        # Restart Neo4j container
        log_info "Restarting Neo4j container..."
        docker start "$NEO4J_CONTAINER"

        # Wait for Neo4j to be ready
        log_info "Waiting for Neo4j to be ready..."
        local max_wait=60
        local waited=0
        while [[ $waited -lt $max_wait ]]; do
            if docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" "RETURN 1" &>/dev/null; then
                break
            fi
            sleep 2
            waited=$((waited + 2))
        done

        if [[ $waited -ge $max_wait ]]; then
            log_warn "Neo4j may not be fully ready yet, but backup completed"
        fi
    else
        log_error "Neo4j Docker container not found: $NEO4J_CONTAINER"
        log_error "For non-Docker deployments, use neo4j-admin directly"
        return 1
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(du -h "$dump_file" 2>/dev/null | cut -f1 || echo "unknown")

    log_success "Neo4j backup completed (${duration}s, ${size})"
    return 0
}

backup_redis() {
    log_info "Backing up Redis database..."
    log_debug "Host: $REDIS_HOST:$REDIS_PORT"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would backup Redis database"
        return 0
    fi

    local start_time=$(date +%s)
    local dump_file="$BACKUP_DIR/redis.rdb"

    # Check if running in Docker environment
    if docker ps -q -f name="$REDIS_CONTAINER" 2>/dev/null | grep -q .; then
        log_debug "Using Docker container: $REDIS_CONTAINER"

        # Trigger background save
        docker exec "$REDIS_CONTAINER" redis-cli BGSAVE

        # Wait for save to complete
        log_info "Waiting for Redis BGSAVE to complete..."
        local max_wait=30
        local waited=0
        while [[ $waited -lt $max_wait ]]; do
            local lastsave_before=$waited
            local lastsave_after
            lastsave_after=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE 2>/dev/null || echo "0")

            # Check if save is in progress
            local bgsave_status
            bgsave_status=$(docker exec "$REDIS_CONTAINER" redis-cli INFO persistence 2>/dev/null | grep rdb_bgsave_in_progress | cut -d: -f2 | tr -d '\r' || echo "0")

            if [[ "$bgsave_status" == "0" ]]; then
                break
            fi

            sleep 1
            waited=$((waited + 1))
        done

        # Copy the dump file
        docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$dump_file" 2>/dev/null || \
            log_warn "Could not copy dump.rdb - Redis may not have persisted data yet"

        # Get Redis info
        docker exec "$REDIS_CONTAINER" redis-cli INFO > "$BACKUP_DIR/redis-info.txt" 2>/dev/null || true
    elif command -v redis-cli &> /dev/null; then
        log_debug "Using local redis-cli"

        local redis_auth=""
        if [[ -n "$REDIS_PASSWORD" ]]; then
            redis_auth="-a $REDIS_PASSWORD"
        fi

        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth BGSAVE

        # Wait for save
        sleep 3

        # This requires access to the Redis data directory
        log_warn "Local Redis backup requires manual copy of dump.rdb"
    else
        log_error "Neither Docker container nor redis-cli available"
        return 1
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [[ -f "$dump_file" ]]; then
        local size=$(du -h "$dump_file" 2>/dev/null | cut -f1 || echo "unknown")
        log_success "Redis backup completed (${duration}s, ${size})"
    else
        log_warn "Redis backup completed but no dump file created (Redis may be empty)"
    fi

    return 0
}

generate_checksums() {
    log_info "Generating checksums..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would generate checksums"
        return 0
    fi

    local checksums_file="$BACKUP_DIR/CHECKSUMS"

    # Generate SHA256 checksums for all files
    find "$BACKUP_DIR" -type f ! -name "CHECKSUMS" -exec sha256sum {} \; | \
        sed "s|$BACKUP_DIR/||" > "$checksums_file"

    # Add summary
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "unknown")
    local file_count=$(find "$BACKUP_DIR" -type f | wc -l)

    {
        echo ""
        echo "# Backup Summary"
        echo "# Backup ID: $BACKUP_ID"
        echo "# Environment: $ENV"
        echo "# Total Size: $total_size"
        echo "# File Count: $file_count"
        echo "# Generated: $(date -u -Iseconds)"
    } >> "$checksums_file"

    log_success "Checksums generated"
}

upload_to_s3() {
    if [[ "$UPLOAD_S3" != "true" ]]; then
        return 0
    fi

    log_info "Uploading backup to S3..."
    log_debug "Bucket: $S3_BUCKET, Prefix: $S3_PREFIX"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would upload to s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_ID"
        return 0
    fi

    # Create tarball
    local archive_file="$BACKUP_BASE/${BACKUP_ID}.tar.gz"
    log_debug "Creating archive: $archive_file"

    tar -czf "$archive_file" -C "$BACKUP_BASE" "$BACKUP_ID"

    # Upload to S3
    local s3_path="s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_ID.tar.gz"
    log_debug "Uploading to: $s3_path"

    aws s3 cp "$archive_file" "$s3_path" \
        --storage-class STANDARD_IA

    # Upload checksums separately
    aws s3 cp "$BACKUP_DIR/CHECKSUMS" \
        "s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_ID.checksums"

    # Clean up local archive
    rm -f "$archive_file"

    log_success "Backup uploaded to S3: $s3_path"
}

print_summary() {
    echo ""
    echo "=========================================="
    echo "Backup Summary"
    echo "=========================================="
    echo "Backup ID:   $BACKUP_ID"
    echo "Environment: $ENV"
    echo "Datastores:  $DATASTORES"

    if [[ "$DRY_RUN" != "true" ]]; then
        echo "Location:    $BACKUP_DIR"

        if [[ -d "$BACKUP_DIR" ]]; then
            local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "unknown")
            echo "Total Size:  $total_size"
        fi

        if [[ "$UPLOAD_S3" == "true" ]]; then
            echo "S3 Location: s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_ID.tar.gz"
        fi
    else
        echo ""
        log_warn "DRY RUN - No actual backup was performed"
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
    echo "Summit Database Backup"
    echo "======================"
    echo ""

    validate_environment
    init_backup

    # Run backups for each requested datastore
    IFS=',' read -ra DATASTORE_ARRAY <<< "$DATASTORES"
    local backup_failed=false

    for ds in "${DATASTORE_ARRAY[@]}"; do
        case "$ds" in
            postgres)
                if ! backup_postgres; then
                    backup_failed=true
                    log_error "PostgreSQL backup failed"
                fi
                ;;
            neo4j)
                if ! backup_neo4j; then
                    backup_failed=true
                    log_error "Neo4j backup failed"
                fi
                ;;
            redis)
                if ! backup_redis; then
                    backup_failed=true
                    log_error "Redis backup failed"
                fi
                ;;
        esac
    done

    if [[ "$backup_failed" == "true" ]]; then
        log_error "One or more backups failed"
        exit 1
    fi

    generate_checksums
    upload_to_s3

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_summary

    log_success "Backup completed successfully in ${duration}s"
}

# Run main if script is executed (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
