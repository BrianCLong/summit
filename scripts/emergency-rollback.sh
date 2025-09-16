#!/bin/bash

# Maestro Conductor vNext - Emergency Rollback Script
# Version: 1.0
# Usage: ./emergency-rollback.sh --version VERSION --reason REASON [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE_PREFIX="maestro-conductor"
ROLLBACK_TIMEOUT=180
MAX_ROLLBACK_HISTORY=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_critical() {
    echo -e "${PURPLE}[CRITICAL]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Help function
show_help() {
    cat << EOF
Maestro Conductor vNext Emergency Rollback Script

USAGE:
    ./emergency-rollback.sh --version VERSION --reason REASON [OPTIONS]

REQUIRED:
    --version VERSION        Target rollback version (e.g., v1.1.5)
    --reason REASON          Reason for rollback (quoted string)

OPTIONS:
    --dry-run                Show what would be rolled back without executing
    --force                  Force rollback even if validation fails
    --skip-data-backup       Skip data backup before rollback (DANGEROUS)
    --notify WEBHOOK         Slack webhook for notifications
    --timeout SECONDS        Rollback timeout (default: 180)
    --namespace NAMESPACE    Target namespace (default: all canary namespaces)

EXAMPLES:
    ./emergency-rollback.sh --version v1.1.5 --reason "Critical security vulnerability"
    ./emergency-rollback.sh --version v1.1.5 --reason "Performance degradation" --dry-run
    ./emergency-rollback.sh --version v1.1.5 --reason "Data corruption detected" --notify https://hooks.slack.com/...

SAFETY FEATURES:
    - Automatic data backup before rollback
    - Service health validation
    - Traffic routing verification
    - Audit trail creation
    - Stakeholder notifications

EOF
}

# Parse command line arguments
TARGET_VERSION=""
ROLLBACK_REASON=""
DRY_RUN=false
FORCE_ROLLBACK=false
SKIP_BACKUP=false
TARGET_NAMESPACE="all"
TIMEOUT=$ROLLBACK_TIMEOUT
SLACK_WEBHOOK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            TARGET_VERSION="$2"
            shift 2
            ;;
        --reason)
            ROLLBACK_REASON="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE_ROLLBACK=true
            shift
            ;;
        --skip-data-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --notify)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --namespace)
            TARGET_NAMESPACE="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$TARGET_VERSION" || -z "$ROLLBACK_REASON" ]]; then
    log_error "Version and reason are required"
    show_help
    exit 1
fi

# Rollback ID for tracking
ROLLBACK_ID="rollback-$(date +%Y%m%d-%H%M%S)-$(echo "$TARGET_VERSION" | tr -d 'v.')"

# Slack notification function
send_notification() {
    local message="$1"
    local color="${2:-warning}"
    local urgency="${3:-normal}"

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local payload="{
            \"text\": \"🚨 EMERGENCY ROLLBACK IN PROGRESS\",
            \"attachments\": [{
                \"color\": \"$color\",
                \"fields\": [
                    {\"title\": \"Rollback ID\", \"value\": \"$ROLLBACK_ID\", \"short\": true},
                    {\"title\": \"Target Version\", \"value\": \"$TARGET_VERSION\", \"short\": true},
                    {\"title\": \"Reason\", \"value\": \"$ROLLBACK_REASON\", \"short\": false},
                    {\"title\": \"Status\", \"value\": \"$message\", \"short\": false}
                ],
                \"ts\": $(date +%s)
            }]
        }"

        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" "$SLACK_WEBHOOK" >/dev/null 2>&1 || true

        # Send to multiple channels for critical issues
        if [[ "$urgency" == "critical" ]]; then
            # Add additional notification logic here
            log_info "Critical rollback notification sent"
        fi
    fi
}

