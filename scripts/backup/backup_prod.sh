#!/bin/bash
#
# Production Backup Script for Summit/IntelGraph Platform
#
# Features:
# - Encrypted backups using AWS KMS
# - Off-site storage to S3 with cross-region replication
# - Backup verification and integrity checking
# - Prometheus metrics export
# - Slack/PagerDuty notifications
#
# Usage:
#   ./backup_prod.sh --type full --component all
#   ./backup_prod.sh --type incremental --component postgresql
#   ./backup_prod.sh --type wal --component postgresql
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
DATE_PATH=$(date -u +"%Y-%m-%d")
LOG_FILE="/var/log/intelgraph/backup-${TIMESTAMP}.log"

# Environment-specific configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_BUCKET="${BACKUP_BUCKET:-intelgraph-backups-${ENVIRONMENT}}"
KMS_KEY_ID="${KMS_KEY_ID:-alias/intelgraph-backup-key}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Database configuration
PG_HOST="${PG_HOST:-postgresql-primary}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-intelgraph}"
PG_DATABASE="${PG_DATABASE:-intelgraph_prod}"

NEO4J_HOST="${NEO4J_HOST:-neo4j-0}"
NEO4J_USER="${NEO4J_USER:-neo4j}"

REDIS_HOST="${REDIS_HOST:-redis-master}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Retention settings
RETENTION_DAILY_DAYS=30
RETENTION_WEEKLY_DAYS=90
RETENTION_MONTHLY_DAYS=365

# Notification settings
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
PAGERDUTY_KEY="${PAGERDUTY_KEY:-}"
PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    local level=$1
    shift
    local message="[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [$level] $*"
    echo -e "$message" | tee -a "$LOG_FILE"
}

info() { log "INFO" "$*"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

# Error handling
error_exit() {
    error "$1"
    send_alert "FAILURE" "$1"
    exit 1
}

trap 'error_exit "Backup script failed at line $LINENO"' ERR

# Send notifications
send_alert() {
    local status=$1
    local message=$2

    # Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        [[ "$status" == "FAILURE" ]] && color="danger"
        [[ "$status" == "WARNING" ]] && color="warning"

        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Backup $status - $ENVIRONMENT\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$TIMESTAMP\", \"short\": true}
                    ]
                }]
            }" || warn "Failed to send Slack notification"
    fi

    # PagerDuty for failures
    if [[ "$status" == "FAILURE" && -n "$PAGERDUTY_KEY" ]]; then
        curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H "Content-Type: application/json" \
            -d "{
                \"routing_key\": \"$PAGERDUTY_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"Backup failure: $message\",
                    \"severity\": \"critical\",
                    \"source\": \"backup-script\",
                    \"component\": \"$ENVIRONMENT\"
                }
            }" || warn "Failed to send PagerDuty alert"
    fi
}

# Push metrics to Prometheus
push_metrics() {
    local component=$1
    local status=$2
    local duration=$3
    local size=$4

    if [[ -n "$PROMETHEUS_PUSHGATEWAY" ]]; then
        cat <<EOF | curl -s --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/backup/environment/${ENVIRONMENT}/component/${component}"
# HELP backup_last_success_timestamp Unix timestamp of last successful backup
# TYPE backup_last_success_timestamp gauge
backup_last_success_timestamp{component="${component}",environment="${ENVIRONMENT}"} $(date +%s)

# HELP backup_duration_seconds Duration of backup in seconds
# TYPE backup_duration_seconds gauge
backup_duration_seconds{component="${component}",environment="${ENVIRONMENT}"} ${duration}

# HELP backup_size_bytes Size of backup in bytes
# TYPE backup_size_bytes gauge
backup_size_bytes{component="${component}",environment="${ENVIRONMENT}"} ${size}

# HELP backup_success Whether the backup succeeded (1) or failed (0)
# TYPE backup_success gauge
backup_success{component="${component}",environment="${ENVIRONMENT}"} ${status}
EOF
    fi
}

