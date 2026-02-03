#!/usr/bin/env bash
set -euo pipefail

# IntelGraph Production Canary Deployment Automation
# Intelligent canary deployment with SLO monitoring and auto-rollback

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Deployment configuration
readonly ENVIRONMENT="production"
readonly NAMESPACE="intelgraph-prod"
readonly VERSION="${VERSION:-v1.24.0}"
readonly CANARY_PERCENTAGE="${CANARY_PERCENTAGE:-10}"
readonly MONITORING_DURATION="${MONITORING_DURATION:-1800}" # 30 minutes
readonly SLO_EVALUATION_WINDOW="${SLO_EVALUATION_WINDOW:-300}" # 5 minutes

# SLO thresholds
readonly MAX_P95_LATENCY_MS=350
readonly MAX_ERROR_RATE=0.01
readonly MIN_SUCCESS_RATE=0.99
readonly MIN_THROUGHPUT_RPS=50

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_canary() { echo -e "${PURPLE}[CANARY]${NC} $*"; }

# Helper for floating point comparison using python
float_gt() {
    python3 -c "import sys; sys.exit(0 if float('$1') > float('$2') else 1)"
}

float_lt() {
    python3 -c "import sys; sys.exit(0 if float('$1') < float('$2') else 1)"
}

float_to_pct() {
    python3 -c "print(f'{float(\"$1\") * 100:.2f}')"
}

# Global variables for rollback
CANARY_DEPLOYED=false
ORIGINAL_REPLICAS=""
DEPLOYMENT_START_TIME=""

main() {
    log_canary "🚀 Starting IntelGraph production canary deployment..."
    log_canary "Version: $VERSION | Canary: $CANARY_PERCENTAGE% | Duration: ${MONITORING_DURATION}s"

    validate_prerequisites
    prepare_deployment
    deploy_canary
    monitor_slos
    promote_or_rollback

    log_success "✅ Production canary deployment sequence completed!"
}

validate_prerequisites() {
    log_info "🔍 Validating production deployment prerequisites..."

    # Check required tools
    local tools=("kubectl" "helm" "curl" "jq" "python3")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done

    # Validate production namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Production namespace not found: $NAMESPACE"
        exit 1
    fi

    # Check current deployment health
    if ! kubectl get deployment intelgraph -n "$NAMESPACE" &> /dev/null; then
        log_error "Production deployment 'intelgraph' not found"
        exit 1
    fi

    # Verify current deployment is healthy
    if ! kubectl rollout status deployment/intelgraph -n "$NAMESPACE" --timeout=60s; then
        log_error "Current production deployment is not healthy"
        exit 1
    fi

    # Check for existing canary
    if kubectl get deployment intelgraph-canary -n "$NAMESPACE" &> /dev/null; then
        log_error "Canary deployment already exists. Please promote or abort existing canary."
        exit 1
    fi

    # Validate image exists
    if ! docker manifest inspect "ghcr.io/${GITHUB_REPOSITORY:-companyos/repo}/server:$VERSION" &> /dev/null; then
        log_error "Container image not found: ghcr.io/${GITHUB_REPOSITORY:-companyos/repo}/server:$VERSION"
        exit 1
    fi

    log_success "Prerequisites validated"
}

prepare_deployment() {
    log_info "🔧 Preparing canary deployment..."

    # Record deployment start time
    DEPLOYMENT_START_TIME=$(date +%s)

    # Store original replica count for rollback
    ORIGINAL_REPLICAS=$(kubectl get deployment intelgraph -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    # Fallback if empty or not numeric
    if [[ -z "$ORIGINAL_REPLICAS" ]] || ! [[ "$ORIGINAL_REPLICAS" =~ ^[0-9]+$ ]]; then
        ORIGINAL_REPLICAS=3
    fi

    # Create canary configuration
    cat > "$PROJECT_ROOT/.canary-config.yaml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: canary-config
  namespace: $NAMESPACE
data:
  version: "$VERSION"
  percentage: "$CANARY_PERCENTAGE"
  startTime: "$DEPLOYMENT_START_TIME"
  sloThresholds: |
    maxP95LatencyMs: $MAX_P95_LATENCY_MS
    maxErrorRate: $MAX_ERROR_RATE
    minSuccessRate: $MIN_SUCCESS_RATE
    minThroughputRps: $MIN_THROUGHPUT_RPS
EOF

    kubectl apply -f "$PROJECT_ROOT/.canary-config.yaml"

    # Setup monitoring queries
    setup_monitoring_queries

    log_success "Deployment preparation completed"
}

setup_monitoring_queries() {
    log_info "📊 Setting up SLO monitoring queries..."

    # Create Prometheus queries for SLO monitoring
    cat > "$PROJECT_ROOT/.prometheus-queries.sh" << 'EOF'
#!/bin/bash
# Prometheus query functions for SLO monitoring

PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.intelgraph-prod.svc.cluster.local:9090}"

query_prometheus() {
    local query="$1"
    local encoded_query=$(echo "$query" | jq -sRr @uri)
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=${encoded_query}" | jq -r '.data.result[0].value[1] // "0"'
}

get_p95_latency() {
    query_prometheus 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="intelgraph-canary"}[5m])) by (le)) * 1000'
}

