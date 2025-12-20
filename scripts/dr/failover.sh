#!/bin/bash
#
# Disaster Recovery Failover Script
#
# Orchestrates failover from primary to DR region
#
# Usage:
#   ./failover.sh --target-region us-west-2 --dry-run
#   ./failover.sh --target-region us-west-2 --component postgresql
#   ./failover.sh --target-region us-west-2 --full
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
LOG_FILE="/var/log/intelgraph/failover-${TIMESTAMP}.log"

# Configuration
PRIMARY_REGION="${PRIMARY_REGION:-us-east-1}"
TARGET_REGION=""
DRY_RUN=false
COMPONENT="all"
FORCE=false

# DNS Configuration
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
DOMAIN_NAME="${DOMAIN_NAME:-api.intelgraph.ai}"

# Notification
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
PAGERDUTY_KEY="${PAGERDUTY_KEY:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level=$1
    shift
    echo -e "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [$level] $*" | tee -a "$LOG_FILE"
}

info() { log "INFO" "$*"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

notify() {
    local status=$1
    local message=$2

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        [[ "$status" == "FAILURE" ]] && color="danger"
        [[ "$status" == "WARNING" ]] && color="warning"
        [[ "$status" == "STARTED" ]] && color="#439FE0"

        curl -s -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"DR Failover $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Target Region\", \"value\": \"$TARGET_REGION\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$TIMESTAMP\", \"short\": true}
                    ]
                }]
            }" || warn "Failed to send Slack notification"
    fi
}

error_exit() {
    error "$1"
    notify "FAILURE" "$1"
    exit 1
}

show_usage() {
    cat << EOF
DR Failover Script for Summit/IntelGraph Platform

Usage: $0 [OPTIONS]

Options:
    --target-region REGION   Target DR region (required)
    --component COMP         Component to failover: all, postgresql, neo4j, redis, api
    --dry-run                Show what would be done without executing
    --force                  Skip confirmation prompts
    --help                   Show this help message

Examples:
    $0 --target-region us-west-2 --dry-run
    $0 --target-region us-west-2 --component postgresql
    $0 --target-region us-west-2 --full --force

Environment Variables:
    PRIMARY_REGION           Primary region (default: us-east-1)
    HOSTED_ZONE_ID          Route53 hosted zone ID for DNS failover
    DOMAIN_NAME             Domain to update (default: api.intelgraph.ai)
    SLACK_WEBHOOK_URL       Slack webhook for notifications

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --target-region)
            TARGET_REGION="$2"
            shift 2
            ;;
        --component)
            COMPONENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
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
if [[ -z "$TARGET_REGION" ]]; then
    error_exit "Target region is required"
fi

# Pre-flight checks
preflight_checks() {
    info "Running pre-flight checks..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI is required but not installed"
    fi

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is required but not installed"
    fi

    # Check DR region is healthy
    info "Checking DR region health..."
    if ! aws ec2 describe-availability-zones --region "$TARGET_REGION" &> /dev/null; then
        error_exit "Cannot access DR region: $TARGET_REGION"
    fi

    # Check DR cluster is accessible
    local dr_context="intelgraph-${TARGET_REGION}"
    if ! kubectl --context "$dr_context" cluster-info &> /dev/null; then
        error_exit "Cannot access DR Kubernetes cluster"
    fi

    # Check DR databases are running
    info "Checking DR database status..."
    local pg_status=$(kubectl --context "$dr_context" get pods -l app=postgresql -n intelgraph-db -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")
    if [[ "$pg_status" != "Running" ]]; then
        warn "PostgreSQL in DR region is not running (status: $pg_status)"
    fi

    success "Pre-flight checks passed"
}

# Stop replication from primary
stop_replication() {
    info "Stopping replication from primary region..."

    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY-RUN] Would stop replication from $PRIMARY_REGION"
        return 0
    fi

    local primary_context="intelgraph-${PRIMARY_REGION}"

    # Try to gracefully stop replication if primary is accessible
    if kubectl --context "$primary_context" cluster-info &> /dev/null; then
        kubectl --context "$primary_context" exec -n intelgraph-db postgresql-0 -- \
            psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_replication;" 2>/dev/null || true
        info "Replication stopped on primary"
    else
        warn "Primary region not accessible, proceeding with DR activation"
    fi
}