# Encrypt file using AWS KMS
encrypt_file() {
    local input_file=$1
    local output_file=$2

    info "Encrypting $input_file..."

    # Generate data key
    local key_response=$(aws kms generate-data-key \
        --key-id "$KMS_KEY_ID" \
        --key-spec AES_256 \
        --region "$AWS_REGION" \
        --output json)

    local plaintext_key=$(echo "$key_response" | jq -r '.Plaintext')
    local encrypted_key=$(echo "$key_response" | jq -r '.CiphertextBlob')

    # Create encrypted file with header containing encrypted data key
    echo "$encrypted_key" | base64 -d > "${output_file}.header"

    # Encrypt the backup using OpenSSL with the plaintext key
    echo "$plaintext_key" | base64 -d | \
        openssl enc -aes-256-cbc -salt -pbkdf2 -in "$input_file" -out "${output_file}.data" -pass stdin

    # Combine header and data
    cat "${output_file}.header" "${output_file}.data" > "$output_file"
    rm -f "${output_file}.header" "${output_file}.data"

    # Clear plaintext key from memory
    unset plaintext_key

    success "File encrypted successfully"
}

# Upload to S3 with integrity verification
upload_to_s3() {
    local local_file=$1
    local s3_path=$2

    info "Uploading to s3://${BACKUP_BUCKET}/${s3_path}..."

    # Calculate checksum
    local checksum=$(sha256sum "$local_file" | cut -d' ' -f1)

    # Upload with metadata
    aws s3 cp "$local_file" "s3://${BACKUP_BUCKET}/${s3_path}" \
        --region "$AWS_REGION" \
        --metadata "checksum-sha256=${checksum},timestamp=${TIMESTAMP},environment=${ENVIRONMENT}" \
        --storage-class STANDARD \
        --expected-size "$(stat -f%z "$local_file" 2>/dev/null || stat -c%s "$local_file")"

    # Verify upload
    local remote_checksum=$(aws s3api head-object \
        --bucket "$BACKUP_BUCKET" \
        --key "$s3_path" \
        --region "$AWS_REGION" \
        --query 'Metadata.["checksum-sha256"]' \
        --output text)

    if [[ "$checksum" != "$remote_checksum" ]]; then
        error_exit "Checksum verification failed for $s3_path"
    fi

    success "Upload verified: $s3_path"
}

# PostgreSQL backup
backup_postgresql() {
    local backup_type=$1
    local start_time=$(date +%s)
    local backup_file=""
    local s3_path=""

    info "Starting PostgreSQL $backup_type backup..."

    case "$backup_type" in
        full)
            backup_file="/tmp/postgresql_${TIMESTAMP}.dump"
            s3_path="postgresql/full/${DATE_PATH}/intelgraph_prod_${TIMESTAMP}.dump.enc"

            # Create full backup using pg_dump
            PGPASSWORD="${PG_PASSWORD:-}" pg_dump \
                -h "$PG_HOST" \
                -p "$PG_PORT" \
                -U "$PG_USER" \
                -d "$PG_DATABASE" \
                -F c \
                -Z 6 \
                -f "$backup_file" \
                --verbose 2>&1 | tee -a "$LOG_FILE"
            ;;

        incremental)
            backup_file="/tmp/postgresql_incr_${TIMESTAMP}.sql"
            s3_path="postgresql/incremental/${DATE_PATH}/${TIMESTAMP}/changes.sql.enc"

            # For incremental, we use pg_dump with --data-only on changed tables
            # In production, consider using pgBackRest or Barman for true incrementals
            PGPASSWORD="${PG_PASSWORD:-}" pg_dump \
                -h "$PG_HOST" \
                -p "$PG_PORT" \
                -U "$PG_USER" \
                -d "$PG_DATABASE" \
                --data-only \
                -f "$backup_file" \
                --verbose 2>&1 | tee -a "$LOG_FILE"
            ;;

        wal)
            # WAL archiving is typically handled by PostgreSQL configuration
            # This is a manual trigger for WAL switch and archive
            info "Triggering WAL switch..."
            PGPASSWORD="${PG_PASSWORD:-}" psql \
                -h "$PG_HOST" \
                -p "$PG_PORT" \
                -U "$PG_USER" \
                -d "$PG_DATABASE" \
                -c "SELECT pg_switch_wal();"

            success "WAL switch completed"
            return 0
            ;;

        *)
            error_exit "Unknown backup type: $backup_type"
            ;;
    esac

    # Encrypt and upload
    local encrypted_file="${backup_file}.enc"
    encrypt_file "$backup_file" "$encrypted_file"
    upload_to_s3 "$encrypted_file" "$s3_path"

    # Calculate metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(stat -f%z "$encrypted_file" 2>/dev/null || stat -c%s "$encrypted_file")

    # Cleanup
    rm -f "$backup_file" "$encrypted_file"

    # Push metrics
    push_metrics "postgresql" "1" "$duration" "$size"

    success "PostgreSQL backup completed in ${duration}s (${size} bytes)"
}