get_baseline_p95() {
    query_prometheus 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="intelgraph-stable"}[5m])) by (le)) * 1000'
}

get_error_rate() {
    query_prometheus 'sum(rate(http_requests_total{job="intelgraph-canary",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="intelgraph-canary"}[5m]))'
}

get_baseline_error() {
    query_prometheus 'sum(rate(http_requests_total{job="intelgraph-stable",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="intelgraph-stable"}[5m]))'
}

get_success_rate() {
    query_prometheus '1 - (sum(rate(http_requests_total{job="intelgraph-canary",status=~"[45].."}[5m])) / sum(rate(http_requests_total{job="intelgraph-canary"}[5m])))'
}

get_throughput() {
    query_prometheus 'sum(rate(http_requests_total{job="intelgraph-canary"}[5m]))'
}

get_pod_ready_count() {
    query_prometheus 'sum(kube_pod_status_ready{namespace="intelgraph-prod",pod=~"intelgraph-canary-.*"})'
}
EOF

    chmod +x "$PROJECT_ROOT/.prometheus-queries.sh"
}

deploy_canary() {
    log_canary "🚢 Deploying canary version $VERSION..."

    local total_replicas=$ORIGINAL_REPLICAS
    local canary_replicas=$(( (total_replicas * CANARY_PERCENTAGE) / 100 ))
    [ "$canary_replicas" -lt 1 ] && canary_replicas=1
    [ "$canary_replicas" -gt $((total_replicas / 2)) ] && canary_replicas=$((total_replicas / 2))

    log_canary "Deploying $canary_replicas canary replicas (${CANARY_PERCENTAGE}% of $total_replicas)"

    # Robust canary deployment using create deployment + apply
    kubectl create deployment intelgraph-canary \
        --image="ghcr.io/${GITHUB_REPOSITORY:-companyos/repo}/server:$VERSION" \
        --replicas=$canary_replicas \
        -n "$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Update canary deployment labels for monitoring
    kubectl patch deployment intelgraph-canary -n "$NAMESPACE" --type='merge' -p='{
      "metadata": {
        "labels": {
          "version": "'$VERSION'",
          "deployment-type": "canary"
        }
      },
      "spec": {
        "template": {
          "metadata": {
            "labels": {
              "version": "'$VERSION'",
              "deployment-type": "canary"
            }
          }
        }
      }
    }'

    # Wait for canary deployment to be ready
    log_canary "Waiting for canary deployment to become ready..."
    if ! kubectl rollout status deployment/intelgraph-canary -n "$NAMESPACE" --timeout=600s; then
        log_error "Canary deployment failed to become ready"
        rollback_canary
        exit 1
    fi

    # Configure traffic splitting
    configure_traffic_splitting

    CANARY_DEPLOYED=true
    log_success "Canary deployment successful - $CANARY_PERCENTAGE% traffic routing to $VERSION"
}

configure_traffic_splitting() {
    log_canary "⚖️ Configuring traffic splitting..."

    # Update service to include canary pods
    kubectl patch service intelgraph -n "$NAMESPACE" --type='merge' -p='{
      "spec": {
        "selector": {}
      }
    }'

    if kubectl get crd virtualservices.networking.istio.io &> /dev/null; then
        log_canary "Configuring Istio traffic splitting..."
        cat > "$PROJECT_ROOT/.traffic-split.yaml" << EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: intelgraph-canary
  namespace: $NAMESPACE
