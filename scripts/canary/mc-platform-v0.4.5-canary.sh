#!/bin/bash
set -euo pipefail

# MC Platform v0.4.5 Canary Deployment Script
# Adaptive Quantum Excellence - Production Rollout
#
# Usage: ./mc-platform-v0.4.5-canary.sh [deploy|promote|rollback|status]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
NAMESPACE="mc-platform"
SERVICE_NAME="mc-platform"
VERSION="v0.4.5"
ROLLOUT_NAME="mc-platform-v045"
GIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
DEPLOYMENT_ID="mc-v045-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $*${NC}"
}

success() {
    echo -e "${GREEN}✅ $*${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $*${NC}"
}

error() {
    echo -e "${RED}❌ $*${NC}"
    exit 1
}

# Verify prerequisites
verify_prerequisites() {
    log "Verifying prerequisites..."

    # Check required tools
    for tool in kubectl helm argo jq curl; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool '$tool' not found"
        fi
    done

    # Check Kubernetes connection
    if ! kubectl get ns "$NAMESPACE" &> /dev/null; then
        error "Cannot access namespace '$NAMESPACE'"
    fi

    # Check Argo Rollouts
    if ! kubectl get crd rollouts.argoproj.io &> /dev/null; then
        error "Argo Rollouts CRD not found"
    fi

    # Verify image exists
    if ! kubectl run --rm -i --restart=Never verify-image-${RANDOM} \
        --image="mc-platform:${VERSION}" --command -- echo "Image verified" 2>/dev/null; then
        error "Image mc-platform:${VERSION} not found or not accessible"
    fi

    success "Prerequisites verified"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."

    # Verify monitoring is healthy
    if ! curl -s "http://prometheus:9090/-/healthy" &> /dev/null; then
        warning "Prometheus not reachable - monitoring may be affected"
    fi

    # Check current system health
    log "Checking current system health..."

    # Error rate check
    current_error_rate=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'rate(mc_decision_errors_total[5m]) / rate(mc_decision_total[5m])' 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    if (( $(echo "$current_error_rate > 0.01" | bc -l) )); then
        error "Current error rate too high: ${current_error_rate} (>1%)"
    fi

    # Latency check
    current_p95=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'histogram_quantile(0.95, rate(mc_decision_latency_ms_bucket[5m]))' 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    if (( $(echo "$current_p95 > 300" | bc -l) )); then
        warning "Current P95 latency elevated: ${current_p95}ms"
    fi

    # Check for active incidents
    active_incidents=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'sum(mc_incident_reweighter_active)' 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    if [[ "$active_incidents" != "0" ]]; then
        warning "Active incidents detected: $active_incidents"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment aborted due to active incidents"
        fi
    fi

    success "Pre-deployment checks passed"
}

# Deploy canary
deploy_canary() {
    log "Starting MC Platform v0.4.5 canary deployment..."

    verify_prerequisites
    pre_deployment_checks

    # Create deployment record
    cat > "/tmp/deployment-${DEPLOYMENT_ID}.json" <<EOF
{
    "deployment_id": "${DEPLOYMENT_ID}",
    "version": "${VERSION}",
    "git_sha": "${GIT_SHA}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "operator": "${USER}",
    "environment": "production",
    "strategy": "canary",
    "cohort": "internal_tenants_plus_5pct"
}
EOF

    # Apply rollout configuration
    log "Applying rollout configuration..."
    kubectl apply -f "${PROJECT_ROOT}/deploy/canary/mc-platform-v0.4.5-rollout.yml"

    # Wait for rollout to start
    log "Waiting for rollout to start..."
    kubectl rollout status rollout/"$ROLLOUT_NAME" -n "$NAMESPACE" --timeout=300s

    # Initial validation
    log "Running initial validation..."
    sleep 30

    # Check canary pods are ready
    canary_ready=$(kubectl get pods -n "$NAMESPACE" -l app=mc-platform,version="$VERSION" \
        -o jsonpath='{.items[*].status.containerStatuses[*].ready}' | tr ' ' '\n' | grep -c true || echo "0")

    if [[ "$canary_ready" -eq 0 ]]; then
        error "No canary pods are ready"
    fi

    success "Canary deployment initiated successfully"
    success "Deployment ID: $DEPLOYMENT_ID"
    log "Monitor progress with: kubectl argo rollouts get rollout $ROLLOUT_NAME -n $NAMESPACE -w"

    # Show initial metrics
    show_canary_metrics
}