# Neo4j backup
backup_neo4j() {
    local backup_type=$1
    local start_time=$(date +%s)
    local backup_file="/tmp/neo4j_${TIMESTAMP}.dump"
    local s3_path="neo4j/full/${DATE_PATH}/neo4j_${TIMESTAMP}.dump.enc"

    info "Starting Neo4j $backup_type backup..."

    # For Neo4j Community, we need to stop the database for consistent backup
    # For Enterprise, use online backup

    if [[ "$backup_type" == "full" ]]; then
        # Check if we're using Enterprise (online backup available)
        local neo4j_edition=$(kubectl exec -n "$NAMESPACE" "$NEO4J_HOST" -- \
            neo4j --version 2>/dev/null | grep -i enterprise || echo "community")

        if [[ "$neo4j_edition" == *"enterprise"* ]]; then
            # Online backup for Enterprise
            kubectl exec -n "$NAMESPACE" "$NEO4J_HOST" -- \
                neo4j-admin database backup \
                    --to-path=/backup \
                    --include-metadata=all \
                    neo4j

            # Copy backup from pod
            kubectl cp "$NAMESPACE/$NEO4J_HOST:/backup/neo4j" "$backup_file"
        else
            # Offline dump for Community
            info "Using offline backup for Neo4j Community..."

            # Scale down dependent services
            kubectl scale deployment/intelgraph-api -n "$NAMESPACE" --replicas=0 || true

            # Perform dump
            kubectl exec -n "$NAMESPACE" "$NEO4J_HOST" -- \
                neo4j-admin database dump neo4j --to-path=/backup

            kubectl cp "$NAMESPACE/$NEO4J_HOST:/backup/neo4j.dump" "$backup_file"

            # Scale back up
            kubectl scale deployment/intelgraph-api -n "$NAMESPACE" --replicas=3 || true
        fi
    fi

    # Encrypt and upload
    local encrypted_file="${backup_file}.enc"
    encrypt_file "$backup_file" "$encrypted_file"
    upload_to_s3 "$encrypted_file" "$s3_path"

    # Calculate metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(stat -f%z "$encrypted_file" 2>/dev/null || stat -c%s "$encrypted_file")

    # Cleanup
    rm -f "$backup_file" "$encrypted_file"

    # Push metrics
    push_metrics "neo4j" "1" "$duration" "$size"

    success "Neo4j backup completed in ${duration}s (${size} bytes)"
}