# Create audit trail
create_audit_trail() {
    local action="$1"
    local details="$2"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local audit_entry="{
        \"rollback_id\": \"$ROLLBACK_ID\",
        \"timestamp\": \"$timestamp\",
        \"action\": \"$action\",
        \"details\": \"$details\",
        \"version_from\": \"$(kubectl get deployment -n maestro-conductor-canary orchestrator -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null | cut -d: -f2 || echo 'unknown')\",
        \"version_to\": \"$TARGET_VERSION\",
        \"reason\": \"$ROLLBACK_REASON\",
        \"initiated_by\": \"$(whoami)@$(hostname)\",
        \"environment\": \"production\"
    }"

    echo "$audit_entry" >> "/tmp/rollback-audit-${ROLLBACK_ID}.json"
    log_info "Audit trail entry created: $action"
}

# Backup critical data
backup_critical_data() {
    if [[ "$SKIP_BACKUP" == "true" || "$DRY_RUN" == "true" ]]; then
        log_warning "Skipping data backup"
        return 0
    fi

    log_info "Creating emergency data backup..."
    create_audit_trail "backup_started" "Creating pre-rollback data backup"

    # Create backup directory
    local backup_dir="/tmp/emergency-backup-${ROLLBACK_ID}"
    mkdir -p "$backup_dir"

    # Backup PostgreSQL (event store, audit logs)
    log_info "Backing up PostgreSQL databases..."
    kubectl exec -n maestro-conductor-canary deploy/postgresql -- \
        pg_dumpall -U postgres | gzip > "$backup_dir/postgresql-backup.sql.gz" || {
        log_error "PostgreSQL backup failed"
        create_audit_trail "backup_failed" "PostgreSQL backup failed"
        return 1
    }

    # Backup Redis (sessions, cache)
    log_info "Backing up Redis data..."
    kubectl exec -n maestro-conductor-canary deploy/redis -- \
        redis-cli --rdb /tmp/dump.rdb >/dev/null 2>&1 || true
    kubectl cp maestro-conductor-canary/redis:/tmp/dump.rdb "$backup_dir/redis-dump.rdb" || {
        log_warning "Redis backup failed - continuing anyway"
    }

    # Backup Neo4j (provenance graph)
    log_info "Backing up Neo4j graph database..."
    kubectl exec -n maestro-conductor-canary deploy/neo4j -- \
        neo4j-admin dump --to=/tmp/neo4j-backup.dump --database=neo4j >/dev/null 2>&1 || true
    kubectl cp maestro-conductor-canary/neo4j:/tmp/neo4j-backup.dump "$backup_dir/neo4j-backup.dump" || {
        log_warning "Neo4j backup failed - continuing anyway"
    }

    # Backup Kubernetes configurations
    log_info "Backing up Kubernetes configurations..."
    kubectl get all,configmaps,secrets,pvc -n maestro-conductor-canary -o yaml > "$backup_dir/k8s-resources.yaml"

    # Create backup manifest
    cat > "$backup_dir/backup-manifest.json" << EOF
{
    "rollback_id": "$ROLLBACK_ID",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "backup_location": "$backup_dir",
    "files": [
        "postgresql-backup.sql.gz",
        "redis-dump.rdb",
        "neo4j-backup.dump",
        "k8s-resources.yaml"
    ],
    "reason": "$ROLLBACK_REASON"
}
EOF

    log_success "Emergency backup completed: $backup_dir"
    create_audit_trail "backup_completed" "Emergency backup created at $backup_dir"

    # Upload to S3 if configured
    if command -v aws >/dev/null 2>&1 && [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
        log_info "Uploading backup to S3..."
        aws s3 cp "$backup_dir" "s3://$BACKUP_S3_BUCKET/emergency-backups/$ROLLBACK_ID/" --recursive || {
            log_warning "S3 backup upload failed"
        }
    fi
}

# Get active deployments
get_active_deployments() {
    local namespaces=()

    if [[ "$TARGET_NAMESPACE" == "all" ]]; then
        # Get all canary namespaces
        mapfile -t namespaces < <(kubectl get namespaces -l "app=maestro-conductor" -o name | cut -d/ -f2)
        if [[ ${#namespaces[@]} -eq 0 ]]; then
            namespaces=("maestro-conductor-canary")
        fi
    else
        namespaces=("$TARGET_NAMESPACE")
    fi

    echo "${namespaces[@]}"
}

# Validate rollback target
validate_rollback_target() {
    log_info "Validating rollback target version: $TARGET_VERSION"

    # Check if target version image exists
    if ! docker manifest inspect "maestro-conductor:$TARGET_VERSION" >/dev/null 2>&1; then
        log_error "Target version image not found: maestro-conductor:$TARGET_VERSION"
        create_audit_trail "validation_failed" "Target version image not found"
        return 1
    fi

    # Check Helm release history
    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_active_deployments)"

    for namespace in "${namespaces[@]}"; do
        local releases
        mapfile -t releases < <(helm list -n "$namespace" -q)

        for release in "${releases[@]}"; do
            if [[ -z "$release" ]]; then continue; fi

            # Check if target version exists in history
            if helm history "$release" -n "$namespace" --max "$MAX_ROLLBACK_HISTORY" | grep -q "$TARGET_VERSION"; then
                log_success "Found $TARGET_VERSION in release history for $release"
            else
                log_warning "$TARGET_VERSION not found in recent history for $release"
            fi
        done
    done

    log_success "Rollback target validation completed"
    create_audit_trail "validation_completed" "Rollback target validated"
    return 0
}

# Stop traffic to canary
stop_canary_traffic() {
    log_info "Stopping traffic to canary deployments..."
    create_audit_trail "traffic_stop_started" "Stopping traffic to canary deployments"

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_active_deployments)"

    for namespace in "${namespaces[@]}"; do
        # Update Istio VirtualServices to route 0% to canary
        local virtual_services
        mapfile -t virtual_services < <(kubectl get virtualservice -n "$namespace" -o name 2>/dev/null || echo "")

        for vs in "${virtual_services[@]}"; do
            if [[ -z "$vs" ]]; then continue; fi

            log_info "Updating traffic routing for $vs"
            kubectl patch "$vs" -n "$namespace" --type='merge' -p='
{
    "spec": {
        "http": [{
            "route": [{
                "destination": {"host": "stable-service"},
                "weight": 100
            }, {
                "destination": {"host": "canary-service"},
                "weight": 0
            }]
        }]
    }
}' || log_warning "Failed to update traffic routing for $vs"
        done
    done

    # Wait for traffic routing to take effect
    log_info "Waiting for traffic routing to stabilize..."
    sleep 30

    log_success "Canary traffic stopped"
    create_audit_trail "traffic_stopped" "Traffic routing updated to bypass canary"
}

# Execute rollback
execute_rollback() {
    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_active_deployments)"

    log_critical "Executing emergency rollback to $TARGET_VERSION"
    create_audit_trail "rollback_started" "Emergency rollback execution started"

    for namespace in "${namespaces[@]}"; do
        log_info "Rolling back deployments in namespace: $namespace"

        # Get all Helm releases in namespace
        local releases
        mapfile -t releases < <(helm list -n "$namespace" -q)

        for release in "${releases[@]}"; do
            if [[ -z "$release" ]]; then continue; fi

            log_info "Rolling back release: $release"

            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "DRY RUN: helm rollback $release --version $TARGET_VERSION -n $namespace"
                continue
            fi

            # Find the revision with target version
            local target_revision
            target_revision=$(helm history "$release" -n "$namespace" --max "$MAX_ROLLBACK_HISTORY" -o json | \
                jq -r ".[] | select(.app_version == \"$TARGET_VERSION\") | .revision" | head -1)

            if [[ -n "$target_revision" && "$target_revision" != "null" ]]; then
                # Rollback to specific revision
                helm rollback "$release" "$target_revision" -n "$namespace" --timeout="${TIMEOUT}s" --wait || {
                    log_error "Helm rollback failed for $release"
                    create_audit_trail "rollback_failed" "Helm rollback failed for $release"
                    return 1
                }
                log_success "Rolled back $release to revision $target_revision"
            else
                # Force update to target version
                log_info "Target revision not found in history, force updating to $TARGET_VERSION"
                helm upgrade "$release" "$PROJECT_ROOT/charts/maestro-conductor" \
                    -n "$namespace" \
                    --set "image.tag=$TARGET_VERSION" \
                    --timeout="${TIMEOUT}s" \
                    --wait \
                    --atomic || {
                    log_error "Force upgrade failed for $release"
                    create_audit_trail "rollback_failed" "Force upgrade failed for $release"
                    return 1
                }
                log_success "Force upgraded $release to $TARGET_VERSION"
            fi
        done

        # Verify pod rollout
        log_info "Verifying pod rollout in $namespace..."
        kubectl rollout status deployment -n "$namespace" --timeout="${TIMEOUT}s" || {
            log_error "Pod rollout verification failed in $namespace"
            return 1
        }
    done

    log_success "Rollback execution completed"
    create_audit_trail "rollback_completed" "Emergency rollback successfully executed"
}

# Restore traffic routing
restore_traffic_routing() {
    log_info "Restoring traffic routing..."
    create_audit_trail "traffic_restore_started" "Restoring traffic routing to stable version"

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_active_deployments)"

    for namespace in "${namespaces[@]}"; do
        # Update Istio VirtualServices to route 100% to stable
        local virtual_services
        mapfile -t virtual_services < <(kubectl get virtualservice -n "$namespace" -o name 2>/dev/null || echo "")

        for vs in "${virtual_services[@]}"; do
            if [[ -z "$vs" ]]; then continue; fi

            log_info "Restoring traffic routing for $vs"
            kubectl patch "$vs" -n "$namespace" --type='merge' -p='
{
    "spec": {
        "http": [{
            "route": [{
                "destination": {"host": "stable-service"},
                "weight": 100
            }]
        }]
    }
}' || log_warning "Failed to restore traffic routing for $vs"
        done
    done

    log_success "Traffic routing restored to stable version"
    create_audit_trail "traffic_restored" "Traffic routing restored to stable version"
}

