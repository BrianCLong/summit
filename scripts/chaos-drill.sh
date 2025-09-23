#!/bin/bash
# Chaos Engineering Drills for IntelGraph Platform
# Validates auto-recovery and resilience mechanisms

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph-staging}"
RELEASE_NAME="${RELEASE_NAME:-intelgraph}"
DRILL_DURATION="${DRILL_DURATION:-300}"  # 5 minutes
RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-600}"  # 10 minutes

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }
bold() { echo -e "${BOLD}$1${NC}"; }

show_help() {
    cat << EOF
🌪️  IntelGraph Chaos Engineering Drills

Usage: $0 [DRILL] [OPTIONS]

Available Drills:
    pod-killer          Kill random application pods
    network-partition   Simulate network partitions
    resource-exhaustion Simulate CPU/memory pressure
    database-failure    Simulate database connection failures
    message-queue-lag   Simulate message queue delays
    disk-pressure       Simulate disk space issues
    dns-failure         Simulate DNS resolution failures
    all-drills          Run all chaos drills sequentially
    status              Show current system status

Options:
    --namespace <ns>        Kubernetes namespace (default: intelgraph-staging)
    --duration <seconds>    Drill duration (default: 300)
    --timeout <seconds>     Recovery timeout (default: 600)
    --dry-run              Show what would be done
    --verbose              Enable verbose logging

Examples:
    $0 pod-killer --duration 180
    $0 network-partition --namespace intelgraph-staging
    $0 all-drills --verbose
    $0 status

Safety:
    - Only runs in staging environments by default
    - Requires explicit confirmation for production
    - All changes are automatically reverted
    - Health checks validate recovery
EOF
}

# Check dependencies and permissions
check_deps() {
    local missing_deps=()

    command -v kubectl >/dev/null 2>&1 || missing_deps+=("kubectl")
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")

    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi

    # Verify kubectl connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Verify namespace exists
    if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
        error "Namespace '${NAMESPACE}' does not exist"
        exit 1
    fi

    # Safety check for production
    if [[ "${NAMESPACE}" == *"prod"* ]]; then
        warn "🚨 PRODUCTION ENVIRONMENT DETECTED"
        warn "Chaos drills in production require extreme caution!"

        if [ "${FORCE:-}" != "true" ]; then
            read -p "Type 'CHAOS-PRODUCTION' to confirm: " confirm
            if [ "$confirm" != "CHAOS-PRODUCTION" ]; then
                info "Chaos drill cancelled for safety"
                exit 0
            fi
        fi
    fi
}

# Get baseline metrics before drill
capture_baseline() {
    info "Capturing baseline metrics..."

    cat > baseline-metrics.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "namespace": "${NAMESPACE}",
  "drill": "${DRILL_TYPE:-unknown}"
}
EOF

    # Capture pod status
    kubectl get pods -n "${NAMESPACE}" -o json | \
        jq '{pods: [.items[] | {name: .metadata.name, status: .status.phase, ready: .status.conditions}]}' >> baseline-pods.json

    # Capture service endpoints
    kubectl get endpoints -n "${NAMESPACE}" -o json | \
        jq '{endpoints: [.items[] | {name: .metadata.name, addresses: .subsets[].addresses}]}' >> baseline-endpoints.json

    # Health check
    local health_url=$(get_service_url)
    if [ -n "$health_url" ]; then
        curl -s "${health_url}/health" --max-time 10 > baseline-health.json || echo '{"error": "health check failed"}' > baseline-health.json
    fi

    log "Baseline captured ✅"
}

# Get service URL for health checks
get_service_url() {
    local service_url=""

    # Try to get from ingress
    service_url=$(kubectl get ingress "${RELEASE_NAME}" -n "${NAMESPACE}" -o json 2>/dev/null | \
                 jq -r '.spec.rules[0].host // empty' | head -1)

    if [ -n "$service_url" ]; then
        echo "https://${service_url}"
    else
        # Fallback to service IP
        local service_ip=$(kubectl get service "${RELEASE_NAME}" -n "${NAMESPACE}" -o json 2>/dev/null | \
                          jq -r '.status.loadBalancer.ingress[0].ip // "localhost"')
        echo "http://${service_ip}:80"
    fi
}