# Redis backup
backup_redis() {
    local backup_type=$1
    local start_time=$(date +%s)
    local backup_file="/tmp/redis_${TIMESTAMP}.rdb"
    local s3_path="redis/rdb/${DATE_PATH}/dump_${TIMESTAMP}.rdb.enc"

    info "Starting Redis $backup_type backup..."

    if [[ "$backup_type" == "full" || "$backup_type" == "rdb" ]]; then
        # Trigger BGSAVE
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE

        # Wait for BGSAVE to complete
        while [[ $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE) == $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE) ]]; do
            sleep 1
        done

        # Copy RDB file
        kubectl cp "$NAMESPACE/redis-master-0:/data/dump.rdb" "$backup_file"
    fi

    # Encrypt and upload
    local encrypted_file="${backup_file}.enc"
    encrypt_file "$backup_file" "$encrypted_file"
    upload_to_s3 "$encrypted_file" "$s3_path"

    # Calculate metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(stat -f%z "$encrypted_file" 2>/dev/null || stat -c%s "$encrypted_file")

    # Cleanup
    rm -f "$backup_file" "$encrypted_file"

    # Push metrics
    push_metrics "redis" "1" "$duration" "$size"

    success "Redis backup completed in ${duration}s (${size} bytes)"
}

# Kubernetes configuration backup
backup_kubernetes() {
    local start_time=$(date +%s)
    local backup_dir="/tmp/k8s_backup_${TIMESTAMP}"
    local backup_file="/tmp/k8s_${TIMESTAMP}.tar.gz"
    local s3_path="kubernetes/${DATE_PATH}/k8s_config_${TIMESTAMP}.tar.gz.enc"

    info "Starting Kubernetes configuration backup..."

    mkdir -p "$backup_dir"

    # Export all resources
    for resource in configmaps secrets deployments statefulsets services ingresses; do
        kubectl get "$resource" -n "$NAMESPACE" -o yaml > "$backup_dir/${resource}.yaml" 2>/dev/null || true
    done

    # Export CRDs
    kubectl get crd -o yaml > "$backup_dir/crds.yaml" 2>/dev/null || true

    # Archive
    tar -czf "$backup_file" -C "/tmp" "k8s_backup_${TIMESTAMP}"

    # Encrypt and upload
    local encrypted_file="${backup_file}.enc"
    encrypt_file "$backup_file" "$encrypted_file"
    upload_to_s3 "$encrypted_file" "$s3_path"

    # Calculate metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(stat -f%z "$encrypted_file" 2>/dev/null || stat -c%s "$encrypted_file")

    # Cleanup
    rm -rf "$backup_dir" "$backup_file" "$encrypted_file"

    # Push metrics
    push_metrics "kubernetes" "1" "$duration" "$size"

    success "Kubernetes backup completed in ${duration}s (${size} bytes)"
}

# Update backup manifest
update_manifest() {
    local component=$1
    local backup_path=$2
    local checksum=$3

    local manifest_file="/tmp/backup-manifest.json"
    local s3_manifest="s3://${BACKUP_BUCKET}/metadata/backup-manifest.json"

    # Download existing manifest or create new
    aws s3 cp "$s3_manifest" "$manifest_file" --region "$AWS_REGION" 2>/dev/null || echo '{"backups":[]}' > "$manifest_file"

    # Add new backup entry
    local new_entry=$(cat <<EOF
{
    "timestamp": "$TIMESTAMP",
    "component": "$component",
    "path": "$backup_path",
    "checksum": "$checksum",
    "environment": "$ENVIRONMENT",
    "retention_class": "daily"
}
EOF
)

    jq ".backups += [$new_entry]" "$manifest_file" > "${manifest_file}.tmp"
    mv "${manifest_file}.tmp" "$manifest_file"

    # Upload updated manifest
    aws s3 cp "$manifest_file" "$s3_manifest" --region "$AWS_REGION"

    rm -f "$manifest_file"
}

# Cleanup old backups based on retention policy
cleanup_old_backups() {
    info "Cleaning up old backups based on retention policy..."

    # Daily backups older than retention period
    local daily_cutoff=$(date -d "-${RETENTION_DAILY_DAYS} days" +%Y-%m-%d 2>/dev/null || \
                         date -v-${RETENTION_DAILY_DAYS}d +%Y-%m-%d)

    aws s3 ls "s3://${BACKUP_BUCKET}/" --recursive | \
        awk -v cutoff="$daily_cutoff" '$1 < cutoff {print $4}' | \
        while read -r key; do
            info "Deleting old backup: $key"
            aws s3 rm "s3://${BACKUP_BUCKET}/${key}" --region "$AWS_REGION"
        done

    success "Cleanup completed"
}

