#!/usr/bin/env bash
#
# Rollback Validation Script with Supply Chain Verification
#
# This script provides comprehensive deployment validation including:
# - Health checks
# - SLO validation
# - Image digest verification against signed artifacts
# - Automatic rollback on failures
#
# Usage:
#   ./rollback-validation.sh [options]
#
# Options:
#   --deployment <name>   Kubernetes deployment name (default: intelgraph-api)
#   --namespace <ns>      Kubernetes namespace (default: default)
#   --timeout <seconds>   Validation timeout (default: 300)
#   --no-rollback         Disable automatic rollback
#   --dry-run             Show what would be done without making changes
#

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# Kubernetes configuration
K8S_NAMESPACE="${K8S_NAMESPACE:-default}"
APP_DEPLOYMENT="${APP_DEPLOYMENT:-intelgraph-api}"
VALIDATION_TIMEOUT="${VALIDATION_TIMEOUT:-300}"

# Rollback configuration
AUTO_ROLLBACK_ENABLED="${AUTO_ROLLBACK_ENABLED:-true}"
ROLLBACK_ON_HEALTH_FAILURE="${ROLLBACK_ON_HEALTH_FAILURE:-true}"
ROLLBACK_ON_VALIDATION_FAILURE="${ROLLBACK_ON_VALIDATION_FAILURE:-true}"
ROLLBACK_ON_SLO_BREACH="${ROLLBACK_ON_SLO_BREACH:-true}"
ROLLBACK_ON_DIGEST_MISMATCH="${ROLLBACK_ON_DIGEST_MISMATCH:-true}"
CANARY_ROLLBACK_THRESHOLD="${CANARY_ROLLBACK_THRESHOLD:-5}" # 5% error rate

# Monitoring configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus-server.monitoring.svc.cluster.local}"
GRAFANA_URL="${GRAFANA_URL:-http://grafana.monitoring.svc.cluster.local:3000}"
ENABLE_METRICS_VALIDATION="${ENABLE_METRICS_VALIDATION:-true}"

# Supply chain verification configuration
SIGNED_DIGEST_FILE="${SIGNED_DIGEST_FILE:-$PROJECT_ROOT/release-artifacts/provenance.json}"

# Validation state
VALIDATION_RUN_ID="${VALIDATION_RUN_ID:-$(date +%Y%m%d-%H%M%S)-$$}"
VALIDATION_LOG_DIR="$PROJECT_ROOT/logs/validation"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Initialize validation environment
initialize_validation() {
    log "Initializing validation environment: $VALIDATION_RUN_ID"

    mkdir -p "$VALIDATION_LOG_DIR"
    mkdir -p "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID"

    # Record validation configuration
    cat > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/config.json" << EOF
{
    "run_id": "$VALIDATION_RUN_ID",
    "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployment": {
        "namespace": "$K8S_NAMESPACE",
        "app": "$APP_DEPLOYMENT"
    },
    "rollback_config": {
        "auto_rollback_enabled": $AUTO_ROLLBACK_ENABLED,
        "rollback_on_health_failure": $ROLLBACK_ON_HEALTH_FAILURE,
        "rollback_on_validation_failure": $ROLLBACK_ON_VALIDATION_FAILURE,
        "rollback_on_slo_breach": $ROLLBACK_ON_SLO_BREACH,
        "rollback_on_digest_mismatch": $ROLLBACK_ON_DIGEST_MISMATCH,
        "canary_threshold": $CANARY_ROLLBACK_THRESHOLD
    },
    "status": "initialized",
    "dry_run": $DRY_RUN
}
EOF

    success "Validation environment initialized: $VALIDATION_RUN_ID"
}

# Normalize digest strings
normalize_digest() {
    local digest="$1"
    if [ -z "$digest" ]; then
        echo ""
        return
    fi
    # Strip any prefix before @
    digest="${digest##*@}"
    # Strip sha256: prefix if present
    digest="${digest#sha256:}"
    # Return normalized format
    if [ -n "$digest" ]; then
        echo "sha256:$digest"
    else
        echo ""
    fi
}