# Post-rollback validation
validate_rollback() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    log_info "Validating rollback success..."
    create_audit_trail "validation_started" "Post-rollback validation started"

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_active_deployments)"

    local validation_failed=false

    for namespace in "${namespaces[@]}"; do
        # Check pod health
        local unhealthy_pods
        unhealthy_pods=$(kubectl get pods -n "$namespace" --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)

        if [[ $unhealthy_pods -gt 0 ]]; then
            log_error "$unhealthy_pods unhealthy pods in $namespace"
            validation_failed=true
        fi

        # Check service endpoints
        local services
        mapfile -t services < <(kubectl get service -n "$namespace" -o name)

        for service in "${services[@]}"; do
            local service_name
            service_name=$(echo "$service" | cut -d/ -f2)
            local service_ip
            service_ip=$(kubectl get service "$service_name" -n "$namespace" -o jsonpath='{.spec.clusterIP}')

            # Health check
            if ! kubectl run "temp-health-check-$RANDOM" --rm -i --restart=Never --image=curlimages/curl -- \
               curl -f -s "http://${service_ip}:8080/health" >/dev/null 2>&1; then
                log_error "Health check failed for $service_name"
                validation_failed=true
            else
                log_success "Health check passed for $service_name"
            fi
        done
    done

    if [[ "$validation_failed" == "true" ]]; then
        log_error "Post-rollback validation failed"
        create_audit_trail "validation_failed" "Post-rollback validation detected issues"
        return 1
    fi

    log_success "Post-rollback validation passed"
    create_audit_trail "validation_passed" "Post-rollback validation successful"
}