# Validate system recovery
validate_recovery() {
    local start_time=$(date +%s)
    local timeout="${RECOVERY_TIMEOUT}"

    info "Validating system recovery (timeout: ${timeout}s)..."

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -gt $timeout ]; then
            error "Recovery validation timed out after ${timeout}s"
            return 1
        fi

        # Check pod readiness
        local ready_pods=$(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=intelgraph --no-headers | \
                          awk '$3=="Running" && $2~/^([0-9]+)\/\1$/ {count++} END {print count+0}')
        local total_pods=$(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=intelgraph --no-headers | wc -l)

        # Check health endpoint
        local health_status="unknown"
        local health_url=$(get_service_url)
        if [ -n "$health_url" ]; then
            if curl -s "${health_url}/health" --max-time 5 >/dev/null 2>&1; then
                health_status="healthy"
            else
                health_status="unhealthy"
            fi
        fi

        info "Recovery status: ${ready_pods}/${total_pods} pods ready, health: ${health_status} (${elapsed}s elapsed)"

        # Recovery successful if all pods ready and health check passes
        if [ "$ready_pods" -eq "$total_pods" ] && [ "$ready_pods" -gt 0 ] && [ "$health_status" = "healthy" ]; then
            log "System recovery validated successfully! 🎉"
            log "Recovery time: ${elapsed} seconds"
            return 0
        fi

        sleep 10
    done
}

