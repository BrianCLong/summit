#!/bin/bash

# Maestro Conductor vNext - Automated Canary Deployment Script
# Version: 1.0
# Usage: ./canary-deploy.sh [phase] [version] [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE_PREFIX="maestro-conductor"
CHART_PATH="$PROJECT_ROOT/charts/maestro-conductor"
MONITORING_TIMEOUT=300
VALIDATION_RETRIES=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Help function
show_help() {
    cat << EOF
Maestro Conductor vNext Canary Deployment Script

USAGE:
    ./canary-deploy.sh PHASE VERSION [OPTIONS]

PHASES:
    phase1    Deploy 1% canary (internal validation)
    phase2    Deploy 5% canary (early adopters)
    phase3    Deploy 25% canary (expanded rollout)
    rollout   Deploy 100% (full production)

OPTIONS:
    --dry-run             Show what would be deployed without executing
    --skip-validation     Skip post-deployment validation
    --force               Force deployment even if checks fail
    --region REGION       Deploy to specific region (default: all)
    --timeout SECONDS     Deployment timeout (default: 600)
    --notify WEBHOOK      Slack webhook for notifications

EXAMPLES:
    ./canary-deploy.sh phase1 v1.2.0-rc.1
    ./canary-deploy.sh phase2 v1.2.0-rc.1 --region us-east-1
    ./canary-deploy.sh rollout v1.2.0 --notify https://hooks.slack.com/...

EOF
}

# Parse command line arguments
PHASE=""
VERSION=""
DRY_RUN=false
SKIP_VALIDATION=false
FORCE_DEPLOY=false
TARGET_REGION="all"
TIMEOUT=600
SLACK_WEBHOOK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        phase1|phase2|phase3|rollout)
            PHASE="$1"
            shift
            ;;
        v*.*.*)
            VERSION="$1"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --region)
            TARGET_REGION="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --notify)
            SLACK_WEBHOOK="$2"
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
if [[ -z "$PHASE" || -z "$VERSION" ]]; then
    log_error "Phase and version are required"
    show_help
    exit 1
fi

# Phase configuration
declare -A PHASE_CONFIG
PHASE_CONFIG[phase1]="weight=1,replicas=2,features=core"
PHASE_CONFIG[phase2]="weight=5,replicas=5,features=standard"
PHASE_CONFIG[phase3]="weight=25,replicas=15,features=full"
PHASE_CONFIG[rollout]="weight=100,replicas=50,features=full"

# Extract phase configuration
IFS=',' read -ra CONFIG_PARTS <<< "${PHASE_CONFIG[$PHASE]}"
CANARY_WEIGHT=""
REPLICA_COUNT=""
FEATURE_SET=""

for part in "${CONFIG_PARTS[@]}"; do
    IFS='=' read -ra KV <<< "$part"
    case "${KV[0]}" in
        weight) CANARY_WEIGHT="${KV[1]}" ;;
        replicas) REPLICA_COUNT="${KV[1]}" ;;
        features) FEATURE_SET="${KV[1]}" ;;
    esac
done

# Slack notification function
send_notification() {
    local message="$1"
    local color="${2:-good}"

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
    fi
}

# Pre-flight checks
run_preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check kubectl connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check Helm
    if ! command -v helm >/dev/null 2>&1; then
        log_error "Helm is not installed or not in PATH"
        exit 1
    fi

    # Check if namespace exists
    local namespace="${NAMESPACE_PREFIX}-canary"
    if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
        log_info "Creating namespace: $namespace"
        kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    fi

    # Check if chart exists
    if [[ ! -f "$CHART_PATH/Chart.yaml" ]]; then
        log_error "Helm chart not found at: $CHART_PATH"
        exit 1
    fi

    # Check if image exists
    log_info "Validating image: maestro-conductor:$VERSION"
    if ! docker manifest inspect "maestro-conductor:$VERSION" >/dev/null 2>&1; then
        log_warning "Cannot validate image existence - proceeding anyway"
    fi

    log_success "Pre-flight checks completed"
}