# Promote PostgreSQL replica
promote_postgresql() {
    info "Promoting PostgreSQL replica in DR region..."

    local dr_context="intelgraph-${TARGET_REGION}"

    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY-RUN] Would promote PostgreSQL replica"
        return 0
    fi

    # Check current replication status
    local is_standby=$(kubectl --context "$dr_context" exec -n intelgraph-db postgresql-0 -- \
        psql -U postgres -t -c "SELECT pg_is_in_recovery();" | tr -d ' ')

    if [[ "$is_standby" != "t" ]]; then
        info "PostgreSQL is already primary"
        return 0
    fi

    # Promote replica
    kubectl --context "$dr_context" exec -n intelgraph-db postgresql-0 -- \
        pg_ctl promote -D /var/lib/postgresql/data

    # Wait for promotion
    local max_wait=60
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        is_standby=$(kubectl --context "$dr_context" exec -n intelgraph-db postgresql-0 -- \
            psql -U postgres -t -c "SELECT pg_is_in_recovery();" | tr -d ' ')
        if [[ "$is_standby" == "f" ]]; then
            success "PostgreSQL promoted successfully"
            return 0
        fi
        sleep 2
        ((waited+=2))
    done

    error_exit "PostgreSQL promotion timed out"
}

# Promote Neo4j replica
promote_neo4j() {
    info "Activating Neo4j in DR region..."

    local dr_context="intelgraph-${TARGET_REGION}"

    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY-RUN] Would activate Neo4j"
        return 0
    fi

    # Scale up Neo4j
    kubectl --context "$dr_context" scale statefulset/neo4j -n intelgraph-db --replicas=1

    # Wait for Neo4j to be ready
    kubectl --context "$dr_context" wait --for=condition=ready pod -l app=neo4j -n intelgraph-db --timeout=300s

    success "Neo4j activated in DR region"
}

# Activate Redis
activate_redis() {
    info "Activating Redis in DR region..."

    local dr_context="intelgraph-${TARGET_REGION}"

    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY-RUN] Would activate Redis"
        return 0
    fi

    # Scale up Redis
    kubectl --context "$dr_context" scale statefulset/redis -n intelgraph-db --replicas=3

    # Wait for Redis to be ready
    kubectl --context "$dr_context" wait --for=condition=ready pod -l app=redis -n intelgraph-db --timeout=180s

    # Verify Redis cluster
    kubectl --context "$dr_context" exec -n intelgraph-db redis-0 -- redis-cli ping

    success "Redis activated in DR region"
}

# Scale up API in DR region
activate_api() {
    info "Activating API layer in DR region..."

    local dr_context="intelgraph-${TARGET_REGION}"

    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY-RUN] Would scale up API in DR region"
        return 0
    fi

    # Scale up API deployment
    kubectl --context "$dr_context" scale deployment/intelgraph-api -n intelgraph --replicas=5

    # Wait for pods to be ready
    kubectl --context "$dr_context" wait --for=condition=ready pod -l app=intelgraph-api -n intelgraph --timeout=300s

    # Verify health
    local api_pod=$(kubectl --context "$dr_context" get pods -l app=intelgraph-api -n intelgraph -o jsonpath='{.items[0].metadata.name}')
    kubectl --context "$dr_context" exec -n intelgraph "$api_pod" -- curl -s localhost:4000/health | grep -q "ok"

    success "API layer activated in DR region"
}

# Update DNS to point to DR region
update_dns() {
    info "Updating DNS to point to DR region..."

    if [[ -z "$HOSTED_ZONE_ID" ]]; then
        warn "HOSTED_ZONE_ID not set, skipping DNS update"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY-RUN] Would update DNS for $DOMAIN_NAME to point to $TARGET_REGION"
        return 0
    fi

    # Get DR region load balancer
    local dr_context="intelgraph-${TARGET_REGION}"
    local dr_lb=$(kubectl --context "$dr_context" get service intelgraph-api -n intelgraph -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

    if [[ -z "$dr_lb" ]]; then
        error_exit "Could not get DR load balancer address"
    fi

    # Create DNS change batch
    local change_batch=$(cat <<EOF
{
    "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": "$DOMAIN_NAME",
            "Type": "CNAME",
            "TTL": 60,
            "ResourceRecords": [{"Value": "$dr_lb"}]
        }
    }]
}
EOF
)

    # Apply DNS change
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch "$change_batch"

    success "DNS updated to point to DR region"
}

