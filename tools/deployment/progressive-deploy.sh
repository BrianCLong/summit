#!/bin/bash
set -euo pipefail

# Progressive Deployment Script
# Usage: ./progressive-deploy.sh [promote|rollback|status] [service] [environment]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph}"
SERVICE="${2:-web}"
ENVIRONMENT="${3:-development}"

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

# Check if required tools are installed
check_tools() {
    local tools=("kubectl" "helm")

    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
        fi
    done

    # Check for Argo Rollouts kubectl plugin
    if ! kubectl argo rollouts version &> /dev/null; then
        warn "kubectl argo rollouts plugin not found, installing..."
        curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
        chmod +x ./kubectl-argo-rollouts-linux-amd64
        sudo mv ./kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts
    fi
}

# Get deployment strategy for service
get_strategy() {
    local service="$1"

    if kubectl get canary "ig-platform-${service}" -n "$NAMESPACE" &> /dev/null; then
        echo "flagger"
    elif kubectl get rollout "ig-platform-${service}" -n "$NAMESPACE" &> /dev/null; then
        echo "argo-rollouts"
    else
        echo "standard"
    fi
}

# Get current status of progressive deployment
show_status() {
    local service="$1"
    local strategy=$(get_strategy "$service")

    log "Checking deployment status for: $service"
    info "Strategy: $strategy"

    case "$strategy" in
        "flagger")
            show_flagger_status "$service"
            ;;
        "argo-rollouts")
            show_argo_status "$service"
            ;;
        "standard")
            show_standard_status "$service"
            ;;
    esac
}

# Show Flagger canary status
show_flagger_status() {
    local service="$1"
    local canary_name="ig-platform-${service}"

    echo "=== Flagger Canary Status ==="
    kubectl get canary "$canary_name" -n "$NAMESPACE" -o wide

    echo -e "\n=== Canary Events ==="
    kubectl describe canary "$canary_name" -n "$NAMESPACE" | grep -A 10 "Events:"

    echo -e "\n=== Service Traffic Split ==="
    kubectl get svc -n "$NAMESPACE" -l "app.kubernetes.io/component=${service}" -o wide

    # Show metrics if available
    echo -e "\n=== Current Metrics ==="
    local primary_svc="${canary_name}"
    local canary_svc="${canary_name}-canary"

    info "Primary service: $primary_svc"
    info "Canary service: $canary_svc"

    # Check if services are receiving traffic
    kubectl get endpoints "$primary_svc" -n "$NAMESPACE" 2>/dev/null || true
    kubectl get endpoints "$canary_svc" -n "$NAMESPACE" 2>/dev/null || true
}

# Show Argo Rollouts status
show_argo_status() {
    local service="$1"
    local rollout_name="ig-platform-${service}"

    echo "=== Argo Rollout Status ==="
    kubectl argo rollouts get rollout "$rollout_name" -n "$NAMESPACE" --watch=false

    echo -e "\n=== Rollout History ==="
    kubectl argo rollouts history rollout "$rollout_name" -n "$NAMESPACE"

    echo -e "\n=== Analysis Runs ==="
    kubectl get analysisrun -n "$NAMESPACE" -l "rollouts-pod-template-hash" --sort-by=.metadata.creationTimestamp
}

# Show standard deployment status
show_standard_status() {
    local service="$1"
    local deployment_name="ig-platform-${service}"

    echo "=== Standard Deployment Status ==="
    kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o wide

    echo -e "\n=== Pod Status ==="
    kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/component=${service}" -o wide

    echo -e "\n=== Recent Events ==="
    kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$deployment_name" --sort-by='.lastTimestamp' | tail -10
}

# Promote canary to stable
promote_deployment() {
    local service="$1"
    local strategy=$(get_strategy "$service")

    log "Promoting canary for service: $service"
    info "Strategy: $strategy"

    case "$strategy" in
        "flagger")
            promote_flagger "$service"
            ;;
        "argo-rollouts")
            promote_argo "$service"
            ;;
        "standard")
            warn "Standard deployments don't support canary promotion"
            ;;
    esac
}