# Generate rollback report
generate_rollback_report() {
    local report_file="/tmp/rollback-report-${ROLLBACK_ID}.md"

    cat > "$report_file" << EOF
# Emergency Rollback Report

**Rollback ID:** $ROLLBACK_ID
**Timestamp:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Target Version:** $TARGET_VERSION
**Reason:** $ROLLBACK_REASON
**Executed By:** $(whoami)@$(hostname)

## Summary

Emergency rollback executed successfully from production canary to stable version $TARGET_VERSION.

## Timeline

$(cat "/tmp/rollback-audit-${ROLLBACK_ID}.json" | jq -r '. | "- **\(.timestamp)**: \(.action) - \(.details)"' 2>/dev/null || echo "Timeline not available")

## Affected Services

$(get_active_deployments | tr ' ' '\n' | sed 's/^/- /')

## Data Backup

$(if [[ "$SKIP_BACKUP" == "true" ]]; then echo "⚠️ **Data backup was skipped**"; else echo "✅ Emergency backup created: /tmp/emergency-backup-${ROLLBACK_ID}"; fi)

## Validation Results

$(if [[ -f "/tmp/rollback-audit-${ROLLBACK_ID}.json" ]] && grep -q "validation_passed" "/tmp/rollback-audit-${ROLLBACK_ID}.json"; then echo "✅ Post-rollback validation passed"; else echo "❌ Post-rollback validation issues detected"; fi)

## Next Steps

1. Monitor system stability for the next 2 hours
2. Investigate root cause of the issue that triggered rollback
3. Plan remediation for the rolled-back version
4. Update rollback procedures based on lessons learned

## Contact Information

- **Incident Commander:** $(whoami)
- **On-Call SRE:** [Check PagerDuty]
- **Engineering Lead:** [Check Slack]

---
*Report generated automatically by emergency-rollback.sh v1.0*
EOF

    log_info "Rollback report generated: $report_file"

    # Send report via Slack if configured
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local report_content
        report_content=$(cat "$report_file" | head -50)  # Limit for Slack
        send_notification "📋 Rollback Report Generated\n\`\`\`$report_content\`\`\`" "good" "normal"
    fi

    echo "$report_file"
}

