#!/bin/bash
set -euo pipefail

# Backup Manager Script
# Usage: ./backup-manager.sh [backup|restore|list|verify] [service] [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph}"
ENVIRONMENT="${ENVIRONMENT:-production}"
S3_BUCKET="${S3_BUCKET:-intelgraph-backups}"
S3_REGION="${S3_REGION:-us-west-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check required tools
check_tools() {
    local tools=("kubectl" "aws" "jq")

    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
        fi
    done

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi

    # Check kubectl context
    if ! kubectl cluster-info &> /dev/null; then
        error "kubectl not connected to cluster"
    fi
}

# List available backups
list_backups() {
    local service="${1:-all}"
    local days="${2:-30}"

    log "Listing backups for last $days days"

    if [[ "$service" == "all" ]]; then
        local prefixes=("postgres-backups" "neo4j-backups" "minio-backups" "config-backups")
    else
        local prefixes=("${service}-backups")
    fi

    for prefix in "${prefixes[@]}"; do
        info "=== $prefix ==="

        aws s3 ls "s3://${S3_BUCKET}/${prefix}/" --recursive | \
        awk -v cutoff="$(date -d "$days days ago" +%Y-%m-%d)" '$1 >= cutoff {
            size_mb = $3 / 1024 / 1024
            printf "%-20s %-10s %8.2f MB  %s\n", $1, $2, size_mb, $4
        }' | sort -r

        echo
    done
}

# Create backup for specific service
create_backup() {
    local service="$1"
    local backup_type="${2:-manual}"

    log "Creating $backup_type backup for: $service"

    case "$service" in
        "postgres")
            create_postgres_backup
            ;;
        "neo4j")
            create_neo4j_backup
            ;;
        "minio")
            create_minio_backup
            ;;
        "config")
            create_config_backup
            ;;
        "all")
            create_postgres_backup
            create_neo4j_backup
            create_minio_backup
            create_config_backup
            ;;
        *)
            error "Unknown service: $service. Supported: postgres, neo4j, minio, config, all"
            ;;
    esac
}

# Create PostgreSQL backup
create_postgres_backup() {
    info "Creating PostgreSQL backup..."

    local job_name="postgres-backup-$(date +%Y%m%d-%H%M%S)"

    kubectl create job "$job_name" --from=cronjob/ig-platform-postgres-backup -n "$NAMESPACE"

    # Wait for job completion
    log "Waiting for backup job to complete..."
    kubectl wait --for=condition=complete job/"$job_name" -n "$NAMESPACE" --timeout=1800s

    # Check job status
    if kubectl get job "$job_name" -n "$NAMESPACE" -o jsonpath='{.status.succeeded}' | grep -q "1"; then
        log "✓ PostgreSQL backup completed successfully"

        # Get backup filename from job logs
        local backup_file=$(kubectl logs job/"$job_name" -n "$NAMESPACE" | grep "Uploading backup to S3" | awk -F': ' '{print $2}' | tail -1)
        info "Backup file: $backup_file"
    else
        error "PostgreSQL backup failed"
    fi

    # Clean up job
    kubectl delete job "$job_name" -n "$NAMESPACE"
}

# Create Neo4j backup
create_neo4j_backup() {
    info "Creating Neo4j backup..."

    local job_name="neo4j-backup-$(date +%Y%m%d-%H%M%S)"

    kubectl create job "$job_name" --from=cronjob/ig-platform-neo4j-backup -n "$NAMESPACE"

    # Wait for job completion
    log "Waiting for backup job to complete..."
    kubectl wait --for=condition=complete job/"$job_name" -n "$NAMESPACE" --timeout=1800s

    # Check job status
    if kubectl get job "$job_name" -n "$NAMESPACE" -o jsonpath='{.status.succeeded}' | grep -q "1"; then
        log "✓ Neo4j backup completed successfully"

        # Get backup filename from job logs
        local backup_file=$(kubectl logs job/"$job_name" -n "$NAMESPACE" | grep "Uploading backup to S3" | awk -F': ' '{print $2}' | tail -1)
        info "Backup file: $backup_file"
    else
        error "Neo4j backup failed"
    fi

    # Clean up job
    kubectl delete job "$job_name" -n "$NAMESPACE"
}

# Create MinIO backup
create_minio_backup() {
    info "Creating MinIO backup..."

    local backup_date=$(date +%Y%m%d_%H%M%S)
    local backup_prefix="minio-backups/minio_backup_${backup_date}"

    # Use mc (MinIO client) to sync buckets
    kubectl run minio-backup-"$backup_date" --rm -i --restart=Never \
        --image=minio/mc:latest \
        --env="MINIO_ACCESS_KEY=$(kubectl get secret ig-platform-database-secrets -n "$NAMESPACE" -o jsonpath='{.data.minio-access-key}' | base64 -d)" \
        --env="MINIO_SECRET_KEY=$(kubectl get secret ig-platform-database-secrets -n "$NAMESPACE" -o jsonpath='{.data.minio-secret-key}' | base64 -d)" \
        -- sh -c "
            mc alias set source http://minio:9000 \$MINIO_ACCESS_KEY \$MINIO_SECRET_KEY
            mc alias set backup s3://${S3_BUCKET} \$AWS_ACCESS_KEY_ID \$AWS_SECRET_ACCESS_KEY
            mc mirror source/ backup/${backup_prefix}/ --overwrite
            echo 'MinIO backup completed: ${backup_prefix}'
        "

    log "✓ MinIO backup completed successfully"
}