# Promote Flagger canary
promote_flagger() {
    local service="$1"
    local canary_name="ig-platform-${service}"

    info "Checking canary readiness..."
    local phase=$(kubectl get canary "$canary_name" -n "$NAMESPACE" -o jsonpath='{.status.phase}')

    if [[ "$phase" != "Progressing" && "$phase" != "Waiting" ]]; then
        warn "Canary is not in a promotable state: $phase"
        show_flagger_status "$service"
        return 1
    fi

    info "Promoting canary by increasing traffic to 100%"

    # Force promotion by setting weight to 100%
    kubectl patch canary "$canary_name" -n "$NAMESPACE" --type='merge' -p='{"spec":{"analysis":{"stepWeight":100}}}'

    log "Canary promotion initiated. Monitoring progress..."

    # Wait for promotion to complete
    local timeout=300
    local elapsed=0

    while [[ $elapsed -lt $timeout ]]; do
        local current_phase=$(kubectl get canary "$canary_name" -n "$NAMESPACE" -o jsonpath='{.status.phase}')

        if [[ "$current_phase" == "Succeeded" ]]; then
            log "✓ Canary promotion completed successfully"
            return 0
        elif [[ "$current_phase" == "Failed" ]]; then
            error "✗ Canary promotion failed"
            return 1
        fi

        info "Current phase: $current_phase"
        sleep 10
        elapsed=$((elapsed + 10))
    done

    warn "Promotion timeout reached. Check status manually."
}

# Promote Argo Rollouts
promote_argo() {
    local service="$1"
    local rollout_name="ig-platform-${service}"

    info "Promoting Argo Rollout..."
    kubectl argo rollouts promote "$rollout_name" -n "$NAMESPACE"

    log "Rollout promotion initiated. Monitoring progress..."

    # Wait for rollout to complete
    kubectl argo rollouts get rollout "$rollout_name" -n "$NAMESPACE" --watch --timeout=600s

    if kubectl argo rollouts status "$rollout_name" -n "$NAMESPACE"; then
        log "✓ Rollout promotion completed successfully"
    else
        error "✗ Rollout promotion failed"
    fi
}

# Rollback deployment
rollback_deployment() {
    local service="$1"
    local strategy=$(get_strategy "$service")

    log "Rolling back deployment for service: $service"
    info "Strategy: $strategy"

    case "$strategy" in
        "flagger")
            rollback_flagger "$service"
            ;;
        "argo-rollouts")
            rollback_argo "$service"
            ;;
        "standard")
            rollback_standard "$service"
            ;;
    esac
}

# Rollback Flagger canary
rollback_flagger() {
    local service="$1"
    local canary_name="ig-platform-${service}"

    info "Checking canary status..."
    local phase=$(kubectl get canary "$canary_name" -n "$NAMESPACE" -o jsonpath='{.status.phase}')

    if [[ "$phase" == "Failed" ]]; then
        info "Canary already failed and rolled back automatically"
        return 0
    fi

    if [[ "$phase" != "Progressing" && "$phase" != "Waiting" ]]; then
        warn "Canary is not in a rollback-able state: $phase"
        return 1
    fi

    info "Triggering manual rollback..."

    # Reset the canary by restarting the original deployment
    local deployment_name="ig-platform-${service}"
    kubectl rollout restart deployment "$deployment_name" -n "$NAMESPACE"

    log "Rollback initiated. The canary will be automatically aborted."

    # Monitor rollback
    local timeout=180
    local elapsed=0

    while [[ $elapsed -lt $timeout ]]; do
        local current_phase=$(kubectl get canary "$canary_name" -n "$NAMESPACE" -o jsonpath='{.status.phase}')

        if [[ "$current_phase" == "Initializing" || "$current_phase" == "Initialized" ]]; then
            log "✓ Rollback completed successfully"
            return 0
        fi

        info "Current phase: $current_phase"
        sleep 10
        elapsed=$((elapsed + 10))
    done

    warn "Rollback timeout reached. Check status manually."
}

# Rollback Argo Rollouts
rollback_argo() {
    local service="$1"
    local rollout_name="ig-platform-${service}"

    info "Rolling back Argo Rollout..."
    kubectl argo rollouts abort "$rollout_name" -n "$NAMESPACE"
    kubectl argo rollouts undo "$rollout_name" -n "$NAMESPACE"

    log "Rollback initiated. Monitoring progress..."

    # Wait for rollback to complete
    kubectl argo rollouts get rollout "$rollout_name" -n "$NAMESPACE" --watch --timeout=300s

    if kubectl argo rollouts status "$rollout_name" -n "$NAMESPACE"; then
        log "✓ Rollback completed successfully"
    else
        error "✗ Rollback failed"
    fi
}

# Rollback standard deployment
rollback_standard() {
    local service="$1"
    local deployment_name="ig-platform-${service}"

    info "Rolling back standard deployment..."
    kubectl rollout undo deployment "$deployment_name" -n "$NAMESPACE"

    log "Rollback initiated. Monitoring progress..."
    kubectl rollout status deployment "$deployment_name" -n "$NAMESPACE" --timeout=300s

    log "✓ Rollback completed successfully"
}