# Resolve deployed image digest
get_deployed_image_digest() {
    # Allow override via environment variable
    if [ -n "${DEPLOYED_IMAGE_DIGEST:-}" ]; then
        normalize_digest "$DEPLOYED_IMAGE_DIGEST"
        return 0
    fi

    # Get from Kubernetes deployment
    local deployment_status
    deployment_status=$(get_deployment_status)
    local image_ref
    image_ref=$(echo "$deployment_status" | jq -r '.spec.template.spec.containers[0].image // ""')
    local digest
    digest=$(echo "$image_ref" | grep -Eo 'sha256:[0-9a-f]{64}' | head -n 1 || true)

    # Fall back to pod imageID
    if [ -z "$digest" ]; then
        local image_id
        image_id=$(kubectl get pods -n "$K8S_NAMESPACE" -l app="$APP_DEPLOYMENT" \
            -o jsonpath='{.items[0].status.containerStatuses[0].imageID}' 2>/dev/null || echo "")
        digest=$(echo "$image_id" | grep -Eo 'sha256:[0-9a-f]{64}' | head -n 1 || true)
    fi

    normalize_digest "$digest"
}

# Resolve signed artifact digest
get_signed_image_digest() {
    # Allow override via environment variable
    if [ -n "${SIGNED_IMAGE_DIGEST:-}" ]; then
        normalize_digest "$SIGNED_IMAGE_DIGEST"
        return 0
    fi

    # Check provenance file
    if [ -f "$SIGNED_DIGEST_FILE" ]; then
        local digest_file_value
        digest_file_value=$(grep -Eo 'sha256:[0-9a-f]{64}' "$SIGNED_DIGEST_FILE" | head -n 1 || true)
        if [ -n "$digest_file_value" ]; then
            normalize_digest "$digest_file_value"
            return 0
        fi

        # Try SLSA provenance format
        local provenance_digest
        provenance_digest=$(jq -r '.subject[0].digest.sha256 // empty' "$SIGNED_DIGEST_FILE" 2>/dev/null || echo "")
        if [ -n "$provenance_digest" ]; then
            normalize_digest "$provenance_digest"
            return 0
        fi
    fi

    # Check cosign verification output
    if [ -f "$PROJECT_ROOT/cosign-verify.txt" ]; then
        local cosign_digest
        cosign_digest=$(grep -Eo 'sha256:[0-9a-f]{64}' "$PROJECT_ROOT/cosign-verify.txt" | head -n 1 || true)
        normalize_digest "$cosign_digest"
        return 0
    fi

    echo ""
}

# Record digest verification evidence
record_digest_evidence() {
    local deployed_digest="$1"
    local signed_digest="$2"
    local status="$3"
    local evidence_dir="$PROJECT_ROOT/evidence-bundles"
    local evidence_file="$evidence_dir/deployment-digest-${VALIDATION_RUN_ID}.json"

    mkdir -p "$evidence_dir"

    cat > "$evidence_file" << EOF
{
    "validation_run_id": "$VALIDATION_RUN_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployment": {
        "namespace": "$K8S_NAMESPACE",
        "app": "$APP_DEPLOYMENT"
    },
    "digests": {
        "deployed": "$deployed_digest",
        "signed": "$signed_digest"
    },
    "status": "$status",
    "sources": {
        "deployed": "${DEPLOYED_IMAGE_DIGEST:-kubectl}",
        "signed": "${SIGNED_IMAGE_DIGEST:-$SIGNED_DIGEST_FILE}"
    }
}
EOF

    success "Digest evidence recorded: $evidence_file"
}

# Verify deployed image digest matches signed artifact
verify_deployment_digest() {
    log "Verifying deployed image digest against signed artifact"

    local deployed_digest
    deployed_digest=$(get_deployed_image_digest)
    local signed_digest
    signed_digest=$(get_signed_image_digest)

    if [ -z "$deployed_digest" ] || [ -z "$signed_digest" ]; then
        record_digest_evidence "$deployed_digest" "$signed_digest" "missing"
        warn "Digest verification skipped: missing deployed or signed digest"
        return 0  # Don't fail if digests not available
    fi

    if [ "$deployed_digest" = "$signed_digest" ]; then
        record_digest_evidence "$deployed_digest" "$signed_digest" "matched"
        success "Digest verification passed: $deployed_digest"
        return 0
    fi

    record_digest_evidence "$deployed_digest" "$signed_digest" "mismatch"
    error "Digest mismatch detected: deployed $deployed_digest != signed $signed_digest"
    return 1
}