# Deploy canary
deploy_canary() {
    local namespace="${NAMESPACE_PREFIX}-canary"
    local release_name="maestro-conductor-${PHASE}"

    log_info "Deploying $PHASE with $CANARY_WEIGHT% traffic weight"

    # Prepare Helm values
    cat > "/tmp/canary-values-${PHASE}.yaml" << EOF
global:
  environment: production-canary
  version: "${VERSION}"

canary:
  enabled: true
  weight: ${CANARY_WEIGHT}
  phase: "${PHASE}"

image:
  tag: "${VERSION}"
  pullPolicy: Always

replicaCount: ${REPLICA_COUNT}

features:
  set: "${FEATURE_SET}"
  safetyGuardrails: true
  enhancedMonitoring: true
  experimentalML: $([[ "$FEATURE_SET" == "full" ]] && echo "true" || echo "false")

monitoring:
  prometheus:
    enabled: true
    scrapeInterval: 15s
  jaeger:
    enabled: true
    samplingRate: 1.0
  grafana:
    enhanced: true

resources:
  orchestrator:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

  safetyGuardian:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: ${REPLICA_COUNT}
  maxReplicas: $((REPLICA_COUNT * 3))
  targetCPUUtilizationPercentage: 70

persistence:
  eventStore:
    size: 100Gi
    storageClass: fast-ssd

  provenance:
    size: 50Gi
    storageClass: fast-ssd

networkPolicy:
  enabled: true
  allowedCIDRs:
    - 10.0.0.0/8
    - 172.16.0.0/12

security:
  podSecurityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000

  containerSecurityContext:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop:
        - ALL
EOF

    # Deploy with Helm
    local helm_cmd="helm upgrade --install $release_name $CHART_PATH"
    helm_cmd+=" --namespace $namespace"
    helm_cmd+=" --values /tmp/canary-values-${PHASE}.yaml"
    helm_cmd+=" --timeout ${TIMEOUT}s"
    helm_cmd+=" --wait"
    helm_cmd+=" --atomic"

    if [[ "$DRY_RUN" == "true" ]]; then
        helm_cmd+=" --dry-run"
        log_info "DRY RUN: $helm_cmd"
    fi

    log_info "Executing: $helm_cmd"
    eval "$helm_cmd"

    if [[ "$DRY_RUN" == "false" ]]; then
        log_success "Deployment completed successfully"
        send_notification "🚀 Maestro Conductor $PHASE deployed successfully (v$VERSION, ${CANARY_WEIGHT}%)"
    fi
}