# Show canary metrics
show_canary_metrics() {
    log "Current canary metrics:"

    # Traffic split
    traffic_split=$(kubectl argo rollouts get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" -o json 2>/dev/null | \
        jq -r '.status.canaryStatus.stableRS // "unknown"' 2>/dev/null || echo "unknown")
    echo "  Traffic split: $traffic_split"

    # Canary pods
    canary_pods=$(kubectl get pods -n "$NAMESPACE" -l app=mc-platform,version="$VERSION" --no-headers 2>/dev/null | wc -l || echo "0")
    echo "  Canary pods: $canary_pods"

    # Analysis status
    analysis_status=$(kubectl argo rollouts get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" -o json 2>/dev/null | \
        jq -r '.status.phase // "unknown"' 2>/dev/null || echo "unknown")
    echo "  Analysis status: $analysis_status"

    # Key metrics (if available)
    if command -v promtool &> /dev/null; then
        error_rate=$(kubectl exec -n monitoring deployment/prometheus -- \
            promtool query instant 'rate(mc_decision_errors_total{version="'$VERSION'"}[5m]) / rate(mc_decision_total{version="'$VERSION'"}[5m])' 2>/dev/null | \
            jq -r '.data.result[0].value[1] // "N/A"' 2>/dev/null || echo "N/A")
        echo "  Error rate: $error_rate"

        latency_p95=$(kubectl exec -n monitoring deployment/prometheus -- \
            promtool query instant 'histogram_quantile(0.95, rate(mc_decision_latency_ms_bucket{version="'$VERSION'"}[5m]))' 2>/dev/null | \
            jq -r '.data.result[0].value[1] // "N/A"' 2>/dev/null || echo "N/A")
        echo "  P95 latency: ${latency_p95}ms"
    fi
}

# Check promotion gates
check_promotion_gates() {
    log "Checking promotion gates..."

    local all_gates_pass=true

    # Gate 1: Error rate ≤ 0.5%
    error_rate=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'rate(mc_decision_errors_total{version="'$VERSION'"}[10m]) / rate(mc_decision_total{version="'$VERSION'"}[10m])' 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "1"' 2>/dev/null || echo "1")

    if (( $(echo "$error_rate <= 0.005" | bc -l) )); then
        success "Gate 1: Error rate ≤ 0.5% - PASS (${error_rate})"
    else
        error "Gate 1: Error rate ≤ 0.5% - FAIL (${error_rate})"
        all_gates_pass=false
    fi

    # Gate 2: P95 latency ≤ 250ms
    latency_p95=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'histogram_quantile(0.95, rate(mc_decision_latency_ms_bucket{version="'$VERSION'"}[10m]))' 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "999"' 2>/dev/null || echo "999")

    if (( $(echo "$latency_p95 <= 250" | bc -l) )); then
        success "Gate 2: P95 latency ≤ 250ms - PASS (${latency_p95}ms)"
    else
        error "Gate 2: P95 latency ≤ 250ms - FAIL (${latency_p95}ms)"
        all_gates_pass=false
    fi

    # Gate 3: Reweighter activation metric present & sane
    reweighter_metric=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'mc_incident_reweighter_active{version="'$VERSION'"}' 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "missing"' 2>/dev/null || echo "missing")

    if [[ "$reweighter_metric" != "missing" ]]; then
        success "Gate 3: Reweighter metric present - PASS"

        # Check exploration rate reduction during incidents (if any)
        incident_active=$(echo "$reweighter_metric" | bc -l)
        if (( $(echo "$incident_active == 1" | bc -l) )); then
            exploration_reduced=$(kubectl exec -n monitoring deployment/prometheus -- \
                promtool query instant 'mc_exploration_rate{version="'$VERSION'"} <= 0.6 * mc_exploration_rate_baseline{version="'$VERSION'"}' 2>/dev/null | \
                jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

            if [[ "$exploration_reduced" == "1" ]]; then
                success "Gate 3a: Exploration reduced during incident - PASS"
            else
                error "Gate 3a: Exploration not reduced during incident - FAIL"
                all_gates_pass=false
            fi
        fi

        # Check weight pin duration if pinned
        weight_pinned=$(kubectl exec -n monitoring deployment/prometheus -- \
            promtool query instant 'mc_weights_pinned{version="'$VERSION'"}' 2>/dev/null | \
            jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

        if (( $(echo "$weight_pinned == 1" | bc -l) )); then
            pin_duration=$(kubectl exec -n monitoring deployment/prometheus -- \
                promtool query instant '(time() - mc_pin_start_timestamp{version="'$VERSION'"})' 2>/dev/null | \
                jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

            if (( $(echo "$pin_duration <= 7800" | bc -l) )); then # 2h 10m
                success "Gate 3b: Weight pin duration within limits - PASS (${pin_duration}s)"
            else
                error "Gate 3b: Weight pin duration exceeded - FAIL (${pin_duration}s > 7800s)"
                all_gates_pass=false
            fi
        fi
    else
        error "Gate 3: Reweighter metric missing - FAIL"
        all_gates_pass=false
    fi

    # Gate 4: Post-quantum verification
    pq_verify_status=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'mc_pq_dual_sig_verification_status{git_sha="'$GIT_SHA'"}' 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    if [[ "$pq_verify_status" == "1" ]]; then
        success "Gate 4: Post-quantum verification - PASS"
    else
        error "Gate 4: Post-quantum verification - FAIL"
        all_gates_pass=false
    fi

    if [[ "$all_gates_pass" == "true" ]]; then
        success "All promotion gates PASSED ✅"
        return 0
    else
        error "Some promotion gates FAILED ❌"
        return 1
    fi
}

# Promote canary
promote_canary() {
    log "Promoting MC Platform v0.4.5 canary to stable..."

    # Check promotion gates
    if ! check_promotion_gates; then
        error "Promotion gates failed - cannot promote"
    fi

    # Confirm promotion
    echo
    warning "This will promote canary to 100% traffic and complete the rollout."
    read -p "Continue with promotion? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Promotion cancelled"
        return 0
    fi

    # Promote via Argo Rollouts
    kubectl argo rollouts promote "$ROLLOUT_NAME" -n "$NAMESPACE"

    # Wait for promotion to complete
    log "Waiting for promotion to complete..."
    kubectl argo rollouts wait "$ROLLOUT_NAME" -n "$NAMESPACE" --timeout=600s

    # Verify promotion
    log "Verifying promotion..."
    sleep 60

    if ! check_promotion_gates; then
        warning "Post-promotion validation failed - consider rollback"
    else
        success "Promotion completed successfully!"
        log "MC Platform v0.4.5 is now serving 100% traffic"
    fi
}

# Rollback canary
rollback_canary() {
    log "Rolling back MC Platform v0.4.5 canary..."

    warning "This will immediately rollback to the previous stable version."
    read -p "Continue with rollback? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Rollback cancelled"
        return 0
    fi

    # Abort the rollout
    kubectl argo rollouts abort "$ROLLOUT_NAME" -n "$NAMESPACE"

    # Alternative: Use Helm rollback if available
    if helm list -n "$NAMESPACE" | grep -q mc-platform; then
        log "Rolling back via Helm..."
        helm rollback mc-platform -n "$NAMESPACE"
    fi

    # Disable feature flag if needed
    log "Disabling IncidentAutoReweighter feature flag..."
    kubectl patch configmap mc-platform-config -n "$NAMESPACE" \
        -p '{"data":{"INCIDENT_REWEIGHTER_ENABLED":"false"}}'

    # Force restore exploration rate if needed
    log "Forcing exploration rate restoration..."
    kubectl exec -n "$NAMESPACE" deployment/mc-platform -- \
        curl -X POST http://localhost:8080/qam/reweighter/restore-all \
        -H "Authorization: Bearer ${EMERGENCY_TOKEN:-emergency}" || true

    success "Rollback completed"
    log "Monitor system recovery and re-enable features when stable"
}

# Show rollout status
show_status() {
    log "MC Platform v0.4.5 Rollout Status"
    echo

    # Rollout status
    kubectl argo rollouts get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" || {
        warning "Rollout not found or not accessible"
        return 1
    }

    echo
    show_canary_metrics

    echo
    log "Recent events:"
    kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$ROLLOUT_NAME" \
        --sort-by='.lastTimestamp' | tail -10
}

# Main function
main() {
    case "${1:-}" in
        deploy)
            deploy_canary
            ;;
        promote)
            promote_canary
            ;;
        rollback)
            rollback_canary
            ;;
        status)
            show_status
            ;;
        gates)
            check_promotion_gates
            ;;
        *)
            echo "Usage: $0 [deploy|promote|rollback|status|gates]"
            echo
            echo "Commands:"
            echo "  deploy   - Start canary deployment"
            echo "  promote  - Promote canary to stable (after gates check)"
            echo "  rollback - Rollback to previous version"
            echo "  status   - Show current rollout status"
            echo "  gates    - Check promotion gates"
            exit 1
            ;;
    esac
}

main "$@"