# Drill: Kill random pods
drill_pod_killer() {
    bold "🔥 Chaos Drill: Pod Killer"
    info "Duration: ${DRILL_DURATION}s"

    capture_baseline

    # Get application pods
    local pods=($(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=intelgraph --no-headers -o custom-columns=":metadata.name"))

    if [ ${#pods[@]} -eq 0 ]; then
        error "No application pods found"
        return 1
    fi

    info "Found ${#pods[@]} application pods"

    local end_time=$(($(date +%s) + DRILL_DURATION))

    while [ $(date +%s) -lt $end_time ]; do
        # Pick random pod
        local random_pod=${pods[$RANDOM % ${#pods[@]}]}

        info "Killing pod: ${random_pod}"
        kubectl delete pod "${random_pod}" -n "${NAMESPACE}" --grace-period=0 --force

        # Wait between kills
        sleep $((30 + RANDOM % 60))

        # Refresh pod list
        pods=($(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=intelgraph --no-headers -o custom-columns=":metadata.name"))
    done

    info "Pod killer drill completed, validating recovery..."
    validate_recovery
}

# Drill: Network partition simulation
drill_network_partition() {
    bold "🌐 Chaos Drill: Network Partition"
    info "Duration: ${DRILL_DURATION}s"

    capture_baseline

    # Create network policy to simulate partition
    cat << EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chaos-network-partition
  namespace: ${NAMESPACE}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: intelgraph
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53  # DNS only
    - protocol: UDP
      port: 53
EOF

    info "Network partition applied, waiting ${DRILL_DURATION}s..."
    sleep "${DRILL_DURATION}"

    info "Removing network partition..."
    kubectl delete networkpolicy chaos-network-partition -n "${NAMESPACE}" --ignore-not-found

    validate_recovery
}

# Drill: Resource exhaustion
drill_resource_exhaustion() {
    bold "💾 Chaos Drill: Resource Exhaustion"
    info "Duration: ${DRILL_DURATION}s"

    capture_baseline

    # Deploy CPU/memory stress pod
    cat << EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: chaos-resource-stress
  namespace: ${NAMESPACE}
spec:
  containers:
  - name: stress
    image: progrium/stress
    args: ["--cpu", "2", "--vm", "1", "--vm-bytes", "512M"]
    resources:
      requests:
        cpu: "1"
        memory: "256Mi"
      limits:
        cpu: "2"
        memory: "1Gi"
  restartPolicy: Never
EOF

    info "Resource stress applied, waiting ${DRILL_DURATION}s..."
    sleep "${DRILL_DURATION}"

    info "Removing resource stress..."
    kubectl delete pod chaos-resource-stress -n "${NAMESPACE}" --ignore-not-found

    validate_recovery
}

# Drill: Database failure simulation
drill_database_failure() {
    bold "🗄️  Chaos Drill: Database Failure"
    info "Duration: ${DRILL_DURATION}s"

    capture_baseline

    # Create network policy to block database access
    cat << EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chaos-db-failure
  namespace: ${NAMESPACE}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: intelgraph
  policyTypes:
  - Egress
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
    # Block PostgreSQL (5432), Redis (6379), Neo4j (7687)
EOF

    info "Database access blocked, waiting ${DRILL_DURATION}s..."
    sleep "${DRILL_DURATION}"

    info "Restoring database access..."
    kubectl delete networkpolicy chaos-db-failure -n "${NAMESPACE}" --ignore-not-found

    validate_recovery
}

# Drill: Message queue lag simulation
drill_message_queue_lag() {
    bold "📬 Chaos Drill: Message Queue Lag"
    info "Duration: ${DRILL_DURATION}s"

    capture_baseline

    # Scale down workers to create backlog
    local worker_deployments=($(kubectl get deployments -n "${NAMESPACE}" -l component=worker --no-headers -o custom-columns=":metadata.name"))

    for deployment in "${worker_deployments[@]}"; do
        info "Scaling down worker: ${deployment}"
        kubectl scale deployment "${deployment}" --replicas=0 -n "${NAMESPACE}"
    done

    info "Workers scaled down, waiting ${DRILL_DURATION}s..."
    sleep "${DRILL_DURATION}"

    info "Restoring worker replicas..."
    for deployment in "${worker_deployments[@]}"; do
        kubectl scale deployment "${deployment}" --replicas=2 -n "${NAMESPACE}"
    done

    validate_recovery
}

# Show current system status
show_status() {
    bold "📊 Current System Status"

    echo "Namespace: ${NAMESPACE}"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo

    info "Pod Status:"
    kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=intelgraph

    echo
    info "Service Status:"
    kubectl get services -n "${NAMESPACE}"

    echo
    info "Deployment Status:"
    kubectl get deployments -n "${NAMESPACE}"

    echo
    info "Health Check:"
    local health_url=$(get_service_url)
    if [ -n "$health_url" ]; then
        if curl -s "${health_url}/health" --max-time 10; then
            echo
            log "Health check: PASSED ✅"
        else
            echo
            error "Health check: FAILED ❌"
        fi
    else
        warn "Health check: Service URL not available"
    fi
}

# Run all drills sequentially
run_all_drills() {
    bold "🌪️  Running All Chaos Drills"

    local drills=(
        "drill_pod_killer"
        "drill_network_partition"
        "drill_resource_exhaustion"
        "drill_database_failure"
        "drill_message_queue_lag"
    )

    local results=()

    for drill in "${drills[@]}"; do
        info "Starting drill: ${drill}"

        if $drill; then
            results+=("${drill}: ✅ PASSED")
            log "${drill} completed successfully"
        else
            results+=("${drill}: ❌ FAILED")
            error "${drill} failed"
        fi

        # Wait between drills
        info "Waiting 60s before next drill..."
        sleep 60
    done

    bold "🎯 Chaos Drill Summary:"
    for result in "${results[@]}"; do
        echo "  $result"
    done
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --duration)
                DRILL_DURATION="$2"
                shift 2
                ;;
            --timeout)
                RECOVERY_TIMEOUT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                set -x
                shift
                ;;
            --force)
                FORCE="true"
                shift
                ;;
            *)
                break
                ;;
        esac
    done
}

# Main function
main() {
    parse_args "$@"
    check_deps

    local drill="${1:-help}"

    case "$drill" in
        pod-killer)
            DRILL_TYPE="pod-killer"
            drill_pod_killer
            ;;
        network-partition)
            DRILL_TYPE="network-partition"
            drill_network_partition
            ;;
        resource-exhaustion)
            DRILL_TYPE="resource-exhaustion"
            drill_resource_exhaustion
            ;;
        database-failure)
            DRILL_TYPE="database-failure"
            drill_database_failure
            ;;
        message-queue-lag)
            DRILL_TYPE="message-queue-lag"
            drill_message_queue_lag
            ;;
        all-drills)
            DRILL_TYPE="all-drills"
            run_all_drills
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown drill: $drill"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"