# Validate deployment
validate_deployment() {
    if [[ "$SKIP_VALIDATION" == "true" || "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    local namespace="${NAMESPACE_PREFIX}-canary"
    local release_name="maestro-conductor-${PHASE}"

    log_info "Validating deployment..."

    # Wait for pods to be ready
    log_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod \
        -l "app.kubernetes.io/instance=$release_name" \
        -n "$namespace" \
        --timeout=300s

    # Check service endpoints
    log_info "Validating service endpoints..."
    local service_ip
    service_ip=$(kubectl get service "${release_name}-orchestrator" -n "$namespace" -o jsonpath='{.spec.clusterIP}')

    # Health check
    local health_check_url="http://${service_ip}:8080/health"
    local retries=0

    while [[ $retries -lt $VALIDATION_RETRIES ]]; do
        if kubectl run temp-health-check --rm -i --restart=Never --image=curlimages/curl -- \
           curl -f -s "$health_check_url" >/dev/null 2>&1; then
            log_success "Health check passed"
            break
        fi

        ((retries++))
        log_warning "Health check failed, attempt $retries/$VALIDATION_RETRIES"
        sleep 10
    done

    if [[ $retries -eq $VALIDATION_RETRIES ]]; then
        log_error "Health check validation failed after $VALIDATION_RETRIES attempts"
        return 1
    fi

    # Validate metrics endpoint
    log_info "Validating metrics endpoint..."
    local metrics_url="http://${service_ip}:8080/metrics"
    if kubectl run temp-metrics-check --rm -i --restart=Never --image=curlimages/curl -- \
       curl -f -s "$metrics_url" | grep -q "maestro_workflows_total"; then
        log_success "Metrics endpoint validation passed"
    else
        log_warning "Metrics endpoint validation failed"
    fi

    # Traffic split validation
    if [[ "$CANARY_WEIGHT" != "100" ]]; then
        log_info "Validating traffic split configuration..."
        local istio_vs="${release_name}-virtual-service"
        if kubectl get virtualservice "$istio_vs" -n "$namespace" >/dev/null 2>&1; then
            local actual_weight
            actual_weight=$(kubectl get virtualservice "$istio_vs" -n "$namespace" -o jsonpath='{.spec.http[0].route[0].weight}')
            if [[ "$actual_weight" == "$CANARY_WEIGHT" ]]; then
                log_success "Traffic split validation passed: ${actual_weight}%"
            else
                log_error "Traffic split mismatch: expected ${CANARY_WEIGHT}%, got ${actual_weight}%"
                return 1
            fi
        fi
    fi

    log_success "Deployment validation completed"
}

# Monitor canary metrics
monitor_canary() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    log_info "Starting canary monitoring (${MONITORING_TIMEOUT}s)..."

    local namespace="${NAMESPACE_PREFIX}-canary"
    local start_time
    start_time=$(date +%s)
    local end_time=$((start_time + MONITORING_TIMEOUT))

    while [[ $(date +%s) -lt $end_time ]]; do
        # Check pod status
        local failed_pods
        failed_pods=$(kubectl get pods -n "$namespace" -l "canary=true" \
            --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)

        if [[ $failed_pods -gt 0 ]]; then
            log_error "$failed_pods pods are not running"
            send_notification "⚠️ Maestro Conductor $PHASE: $failed_pods pods failed" "warning"
            return 1
        fi

        # Check basic metrics
        local cpu_usage
        cpu_usage=$(kubectl top pods -n "$namespace" -l "canary=true" --no-headers 2>/dev/null | \
            awk '{sum+=$2} END {print (NR>0) ? sum/NR : 0}' | sed 's/m//')

        if [[ ${cpu_usage:-0} -gt 1500 ]]; then
            log_warning "High CPU usage detected: ${cpu_usage}m"
        fi

        sleep 30
    done

    log_success "Initial monitoring period completed successfully"
}

# Main deployment flow
main() {
    log_info "Starting Maestro Conductor vNext canary deployment"
    log_info "Phase: $PHASE | Version: $VERSION | Weight: ${CANARY_WEIGHT}%"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN MODE - No actual deployment will occur"
    fi

    # Pre-flight checks
    run_preflight_checks

    # Deploy
    if deploy_canary; then
        log_success "Deployment phase completed"
    else
        log_error "Deployment failed"
        send_notification "❌ Maestro Conductor $PHASE deployment failed (v$VERSION)" "danger"
        exit 1
    fi

    # Validate
    if validate_deployment; then
        log_success "Validation phase completed"
    else
        log_error "Validation failed"
        send_notification "❌ Maestro Conductor $PHASE validation failed (v$VERSION)" "danger"
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            log_error "Use --force to override validation failures"
            exit 1
        fi
    fi

    # Monitor
    if monitor_canary; then
        log_success "Monitoring phase completed"
    else
        log_error "Monitoring detected issues"
        send_notification "⚠️ Maestro Conductor $PHASE monitoring detected issues (v$VERSION)" "warning"
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            exit 1
        fi
    fi

    # Success notification
    local duration_hours
    case "$PHASE" in
        phase1) duration_hours="24-48" ;;
        phase2) duration_hours="72" ;;
        phase3) duration_hours="96" ;;
        rollout) duration_hours="168" ;;
    esac

    send_notification "✅ Maestro Conductor $PHASE successfully deployed and validated (v$VERSION, ${CANARY_WEIGHT}%). Monitor for ${duration_hours} hours before next phase."

    log_success "Canary deployment completed successfully!"
    log_info "Monitor the deployment for the recommended duration before proceeding to the next phase"

    # Cleanup temporary files
    rm -f "/tmp/canary-values-${PHASE}.yaml"
}

# Trap for cleanup
trap 'rm -f /tmp/canary-values-*.yaml' EXIT

# Execute main function
main "$@"