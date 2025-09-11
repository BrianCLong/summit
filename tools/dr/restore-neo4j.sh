#!/bin/bash

# Maestro Conductor v24.3.0 - Neo4j Restore Script
# Epic E14: DR & Failover - Graph database restore procedures
# Target RTO: ≤ 30 minutes

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
S3_BUCKET="${S3_BUCKET:-maestro-backups-primary}"
RESTORE_DB="${RESTORE_DB:-maestro}"
TARGET_REGION="${TARGET_REGION:-us-east-1}"
SOURCE_REGION="${SOURCE_REGION:-us-east-1}"
NEO4J_HOME="${NEO4J_HOME:-/var/lib/neo4j}"

# Default values
BACKUP_TIMESTAMP=""
DRY_RUN=false
FORCE=false
VERBOSE=false
ONLINE_RESTORE=false

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Restore Neo4j graph database from S3 backups

OPTIONS:
    -t, --timestamp TIMESTAMP    Restore from specific backup timestamp (YYYYMMDD_HHMMSS)
    -r, --source-region REGION   Source region for backup (default: ${SOURCE_REGION})
    -d, --target-region REGION   Target region for restore (default: ${TARGET_REGION})
    -b, --s3-bucket BUCKET       S3 bucket containing backups (default: ${S3_BUCKET})
    -n, --db-name DATABASE       Target database name (default: ${RESTORE_DB})
    --neo4j-home PATH            Neo4j installation directory (default: ${NEO4J_HOME})
    --online                     Perform online restore (requires Neo4j Enterprise)
    --dry-run                    Show what would be done without executing
    --force                      Skip confirmation prompts
    -v, --verbose                Enable verbose output
    -h, --help                   Show this help message

EXAMPLES:
    # Restore latest backup (offline)
    $0

    # Restore from specific timestamp
    $0 --timestamp 20241201_143000

    # Online restore (Enterprise only)
    $0 --online --timestamp 20241201_143000

    # Cross-region restore
    $0 --source-region us-west-2 --target-region us-east-1

    # Dry run to see what would happen
    $0 --timestamp 20241201_143000 --dry-run
EOF
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