spec:
  hosts:
  - intelgraph
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: intelgraph
        subset: canary
  - route:
    - destination:
        host: intelgraph
        subset: stable
      weight: $((100 - CANARY_PERCENTAGE))
    - destination:
        host: intelgraph
        subset: canary
      weight: $CANARY_PERCENTAGE
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: intelgraph-canary
  namespace: $NAMESPACE
spec:
  host: intelgraph
  subsets:
  - name: stable
    labels:
      deployment-type: stable
  - name: canary
    labels:
      deployment-type: canary
EOF
        kubectl apply -f "$PROJECT_ROOT/.traffic-split.yaml"
    else
        log_warning "Istio not available - using simple label-based routing"
        kubectl label pods -l app=intelgraph,deployment-type!=canary deployment-type=stable -n "$NAMESPACE" --overwrite
    fi
}

monitor_slos() {
    log_canary "📊 Starting SLO monitoring for $((MONITORING_DURATION / 60)) minutes..."

    local monitoring_start=$(date +%s)
    local check_interval=30
    local violation_count=0
    local max_violations=3

    source "$PROJECT_ROOT/.prometheus-queries.sh"

    while [ $(($(date +%s) - monitoring_start)) -lt $MONITORING_DURATION ]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - monitoring_start))

        # Shorten check interval for simulation if needed
        [ "$MONITORING_DURATION" -lt 60 ] && check_interval=2

        log_canary "⏱️  Monitoring progress: ${elapsed}s elapsed"

        # Wait for sufficient metrics before evaluation (skip first 2 minutes unless duration is short)
        if [ $MONITORING_DURATION -gt 120 ] && [ $elapsed -lt 120 ]; then
            log_canary "Warming up metrics collection..."
            sleep $check_interval
            continue
        fi

        # Collect SLO metrics
        local p95_latency=$(get_p95_latency 2>/dev/null || echo "0")
        local error_rate=$(get_error_rate 2>/dev/null || echo "0")
        local baseline_p95=$(get_baseline_p95 2>/dev/null || echo "0")
        local baseline_error=$(get_baseline_error 2>/dev/null || echo "0")
        local ready_pods=$(get_pod_ready_count 2>/dev/null || echo "0")

        # Run Statistical ACA Analysis
        log_canary "🧠 Running Statistical ACA Analysis..."
        ACA_RESULT=$(npx ts-node "$PROJECT_ROOT/scripts/mastery-aca-engine.ts" \
            --canary-p95 "$p95_latency" \
            --baseline-p95 "$baseline_p95" \
            --canary-error "$error_rate" \
            --baseline-error "$baseline_error") || {
            log_error "🚨 ACA engine detected critical risk - triggering automatic rollback"
            echo "$ACA_RESULT" | jq .
            rollback_canary
            exit 1
        }

        # Log current metrics and ACA decision
        echo "$ACA_RESULT" | jq -r '.summary' | while read line; do log_canary "  - $line"; done
        log_canary "  Ready Pods: ${ready_pods}"

        # Check pod health
        if [ "$ready_pods" -eq 0 ]; then
            log_error "🚨 No canary pods ready - triggering automatic rollback"
            rollback_canary
            exit 1
        fi

        sleep $check_interval
    done

    log_success "🎉 SLO monitoring completed successfully - no violations detected"
}

promote_or_rollback() {
    log_canary "🎯 Making promotion decision..."

    # Final health check
    if ! kubectl rollout status deployment/intelgraph-canary -n "$NAMESPACE" --timeout=60s; then
        log_error "Final canary health check failed"
        rollback_canary
        exit 1
    fi

    # Final SLO verification
    source "$PROJECT_ROOT/.prometheus-queries.sh"
    local final_p95=$(get_p95_latency 2>/dev/null || echo "0")
    local final_error_rate=$(get_error_rate 2>/dev/null || echo "0")

    local promotion_criteria_met=true

    if float_gt "$final_p95" "$MAX_P95_LATENCY_MS"; then
        log_warning "Final P95 latency check failed: ${final_p95}ms"
        promotion_criteria_met=false
    fi

    if float_gt "$final_error_rate" "$MAX_ERROR_RATE"; then
        log_warning "Final error rate check failed: ${final_error_rate}"
        promotion_criteria_met=false
    fi

    if [ "$promotion_criteria_met" = true ]; then
        promote_canary
    else
        log_error "Promotion criteria not met - initiating rollback"
        rollback_canary
        exit 1
    fi
}