# Create configuration backup
create_config_backup() {
    info "Creating configuration backup..."

    local backup_date=$(date +%Y%m%d_%H%M%S)
    local backup_file="config_backup_${backup_date}.tar.gz"
    local temp_dir="/tmp/config-backup-$$"

    mkdir -p "$temp_dir"

    # Export Kubernetes resources
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$temp_dir/configmaps.yaml"
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$temp_dir/secrets.yaml"
    kubectl get deployments -n "$NAMESPACE" -o yaml > "$temp_dir/deployments.yaml"
    kubectl get services -n "$NAMESPACE" -o yaml > "$temp_dir/services.yaml"
    kubectl get ingresses -n "$NAMESPACE" -o yaml > "$temp_dir/ingresses.yaml"
    kubectl get persistentvolumeclaims -n "$NAMESPACE" -o yaml > "$temp_dir/pvcs.yaml"

    # Export Helm values
    helm get values ig-platform -n "$NAMESPACE" > "$temp_dir/helm-values.yaml"

    # Create archive
    tar -czf "$temp_dir/$backup_file" -C "$temp_dir" \
        configmaps.yaml secrets.yaml deployments.yaml services.yaml ingresses.yaml pvcs.yaml helm-values.yaml

    # Upload to S3
    aws s3 cp "$temp_dir/$backup_file" "s3://${S3_BUCKET}/config-backups/$backup_file" \
        --metadata="backup-date=$backup_date,environment=$ENVIRONMENT,namespace=$NAMESPACE"

    # Clean up
    rm -rf "$temp_dir"

    log "✓ Configuration backup completed: $backup_file"
}

# Restore from backup
restore_from_backup() {
    local service="$1"
    local backup_file="${2:-latest}"

    warn "This will restore $service from backup: $backup_file"
    warn "This operation will replace existing data!"

    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Restore cancelled"
        return 0
    fi

    log "Starting restore for: $service"

    case "$service" in
        "postgres")
            restore_postgres "$backup_file"
            ;;
        "neo4j")
            restore_neo4j "$backup_file"
            ;;
        "minio")
            restore_minio "$backup_file"
            ;;
        "config")
            restore_config "$backup_file"
            ;;
        *)
            error "Unknown service: $service. Supported: postgres, neo4j, minio, config"
            ;;
    esac
}

# Restore PostgreSQL
restore_postgres() {
    local backup_file="$1"

    info "Restoring PostgreSQL from: $backup_file"

    # Create restore job with backup file specified
    kubectl patch job ig-platform-postgres-restore -n "$NAMESPACE" \
        -p '{"spec":{"template":{"spec":{"containers":[{"name":"postgres-restore","env":[{"name":"RESTORE_FROM_BACKUP","value":"true"},{"name":"BACKUP_FILE_NAME","value":"'$backup_file'"}]}]}}}}'

    local job_name="postgres-restore-$(date +%Y%m%d-%H%M%S)"
    kubectl create job "$job_name" --from=job/ig-platform-postgres-restore -n "$NAMESPACE"

    # Wait for completion
    kubectl wait --for=condition=complete job/"$job_name" -n "$NAMESPACE" --timeout=3600s

    if kubectl get job "$job_name" -n "$NAMESPACE" -o jsonpath='{.status.succeeded}' | grep -q "1"; then
        log "✓ PostgreSQL restore completed successfully"
    else
        error "PostgreSQL restore failed"
    fi

    kubectl delete job "$job_name" -n "$NAMESPACE"
}

# Restore Neo4j
restore_neo4j() {
    local backup_file="$1"

    info "Restoring Neo4j from: $backup_file"

    kubectl patch job ig-platform-neo4j-restore -n "$NAMESPACE" \
        -p '{"spec":{"template":{"spec":{"containers":[{"name":"neo4j-restore","env":[{"name":"RESTORE_FROM_BACKUP","value":"true"},{"name":"BACKUP_FILE_NAME","value":"'$backup_file'"}]}]}}}}'

    local job_name="neo4j-restore-$(date +%Y%m%d-%H%M%S)"
    kubectl create job "$job_name" --from=job/ig-platform-neo4j-restore -n "$NAMESPACE"

    # Wait for completion
    kubectl wait --for=condition=complete job/"$job_name" -n "$NAMESPACE" --timeout=3600s

    if kubectl get job "$job_name" -n "$NAMESPACE" -o jsonpath='{.status.succeeded}' | grep -q "1"; then
        log "✓ Neo4j restore completed successfully"
    else
        error "Neo4j restore failed"
    fi

    kubectl delete job "$job_name" -n "$NAMESPACE"
}