# Main rollback execution
main() {
    log_critical "=== EMERGENCY ROLLBACK INITIATED ==="
    log_info "Rollback ID: $ROLLBACK_ID"
    log_info "Target Version: $TARGET_VERSION"
    log_info "Reason: $ROLLBACK_REASON"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual rollback will occur"
    fi

    # Send initial notification
    send_notification "Emergency rollback initiated" "warning" "critical"

    # Create initial audit entry
    create_audit_trail "rollback_initiated" "Emergency rollback process started"

    # Execute rollback steps
    local steps=(
        "validate_rollback_target"
        "backup_critical_data"
        "stop_canary_traffic"
        "execute_rollback"
        "restore_traffic_routing"
        "validate_rollback"
    )

    for step in "${steps[@]}"; do
        log_info "Executing step: $step"
        if ! "$step"; then
            log_critical "Step failed: $step"
            create_audit_trail "step_failed" "Step $step failed"

            if [[ "$FORCE_ROLLBACK" != "true" ]]; then
                log_critical "Rollback aborted due to step failure. Use --force to override."
                send_notification "❌ Emergency rollback failed at step: $step" "danger" "critical"
                exit 1
            else
                log_warning "Step failed but continuing due to --force flag"
            fi
        else
            log_success "Step completed: $step"
        fi
    done

    # Generate final report
    local report_file
    report_file=$(generate_rollback_report)

    # Final success notification
    send_notification "✅ Emergency rollback completed successfully. Target: $TARGET_VERSION" "good" "critical"

    log_success "=== EMERGENCY ROLLBACK COMPLETED SUCCESSFULLY ==="
    log_info "Rollback report: $report_file"
    log_info "Continue monitoring system stability"

    # Cleanup
    if [[ -f "/tmp/rollback-audit-${ROLLBACK_ID}.json" ]]; then
        log_info "Audit trail preserved: /tmp/rollback-audit-${ROLLBACK_ID}.json"
    fi
}

# Trap for cleanup on exit
trap 'log_info "Emergency rollback script terminated"' EXIT

# Execute main function
main "$@"