# Main backup orchestration
run_backup() {
    local backup_type=$1
    local component=$2

    info "Starting backup: type=$backup_type, component=$component, environment=$ENVIRONMENT"

    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"

    local overall_start=$(date +%s)
    local failed_components=()

    case "$component" in
        all)
            backup_postgresql "$backup_type" || failed_components+=("postgresql")
            backup_neo4j "$backup_type" || failed_components+=("neo4j")
            backup_redis "$backup_type" || failed_components+=("redis")
            backup_kubernetes || failed_components+=("kubernetes")
            ;;
        postgresql)
            backup_postgresql "$backup_type" || failed_components+=("postgresql")
            ;;
        neo4j)
            backup_neo4j "$backup_type" || failed_components+=("neo4j")
            ;;
        redis)
            backup_redis "$backup_type" || failed_components+=("redis")
            ;;
        kubernetes)
            backup_kubernetes || failed_components+=("kubernetes")
            ;;
        *)
            error_exit "Unknown component: $component"
            ;;
    esac

    local overall_end=$(date +%s)
    local overall_duration=$((overall_end - overall_start))

    # Report results
    if [[ ${#failed_components[@]} -eq 0 ]]; then
        success "All backups completed successfully in ${overall_duration}s"
        send_alert "SUCCESS" "All backups completed successfully in ${overall_duration}s"
    else
        error "Some backups failed: ${failed_components[*]}"
        send_alert "FAILURE" "Failed components: ${failed_components[*]}"
        exit 1
    fi
}

# Usage information
show_usage() {
    cat << EOF
Production Backup Script for Summit/IntelGraph Platform

Usage: $0 [OPTIONS]

Options:
    --type TYPE           Backup type: full, incremental, wal (default: full)
    --component COMP      Component to backup: all, postgresql, neo4j, redis, kubernetes
    --environment ENV     Environment: production, staging (default: production)
    --cleanup             Run retention cleanup after backup
    --verify              Verify backup integrity after completion
    --dry-run             Show what would be done without executing
    --help                Show this help message

Examples:
    $0 --type full --component all
    $0 --type incremental --component postgresql
    $0 --type full --component all --cleanup --verify

Environment Variables:
    BACKUP_BUCKET         S3 bucket for backups
    KMS_KEY_ID            AWS KMS key for encryption
    PG_HOST               PostgreSQL host
    PG_PASSWORD           PostgreSQL password
    SLACK_WEBHOOK_URL     Slack webhook for notifications
    PROMETHEUS_PUSHGATEWAY Prometheus pushgateway URL

EOF
}

# Parse command line arguments
BACKUP_TYPE="full"
COMPONENT="all"
DO_CLEANUP=false
DO_VERIFY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --component)
            COMPONENT="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --cleanup)
            DO_CLEANUP=true
            shift
            ;;
        --verify)
            DO_VERIFY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate arguments
if [[ ! "$BACKUP_TYPE" =~ ^(full|incremental|wal)$ ]]; then
    error_exit "Invalid backup type: $BACKUP_TYPE"
fi

if [[ ! "$COMPONENT" =~ ^(all|postgresql|neo4j|redis|kubernetes)$ ]]; then
    error_exit "Invalid component: $COMPONENT"
fi

# Execute
if [[ "$DRY_RUN" == "true" ]]; then
    info "DRY RUN: Would execute backup type=$BACKUP_TYPE component=$COMPONENT environment=$ENVIRONMENT"
    exit 0
fi

run_backup "$BACKUP_TYPE" "$COMPONENT"

if [[ "$DO_CLEANUP" == "true" ]]; then
    cleanup_old_backups
fi

if [[ "$DO_VERIFY" == "true" ]]; then
    info "Running backup verification..."
    "$SCRIPT_DIR/../dr/backup-verification.sh" --backup-id "latest" --type quick
fi

info "Backup script completed successfully"