# Verify backup integrity
verify_backup() {
    local service="$1"
    local backup_file="${2:-latest}"

    log "Verifying backup integrity for: $service"

    case "$service" in
        "postgres")
            verify_postgres_backup "$backup_file"
            ;;
        "neo4j")
            verify_neo4j_backup "$backup_file"
            ;;
        "minio")
            verify_minio_backup "$backup_file"
            ;;
        "config")
            verify_config_backup "$backup_file"
            ;;
        *)
            error "Unknown service: $service"
            ;;
    esac
}

# Verify PostgreSQL backup
verify_postgres_backup() {
    local backup_file="$1"

    if [[ "$backup_file" == "latest" ]]; then
        backup_file=$(aws s3 ls "s3://${S3_BUCKET}/postgres-backups/" | sort | tail -1 | awk '{print $4}')
    fi

    info "Verifying PostgreSQL backup: $backup_file"

    # Download and test backup file
    aws s3 cp "s3://${S3_BUCKET}/postgres-backups/$backup_file" "/tmp/$backup_file"

    # Test if it's a valid gzip file
    if gunzip -t "/tmp/$backup_file" &> /dev/null; then
        log "✓ Backup file is valid compressed archive"
    else
        error "✗ Backup file is corrupted or invalid"
    fi

    # Check file size (should be > 1KB for meaningful backup)
    local file_size=$(stat -f%z "/tmp/$backup_file" 2>/dev/null || stat -c%s "/tmp/$backup_file")
    if [[ $file_size -gt 1024 ]]; then
        log "✓ Backup file size is reasonable: $(($file_size / 1024))KB"
    else
        warn "Backup file seems too small: ${file_size}B"
    fi

    rm "/tmp/$backup_file"
    log "PostgreSQL backup verification completed"
}

# Get backup statistics
backup_stats() {
    log "Gathering backup statistics..."

    echo "=== Backup Storage Usage ==="
    aws s3 ls "s3://${S3_BUCKET}/" --recursive --human-readable --summarize

    echo -e "\n=== Recent Backup Activity ==="
    for service in "postgres" "neo4j" "minio" "config"; do
        echo "--- $service ---"
        local count=$(aws s3 ls "s3://${S3_BUCKET}/${service}-backups/" | wc -l)
        local latest=$(aws s3 ls "s3://${S3_BUCKET}/${service}-backups/" | sort | tail -1 | awk '{print $1, $2}')
        echo "Total backups: $count"
        echo "Latest backup: $latest"
        echo
    done

    echo "=== Backup Schedule Status ==="
    kubectl get cronjobs -n "$NAMESPACE" -l "app.kubernetes.io/component" | grep backup

    echo -e "\n=== Failed Backup Jobs (last 24h) ==="
    kubectl get jobs -n "$NAMESPACE" --field-selector=status.successful!=1 \
        -l "app.kubernetes.io/component" | grep backup || echo "No failed backup jobs"
}

# Main command handler
main() {
    local command="${1:-help}"
    local service="${2:-all}"

    check_tools

    case "$command" in
        "backup")
            create_backup "$service" "manual"
            ;;
        "restore")
            local backup_file="${3:-latest}"
            restore_from_backup "$service" "$backup_file"
            ;;
        "list")
            local days="${3:-30}"
            list_backups "$service" "$days"
            ;;
        "verify")
            local backup_file="${3:-latest}"
            verify_backup "$service" "$backup_file"
            ;;
        "stats")
            backup_stats
            ;;
        "help"|*)
            cat <<EOF
Backup Manager Script

Usage: $0 <command> [service] [options]

Commands:
  backup <service>              Create backup for service
  restore <service> [file]      Restore from backup (file or 'latest')
  list [service] [days]         List available backups
  verify <service> [file]       Verify backup integrity
  stats                         Show backup statistics
  help                          Show this help message

Services: postgres, neo4j, minio, config, all

Examples:
  $0 backup postgres            # Create PostgreSQL backup
  $0 restore neo4j latest       # Restore Neo4j from latest backup
  $0 list postgres 7            # List PostgreSQL backups from last 7 days
  $0 verify minio               # Verify latest MinIO backup
  $0 stats                      # Show backup statistics

Environment Variables:
  NAMESPACE                     Kubernetes namespace (default: intelgraph)
  ENVIRONMENT                   Environment name (default: production)
  S3_BUCKET                     S3 bucket for backups (default: intelgraph-backups)
  S3_REGION                     S3 region (default: us-west-2)

EOF
            ;;
    esac
}

main "$@"