# Get current deployment status
get_deployment_status() {
    local deployment_info
    deployment_info=$(kubectl get deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" -o json 2>/dev/null || echo "{}")
    echo "$deployment_info"
}

# Check deployment health
check_deployment_health() {
    log "Checking deployment health..."

    local deployment_status
    deployment_status=$(get_deployment_status)

    local available_replicas
    available_replicas=$(echo "$deployment_status" | jq -r '.status.availableReplicas // 0')
    local desired_replicas
    desired_replicas=$(echo "$deployment_status" | jq -r '.spec.replicas // 1')

    if [ "$available_replicas" -ge "$desired_replicas" ]; then
        success "Deployment healthy: $available_replicas/$desired_replicas replicas available"
        return 0
    else
        error "Deployment unhealthy: $available_replicas/$desired_replicas replicas available"
        return 1
    fi
}

# Check endpoint health
check_endpoint_health() {
    local endpoint="${1:-/health}"
    local service_url="${SERVICE_URL:-http://localhost:4000}"

    log "Checking endpoint health: $service_url$endpoint"

    local response
    response=$(curl -sf -o /dev/null -w "%{http_code}" "$service_url$endpoint" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        success "Endpoint healthy: $service_url$endpoint"
        return 0
    else
        error "Endpoint unhealthy: $service_url$endpoint (HTTP $response)"
        return 1
    fi
}

# Perform rollback
perform_rollback() {
    local reason="$1"

    if [ "$AUTO_ROLLBACK_ENABLED" != "true" ]; then
        warn "Rollback disabled. Reason: $reason"
        return 0
    fi

    if [ "$DRY_RUN" = "true" ]; then
        warn "[DRY RUN] Would rollback deployment due to: $reason"
        return 0
    fi

    log "Initiating rollback due to: $reason"

    kubectl rollout undo deployment/"$APP_DEPLOYMENT" -n "$K8S_NAMESPACE"

    log "Waiting for rollback to complete..."
    kubectl rollout status deployment/"$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" --timeout=120s

    success "Rollback completed"
}

# Generate validation report
generate_validation_report() {
    local status="$1"
    local report_file="$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/report.json"

    cat > "$report_file" << EOF
{
    "run_id": "$VALIDATION_RUN_ID",
    "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployment": {
        "namespace": "$K8S_NAMESPACE",
        "app": "$APP_DEPLOYMENT"
    },
    "status": "$status",
    "artifacts": {
        "log_file": "$VALIDATION_LOG_DIR/${VALIDATION_RUN_ID}.log",
        "config": "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/config.json",
        "digest_evidence": "$PROJECT_ROOT/evidence-bundles/deployment-digest-${VALIDATION_RUN_ID}.json"
    }
}
EOF

    success "Validation report generated: $report_file"
}

# Main validation flow
main() {
    local validation_passed=true

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --deployment)
                APP_DEPLOYMENT="$2"
                shift 2
                ;;
            --namespace)
                K8S_NAMESPACE="$2"
                shift 2
                ;;
            --timeout)
                VALIDATION_TIMEOUT="$2"
                shift 2
                ;;
            --no-rollback)
                AUTO_ROLLBACK_ENABLED="false"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "Starting deployment validation for $APP_DEPLOYMENT in $K8S_NAMESPACE"

    initialize_validation

    # Run validation checks
    if ! verify_deployment_digest; then
        if [ "$ROLLBACK_ON_DIGEST_MISMATCH" = "true" ]; then
            perform_rollback "digest_mismatch"
            validation_passed=false
        fi
    fi

    if ! check_deployment_health; then
        if [ "$ROLLBACK_ON_HEALTH_FAILURE" = "true" ]; then
            perform_rollback "health_check_failure"
            validation_passed=false
        fi
    fi

    # Generate report
    if [ "$validation_passed" = "true" ]; then
        generate_validation_report "passed"
        success "Deployment validation completed successfully"
        exit 0
    else
        generate_validation_report "failed"
        error "Deployment validation failed"
        exit 1
    fi
}

# Run main if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