# Run smoke tests against deployed service
run_smoke_tests() {
    local service="$1"
    local endpoint="$2"

    log "Running smoke tests against: $endpoint"

    # Basic health check
    info "Testing health endpoint..."
    if curl -sf "$endpoint/health" > /dev/null; then
        log "✓ Health check passed"
    else
        error "✗ Health check failed"
        return 1
    fi

    # Test critical user flows
    if [[ "$service" == "web" ]]; then
        info "Testing web application..."

        # Check if homepage loads
        if curl -sf "$endpoint" | grep -q "IntelGraph"; then
            log "✓ Homepage loads correctly"
        else
            warn "Homepage may have issues"
        fi

        # Test API connectivity
        if curl -sf "$endpoint/api/health" > /dev/null; then
            log "✓ API connectivity verified"
        else
            warn "API connectivity issues detected"
        fi
    fi

    log "Smoke tests completed"
}

# Set up monitoring for progressive deployment
setup_monitoring() {
    local service="$1"

    log "Setting up monitoring for progressive deployment..."

    # Create monitoring dashboard
    cat > "/tmp/progressive-deployment-dashboard.json" <<EOF
{
  "dashboard": {
    "title": "Progressive Deployment - $service",
    "panels": [
      {
        "title": "Request Success Rate",
        "targets": [
          {
            "expr": "sum(rate(nginx_ingress_controller_requests{service=\"ig-platform-${service}\",status!~\"5.*\"}[2m])) / sum(rate(nginx_ingress_controller_requests{service=\"ig-platform-${service}\"}[2m]))",
            "legendFormat": "Success Rate"
          }
        ]
      },
      {
        "title": "Request Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(nginx_ingress_controller_request_duration_seconds_bucket{service=\"ig-platform-${service}\"}[2m])) by (le))",
            "legendFormat": "95th Percentile"
          }
        ]
      }
    ]
  }
}
EOF

    info "Monitoring dashboard configuration created"

    # Set up alerts
    log "Configuring deployment alerts..."

    # Alert for high error rate
    kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: progressive-deployment-${service}
  namespace: $NAMESPACE
spec:
  groups:
  - name: progressive-deployment
    rules:
    - alert: CanaryHighErrorRate
      expr: |
        (
          sum(rate(nginx_ingress_controller_requests{service="ig-platform-${service}-canary",status=~"5.*"}[2m])) /
          sum(rate(nginx_ingress_controller_requests{service="ig-platform-${service}-canary"}[2m]))
        ) > 0.05
      for: 1m
      labels:
        severity: critical
        service: $service
      annotations:
        summary: "Canary deployment showing high error rate"
        description: "Service {{ \$labels.service }} canary has error rate above 5%"

    - alert: CanaryHighLatency
      expr: |
        histogram_quantile(0.95,
          sum(rate(nginx_ingress_controller_request_duration_seconds_bucket{service="ig-platform-${service}-canary"}[2m])) by (le)
        ) > 1.0
      for: 2m
      labels:
        severity: warning
        service: $service
      annotations:
        summary: "Canary deployment showing high latency"
        description: "Service {{ \$labels.service }} canary 95th percentile latency above 1s"
EOF

    log "✓ Monitoring setup completed"
}

# Main command handler
main() {
    local command="${1:-help}"

    check_tools

    case "$command" in
        "status")
            show_status "$SERVICE"
            ;;
        "promote")
            promote_deployment "$SERVICE"
            ;;
        "rollback")
            rollback_deployment "$SERVICE"
            ;;
        "test")
            run_smoke_tests "$SERVICE" "http://localhost:8080"
            ;;
        "monitor")
            setup_monitoring "$SERVICE"
            ;;
        "help"|*)
            cat <<EOF
Progressive Deployment Management Script

Usage: $0 <command> [service] [environment]

Commands:
  status      Show current deployment status
  promote     Promote canary to stable
  rollback    Rollback failed deployment
  test        Run smoke tests
  monitor     Set up monitoring and alerts
  help        Show this help message

Services: web, api-gateway, graph-xai, prov-ledger, etc.
Environments: development, staging, production

Examples:
  $0 status web production          # Check web app deployment status
  $0 promote api-gateway staging    # Promote API gateway canary
  $0 rollback web production        # Rollback web app
  $0 test web                       # Run smoke tests
  $0 monitor api-gateway            # Set up monitoring

Supported Strategies:
  - Flagger (Istio-based canary deployments)
  - Argo Rollouts (Blue/Green and Canary)
  - Standard Kubernetes deployments

EOF
            ;;
    esac
}

main "$@"