promote_canary() {
    log_canary "🚀 Promoting canary to production..."

    # Update main deployment to canary version
    kubectl set image deployment/intelgraph -n "$NAMESPACE" \
        server="ghcr.io/${GITHUB_REPOSITORY:-companyos/repo}/server:$VERSION"

    # Wait for main deployment rollout
    kubectl rollout status deployment/intelgraph -n "$NAMESPACE" --timeout=600s

    # Remove canary deployment
    kubectl delete deployment intelgraph-canary -n "$NAMESPACE"

    # Clean up traffic splitting configuration
    if kubectl get virtualservice intelgraph-canary -n "$NAMESPACE" &> /dev/null; then
        kubectl delete virtualservice intelgraph-canary -n "$NAMESPACE"
        kubectl delete destinationrule intelgraph-canary -n "$NAMESPACE"
    fi

    # Update deployment metadata
    kubectl patch deployment intelgraph -n "$NAMESPACE" --type='merge' -p='{
      "metadata": {
        "labels": {
          "version": "'$VERSION'",
          "deployment-type": "stable"
        },
        "annotations": {
          "deployment.kubernetes.io/revision": "'$(kubectl get deployment intelgraph -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' | xargs expr 1 +)'"
        }
      }
    }'

    # Record successful deployment
    record_deployment_success

    log_success "🎉 Canary successfully promoted to production!"
    log_success "🔗 Version $VERSION is now serving 100% of production traffic"
}

rollback_canary() {
    log_error "🔄 Rolling back canary deployment..."

    if [ "$CANARY_DEPLOYED" = true ]; then
        # Remove canary deployment
        kubectl delete deployment intelgraph-canary -n "$NAMESPACE" --ignore-not-found=true

        # Clean up traffic splitting
        kubectl delete virtualservice intelgraph-canary -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete destinationrule intelgraph-canary -n "$NAMESPACE" --ignore-not-found=true

        # Restore original service configuration
        kubectl patch service intelgraph -n "$NAMESPACE" --type='merge' -p='{
          "spec": {
            "selector": {
              "app": "intelgraph"
            }
          }
        }'
    fi

    # Record rollback event
    record_deployment_failure

    log_error "❌ Canary deployment rolled back - production remains on previous version"
}

record_deployment_success() {
    local end_time=$(date +%s)
    local duration=$((end_time - DEPLOYMENT_START_TIME))

    kubectl create event canary-promotion-success \
        --namespace="$NAMESPACE" \
        --reason="CanaryPromotionSuccess" \
        --message="Canary version $VERSION successfully promoted after ${duration}s monitoring" \
        --type="Normal" || true

    # Create deployment record
    cat > "$PROJECT_ROOT/deployment-success-$(date +%Y%m%d-%H%M%S).json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$VERSION",
  "environment": "$ENVIRONMENT",
  "deployment_type": "canary",
  "status": "success",
  "duration_seconds": $duration,
  "canary_percentage": $CANARY_PERCENTAGE,
  "monitoring_duration": $MONITORING_DURATION,
  "slo_compliance": true,
  "promotion_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
}

record_deployment_failure() {
    local end_time=$(date +%s)
    local duration=$((end_time - DEPLOYMENT_START_TIME))

    kubectl create event canary-rollback \
        --namespace="$NAMESPACE" \
        --reason="CanaryRollback" \
        --message="Canary version $VERSION rolled back after ${duration}s due to SLO violations" \
        --type="Warning" || true

    # Create failure record
    cat > "$PROJECT_ROOT/deployment-failure-$(date +%Y%m%d-%H%M%S).json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$VERSION",
  "environment": "$ENVIRONMENT",
  "deployment_type": "canary",
  "status": "failure",
  "duration_seconds": $duration,
  "canary_percentage": $CANARY_PERCENTAGE,
  "monitoring_duration": $MONITORING_DURATION,
  "slo_compliance": false,
  "rollback_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
}

# Cleanup function
cleanup() {
    log_info "🧹 Cleaning up temporary files..."
    rm -f "$PROJECT_ROOT/.canary-config.yaml" \
          "$PROJECT_ROOT/.prometheus-queries.sh" \
          "$PROJECT_ROOT/.traffic-split.yaml" 2>/dev/null || true
}

# Signal handlers for graceful shutdown
trap 'log_error "Deployment interrupted - rolling back..."; rollback_canary; cleanup; exit 1' INT TERM
trap 'cleanup' EXIT

# Execute main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