verbose_log() {
    if [ "${VERBOSE}" = true ]; then
        log "VERBOSE: $*"
    fi
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

confirm() {
    if [ "${FORCE}" = true ]; then
        return 0
    fi
    
    local message="$1"
    echo -n "${message} (y/N): "
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            echo "Aborted."
            exit 1
            ;;
    esac
}

check_prerequisites() {
    verbose_log "Checking prerequisites..."
    
    # Check required tools
    command -v aws >/dev/null 2>&1 || error "AWS CLI not found"
    command -v jq >/dev/null 2>&1 || error "jq not found"
    command -v tar >/dev/null 2>&1 || error "tar not found"
    
    # Check Neo4j tools
    command -v neo4j-admin >/dev/null 2>&1 || error "neo4j-admin not found"
    
    if [ "${ONLINE_RESTORE}" = true ]; then
        command -v cypher-shell >/dev/null 2>&1 || error "cypher-shell not found (required for online restore)"
    fi
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || error "AWS credentials not configured"
    
    # Check S3 bucket access
    aws s3 ls "s3://${S3_BUCKET}/" >/dev/null 2>&1 || error "Cannot access S3 bucket: ${S3_BUCKET}"
    
    # Check Neo4j home directory
    if [ ! -d "${NEO4J_HOME}" ]; then
        error "Neo4j home directory not found: ${NEO4J_HOME}"
    fi
    
    verbose_log "Prerequisites check passed"
}

get_latest_backup() {
    local region="$1"
    verbose_log "Getting latest backup timestamp for region: ${region}"
    
    local latest_file="s3://${S3_BUCKET}/neo4j/${region}/LATEST"
    
    if ! aws s3 ls "${latest_file}" >/dev/null 2>&1; then
        error "No backups found for region: ${region}"
    fi
    
    aws s3 cp "${latest_file}" - 2>/dev/null | tr -d '\n'
}

download_backup() {
    local timestamp="$1"
    local region="$2"
    local work_dir="$3"
    
    log "Downloading backup files for timestamp: ${timestamp}"
    
    local backup_file="neo4j_backup_${region}_${timestamp}.tar.gz"
    local manifest_file="neo4j_manifest_${timestamp}.json"
    
    # Download manifest first to validate
    aws s3 cp "s3://${S3_BUCKET}/neo4j/${region}/manifests/${manifest_file}" \
        "${work_dir}/${manifest_file}" || error "Failed to download manifest"
    
    # Validate manifest
    if ! jq -r '.timestamp' "${work_dir}/${manifest_file}" >/dev/null 2>&1; then
        error "Invalid manifest file"
    fi
    
    # Download backup file
    aws s3 cp "s3://${S3_BUCKET}/neo4j/${region}/backups/${backup_file}" \
        "${work_dir}/${backup_file}" || error "Failed to download backup file"
    
    log "Downloaded backup files to: ${work_dir}"
    echo "${work_dir}/${backup_file}" # Return backup file path
}

verify_backup() {
    local backup_file="$1"
    local manifest_file="$2"
    
    log "Verifying backup integrity..."
    
    # Check file sizes
    local actual_size=$(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}")
    if [ "${actual_size}" -eq 0 ]; then
        error "Backup file is empty"
    fi
    
    # Verify checksum if available in manifest
    local expected_checksum=$(jq -r '.checksums.backup_sha256 // empty' "${manifest_file}")
    if [ -n "${expected_checksum}" ]; then
        local actual_checksum=$(sha256sum "${backup_file}" | cut -d' ' -f1)
        if [ "${expected_checksum}" != "${actual_checksum}" ]; then
            error "Checksum mismatch: expected ${expected_checksum}, got ${actual_checksum}"
        fi
        verbose_log "Checksum verification passed"
    fi
    
    log "Backup integrity verified"
}

stop_neo4j() {
    log "Stopping Neo4j service..."
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would stop Neo4j service"
        return
    fi
    
    # Try systemctl first, fallback to direct command
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl stop neo4j || true
    fi
    
    # Kill any remaining Neo4j processes
    pkill -f neo4j || true
    
    # Wait for processes to stop
    sleep 5
    
    if pgrep -f neo4j >/dev/null; then
        error "Failed to stop Neo4j processes"
    fi
    
    log "Neo4j stopped successfully"
}

start_neo4j() {
    log "Starting Neo4j service..."
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would start Neo4j service"
        return
    fi
    
    # Try systemctl first, fallback to direct command
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start neo4j
    else
        "${NEO4J_HOME}/bin/neo4j" start
    fi
    
    # Wait for Neo4j to be ready
    local retries=60
    while [ ${retries} -gt 0 ]; do
        if cypher-shell -u neo4j -p password "RETURN 'ready' as status;" >/dev/null 2>&1; then
            break
        fi
        sleep 2
        retries=$((retries - 1))
    done
    
    if [ ${retries} -eq 0 ]; then
        error "Neo4j failed to start or is not responding"
    fi
    
    log "Neo4j started successfully"
}

backup_existing_data() {
    local backup_dir="$1"
    
    log "Backing up existing Neo4j data..."
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would backup existing data to ${backup_dir}"
        return
    fi
    
    local existing_backup="${backup_dir}/existing_data_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "${existing_backup}"
    
    if [ -d "${NEO4J_HOME}/data/databases" ]; then
        cp -r "${NEO4J_HOME}/data/databases" "${existing_backup}/" || true
        log "Existing data backed up to: ${existing_backup}"
    else
        verbose_log "No existing database data found"
    fi
}

restore_offline() {
    local backup_file="$1"
    local db_name="$2"
    local work_dir="$3"
    
    log "Performing offline restore of database: ${db_name}"
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would restore from ${backup_file} to ${db_name}"
        return
    fi
    
    # Extract backup
    local extract_dir="${work_dir}/extracted"
    mkdir -p "${extract_dir}"
    tar -xzf "${backup_file}" -C "${extract_dir}"
    
    # Find the actual backup directory (should contain the database backup)
    local backup_dir=$(find "${extract_dir}" -type d -name "neo4j_backup_*" | head -n1)
    if [ -z "${backup_dir}" ]; then
        error "Could not find backup directory in extracted files"
    fi
    
    # Restore using neo4j-admin
    neo4j-admin database restore \
        --from-path="${backup_dir}" \
        --database="${db_name}" \
        --overwrite-destination \
        --verbose || error "Database restore failed"
    
    log "Offline restore completed successfully"
}

restore_online() {
    local backup_file="$1"
    local db_name="$2"
    local work_dir="$3"
    
    log "Performing online restore of database: ${db_name}"
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would perform online restore from ${backup_file} to ${db_name}"
        return
    fi
    
    # Extract backup
    local extract_dir="${work_dir}/extracted"
    mkdir -p "${extract_dir}"
    tar -xzf "${backup_file}" -C "${extract_dir}"
    
    # Look for Cypher export file
    local cypher_file=$(find "${extract_dir}" -name "cypher_export.cypher" | head -n1)
    
    if [ -n "${cypher_file}" ]; then
        log "Found Cypher export, performing script-based restore..."
        
        # Create new database
        cypher-shell -u neo4j -p password \
            "CREATE DATABASE \`${db_name}\` IF NOT EXISTS;" || error "Failed to create database"
        
        # Switch to target database and import
        cypher-shell -u neo4j -p password -d "${db_name}" \
            < "${cypher_file}" || error "Failed to import Cypher script"
        
        log "Online restore via Cypher completed"
    else
        error "Online restore requires Cypher export file (not found in backup)"
    fi
}

generate_restore_report() {
    local timestamp="$1"
    local db_name="$2"
    local duration="$3"
    local manifest_file="$4"
    
    local node_count=""
    local relationship_count=""
    
    # Try to get database statistics
    if [ "${DRY_RUN}" = false ] && [ "${ONLINE_RESTORE}" = true ]; then
        node_count=$(cypher-shell -u neo4j -p password -d "${db_name}" \
            "MATCH (n) RETURN count(n) as nodes;" --format plain 2>/dev/null | tail -n1 || echo "Unknown")
        relationship_count=$(cypher-shell -u neo4j -p password -d "${db_name}" \
            "MATCH ()-[r]->() RETURN count(r) as relationships;" --format plain 2>/dev/null | tail -n1 || echo "Unknown")
    fi
    
    cat << EOF

=== MAESTRO NEO4J RESTORE REPORT ===
Restore completed at: $(date)
Source backup: ${timestamp}
Target database: ${db_name}
Source region: ${SOURCE_REGION}
Target region: ${TARGET_REGION}
Duration: ${duration} seconds
Restore method: $([ "${ONLINE_RESTORE}" = true ] && echo "Online" || echo "Offline")

Database statistics:
Nodes: ${node_count:-"Not available"}
Relationships: ${relationship_count:-"Not available"}

Source backup metadata:
$(jq -r '.metadata // {}' "${manifest_file}" 2>/dev/null || echo "Metadata not available")

Restore successful. Database is ready for use.
========================================

EOF
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--timestamp)
                BACKUP_TIMESTAMP="$2"
                shift 2
                ;;
            -r|--source-region)
                SOURCE_REGION="$2"
                shift 2
                ;;
            -d|--target-region)
                TARGET_REGION="$2"
                shift 2
                ;;
            -b|--s3-bucket)
                S3_BUCKET="$2"
                shift 2
                ;;
            -n|--db-name)
                RESTORE_DB="$2"
                shift 2
                ;;
            --neo4j-home)
                NEO4J_HOME="$2"
                shift 2
                ;;
            --online)
                ONLINE_RESTORE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Start restore process
    log "Starting Neo4j restore process..."
    log "Source region: ${SOURCE_REGION}"
    log "Target region: ${TARGET_REGION}"
    log "S3 bucket: ${S3_BUCKET}"
    log "Target database: ${RESTORE_DB}"
    log "Restore method: $([ "${ONLINE_RESTORE}" = true ] && echo "Online" || echo "Offline")"
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Determine backup timestamp
    if [ -z "${BACKUP_TIMESTAMP}" ]; then
        BACKUP_TIMESTAMP=$(get_latest_backup "${SOURCE_REGION}")
        log "Using latest backup: ${BACKUP_TIMESTAMP}"
    else
        log "Using specified backup: ${BACKUP_TIMESTAMP}"
    fi
    
    # Create temporary work directory
    WORK_DIR=$(mktemp -d -t maestro_neo4j_restore_XXXXXX)
    trap "rm -rf ${WORK_DIR}" EXIT
    
    verbose_log "Work directory: ${WORK_DIR}"
    
    # Download and verify backup
    BACKUP_FILE=$(download_backup "${BACKUP_TIMESTAMP}" "${SOURCE_REGION}" "${WORK_DIR}")
    MANIFEST_FILE="${WORK_DIR}/neo4j_manifest_${BACKUP_TIMESTAMP}.json"
    verify_backup "${BACKUP_FILE}" "${MANIFEST_FILE}"
    
    # Confirm restore operation
    if [ "${DRY_RUN}" = false ]; then
        confirm "Proceed with $([ "${ONLINE_RESTORE}" = true ] && echo "ONLINE" || echo "OFFLINE") restore to database '${RESTORE_DB}'?"
    fi
    
    # Record start time for reporting
    RESTORE_START=$(date +%s)
    
    # Backup existing data
    backup_existing_data "${WORK_DIR}"
    
    # Perform restore based on method
    if [ "${ONLINE_RESTORE}" = true ]; then
        restore_online "${BACKUP_FILE}" "${RESTORE_DB}" "${WORK_DIR}"
    else
        stop_neo4j
        restore_offline "${BACKUP_FILE}" "${RESTORE_DB}" "${WORK_DIR}"
        start_neo4j
    fi
    
    # Calculate duration and generate report
    RESTORE_END=$(date +%s)
    RESTORE_DURATION=$((RESTORE_END - RESTORE_START))
    
    if [ "${DRY_RUN}" = false ]; then
        generate_restore_report "${BACKUP_TIMESTAMP}" "${RESTORE_DB}" "${RESTORE_DURATION}" "${MANIFEST_FILE}"
    fi
    
    log "Neo4j restore completed successfully"
    log "Total time: ${RESTORE_DURATION} seconds (Target RTO: ≤ 1800 seconds)"
}

# Run main function
main "$@"