# Verify failover
verify_failover() {
    info "Verifying failover..."

    local dr_context="intelgraph-${TARGET_REGION}"
    local errors=0

    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY-RUN] Would verify failover"
        return 0
    fi

    # Check PostgreSQL
    info "Verifying PostgreSQL..."
    if ! kubectl --context "$dr_context" exec -n intelgraph-db postgresql-0 -- \
        psql -U postgres -c "SELECT 1;" &> /dev/null; then
        error "PostgreSQL verification failed"
        ((errors++))
    fi

    # Check Neo4j
    info "Verifying Neo4j..."
    if ! kubectl --context "$dr_context" exec -n intelgraph-db neo4j-0 -- \
        cypher-shell "RETURN 1;" &> /dev/null; then
        error "Neo4j verification failed"
        ((errors++))
    fi

    # Check Redis
    info "Verifying Redis..."
    if ! kubectl --context "$dr_context" exec -n intelgraph-db redis-0 -- \
        redis-cli ping &> /dev/null; then
        error "Redis verification failed"
        ((errors++))
    fi

    # Check API
    info "Verifying API..."
    local api_pod=$(kubectl --context "$dr_context" get pods -l app=intelgraph-api -n intelgraph -o jsonpath='{.items[0].metadata.name}')
    if ! kubectl --context "$dr_context" exec -n intelgraph "$api_pod" -- \
        curl -sf localhost:4000/health &> /dev/null; then
        error "API verification failed"
        ((errors++))
    fi

    if [[ $errors -eq 0 ]]; then
        success "All verifications passed"
        return 0
    else
        error_exit "Failover verification failed with $errors errors"
    fi
}

# Calculate RTO
calculate_metrics() {
    local start_time=$1
    local end_time=$(date +%s)
    local rto_seconds=$((end_time - start_time))
    local rto_minutes=$((rto_seconds / 60))

    info "Failover completed in ${rto_seconds} seconds (${rto_minutes} minutes)"

    # Push metrics
    if [[ -n "${PROMETHEUS_PUSHGATEWAY:-}" ]]; then
        cat <<EOF | curl -s --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/dr-failover"
# HELP dr_failover_duration_seconds Duration of DR failover in seconds
# TYPE dr_failover_duration_seconds gauge
dr_failover_duration_seconds{target_region="$TARGET_REGION"} $rto_seconds

# HELP dr_failover_success Whether failover succeeded
# TYPE dr_failover_success gauge
dr_failover_success{target_region="$TARGET_REGION"} 1

# HELP dr_failover_timestamp Unix timestamp of last failover
# TYPE dr_failover_timestamp gauge
dr_failover_timestamp{target_region="$TARGET_REGION"} $end_time
EOF
    fi
}

# Main failover orchestration
main() {
    local start_time=$(date +%s)

    mkdir -p "$(dirname "$LOG_FILE")"

    info "=========================================="
    info "DR Failover Script"
    info "Target Region: $TARGET_REGION"
    info "Component: $COMPONENT"
    info "Dry Run: $DRY_RUN"
    info "=========================================="

    # Confirmation
    if [[ "$DRY_RUN" != "true" && "$FORCE" != "true" ]]; then
        echo ""
        warn "WARNING: This will initiate DR failover to $TARGET_REGION"
        warn "This is a critical operation that will:"
        echo "  - Stop replication from primary region"
        echo "  - Promote DR databases to primary"
        echo "  - Update DNS to point to DR region"
        echo ""
        read -p "Are you sure you want to proceed? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            info "Failover cancelled"
            exit 0
        fi
    fi

    notify "STARTED" "DR failover initiated to $TARGET_REGION"

    # Pre-flight checks
    preflight_checks

    # Execute failover based on component
    case "$COMPONENT" in
        all)
            stop_replication
            promote_postgresql
            promote_neo4j
            activate_redis
            activate_api
            update_dns
            ;;
        postgresql)
            stop_replication
            promote_postgresql
            ;;
        neo4j)
            promote_neo4j
            ;;
        redis)
            activate_redis
            ;;
        api)
            activate_api
            update_dns
            ;;
        *)
            error_exit "Unknown component: $COMPONENT"
            ;;
    esac

    # Verify
    verify_failover

    # Calculate and report metrics
    calculate_metrics "$start_time"

    success "=========================================="
    success "DR Failover completed successfully!"
    success "Target Region: $TARGET_REGION"
    success "=========================================="

    notify "SUCCESS" "DR failover to $TARGET_REGION completed successfully"
}

# Execute main
main
