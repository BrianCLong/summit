#!/bin/bash

# Maestro Conductor vNext - Canary Traffic Management Script
# Version: 1.0
# Usage: ./traffic-manager.sh [command] [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ISTIO_NAMESPACE="istio-system"
DEFAULT_NAMESPACE="maestro-conductor-canary"

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
Maestro Conductor vNext Traffic Management Script

USAGE:
    ./traffic-manager.sh COMMAND [OPTIONS]

COMMANDS:
    split WEIGHT        Set traffic split (0-100% to canary)
    status              Show current traffic split status
    ramp-up STEP        Gradually increase canary traffic by STEP%
    ramp-down STEP      Gradually decrease canary traffic by STEP%
    circuit-breaker     Enable/disable circuit breaker
    failover            Immediate failover to stable
    mirror              Enable traffic mirroring to canary
    unmirror            Disable traffic mirroring
    ab-test             Enable A/B testing configuration
    validate            Validate traffic routing configuration

OPTIONS:
    --namespace NS      Target namespace (default: maestro-conductor-canary)
    --timeout SECONDS   Operation timeout (default: 60)
    --dry-run           Show what would be done without executing
    --force             Force operation even if validations fail
    --notify WEBHOOK    Slack webhook for notifications

EXAMPLES:
    ./traffic-manager.sh split 25 --namespace maestro-conductor-canary
    ./traffic-manager.sh ramp-up 5 --notify https://hooks.slack.com/...
    ./traffic-manager.sh failover --force
    ./traffic-manager.sh mirror --dry-run

TRAFFIC SPLIT PHASES:
    Phase 1: 1%   (Internal validation)
    Phase 2: 5%   (Early adopters)
    Phase 3: 25%  (Expanded rollout)
    Rollout: 100% (Full production)

EOF
}

# Parse command line arguments
COMMAND=""
WEIGHT=""
STEP=""
NAMESPACE="$DEFAULT_NAMESPACE"
TIMEOUT=60
DRY_RUN=false
FORCE=false
SLACK_WEBHOOK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        split|status|ramp-up|ramp-down|circuit-breaker|failover|mirror|unmirror|ab-test|validate)
            COMMAND="$1"
            shift
            if [[ "$COMMAND" == "split" && $# -gt 0 && "$1" =~ ^[0-9]+$ ]]; then
                WEIGHT="$1"
                shift
            elif [[ ("$COMMAND" == "ramp-up" || "$COMMAND" == "ramp-down") && $# -gt 0 && "$1" =~ ^[0-9]+$ ]]; then
                STEP="$1"
                shift
            fi
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
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
if [[ -z "$COMMAND" ]]; then
    log_error "Command is required"
    show_help
    exit 1
fi

# Slack notification function
send_notification() {
    local message="$1"
    local color="${2:-good}"

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local payload="{
            \"text\": \"🚦 Traffic Management Update\",
            \"attachments\": [{
                \"color\": \"$color\",
                \"fields\": [
                    {\"title\": \"Action\", \"value\": \"$COMMAND\", \"short\": true},
                    {\"title\": \"Namespace\", \"value\": \"$NAMESPACE\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"$message\", \"short\": false}
                ],
                \"ts\": $(date +%s)
            }]
        }"

        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    # Check cluster connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi

    # Check Istio installation
    if ! kubectl get namespace "$ISTIO_NAMESPACE" >/dev/null 2>&1; then
        log_warning "Istio namespace not found - some features may not work"
    fi

    log_success "Prerequisites check completed"
}

# Get current traffic split
get_current_split() {
    local virtual_service="maestro-conductor-vs"

    if ! kubectl get virtualservice "$virtual_service" -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "0"
        return
    fi

    local canary_weight
    canary_weight=$(kubectl get virtualservice "$virtual_service" -n "$NAMESPACE" \
        -o jsonpath='{.spec.http[0].route[?(@.destination.subset=="canary")].weight}' 2>/dev/null || echo "0")

    echo "${canary_weight:-0}"
}

# Get current stable weight
get_stable_weight() {
    local virtual_service="maestro-conductor-vs"

    if ! kubectl get virtualservice "$virtual_service" -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "100"
        return
    fi

    local stable_weight
    stable_weight=$(kubectl get virtualservice "$virtual_service" -n "$NAMESPACE" \
        -o jsonpath='{.spec.http[0].route[?(@.destination.subset=="stable")].weight}' 2>/dev/null || echo "100")

    echo "${stable_weight:-100}"
}

# Create or update virtual service
update_virtual_service() {
    local canary_weight="$1"
    local stable_weight="$2"
    local virtual_service="maestro-conductor-vs"

    log_info "Updating traffic split: Canary=${canary_weight}%, Stable=${stable_weight}%"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would update VirtualService with canary=${canary_weight}%, stable=${stable_weight}%"
        return 0
    fi

    # Create VirtualService YAML
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ${virtual_service}
  namespace: ${NAMESPACE}
  labels:
    app: maestro-conductor
    component: traffic-management
spec:
  hosts:
  - maestro-conductor.${NAMESPACE}.svc.cluster.local
  - api.maestro-conductor.com
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: maestro-conductor.${NAMESPACE}.svc.cluster.local
        subset: canary
      weight: 100
  - match:
    - uri:
        prefix: "/api/v1/health"
    route:
    - destination:
        host: maestro-conductor.${NAMESPACE}.svc.cluster.local
        subset: stable
      weight: 100
  - route:
    - destination:
        host: maestro-conductor.${NAMESPACE}.svc.cluster.local
        subset: canary
      weight: ${canary_weight}
    - destination:
        host: maestro-conductor.${NAMESPACE}.svc.cluster.local
        subset: stable
      weight: ${stable_weight}
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
    fault:
      delay:
        percentage:
          value: 0.1
        fixedDelay: 5s
EOF

    # Verify the update
    sleep 2
    local actual_canary_weight
    actual_canary_weight=$(get_current_split)

    if [[ "$actual_canary_weight" == "$canary_weight" ]]; then
        log_success "Traffic split updated successfully"
        send_notification "Traffic split updated: Canary=${canary_weight}%, Stable=${stable_weight}%"
    else
        log_error "Traffic split update verification failed"
        return 1
    fi
}

# Create destination rule
create_destination_rule() {
    local destination_rule="maestro-conductor-dr"

    if kubectl get destinationrule "$destination_rule" -n "$NAMESPACE" >/dev/null 2>&1; then
        log_info "DestinationRule already exists"
        return 0
    fi

    log_info "Creating DestinationRule for traffic management"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would create DestinationRule"
        return 0
    fi

    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ${destination_rule}
  namespace: ${NAMESPACE}
  labels:
    app: maestro-conductor
    component: traffic-management
spec:
  host: maestro-conductor.${NAMESPACE}.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        maxRequestsPerConnection: 20
    loadBalancer:
      simple: LEAST_CONN
    outlierDetection:
      consecutiveErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
  - name: stable
    labels:
      version: stable
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 200
  - name: canary
    labels:
      version: canary
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 50
      outlierDetection:
        consecutiveErrors: 2
        interval: 15s
        baseEjectionTime: 15s
EOF

    log_success "DestinationRule created successfully"
}

# Traffic split command
cmd_split() {
    if [[ -z "$WEIGHT" ]]; then
        log_error "Weight parameter is required for split command"
        exit 1
    fi

    if [[ ! "$WEIGHT" =~ ^[0-9]+$ ]] || [[ $WEIGHT -gt 100 ]]; then
        log_error "Weight must be a number between 0 and 100"
        exit 1
    fi

    local stable_weight=$((100 - WEIGHT))

    log_info "Setting traffic split to ${WEIGHT}% canary, ${stable_weight}% stable"

    # Create destination rule if needed
    create_destination_rule

    # Update virtual service
    update_virtual_service "$WEIGHT" "$stable_weight"

    # Validate the split
    if [[ "$DRY_RUN" != "true" ]]; then
        sleep 5
        cmd_validate
    fi
}

# Status command
cmd_status() {
    log_info "Checking current traffic split status..."

    local canary_weight stable_weight
    canary_weight=$(get_current_split)
    stable_weight=$(get_stable_weight)

    echo "==============================================="
    echo "Traffic Split Status"
    echo "==============================================="
    echo "Namespace: $NAMESPACE"
    echo "Canary Weight: ${canary_weight}%"
    echo "Stable Weight: ${stable_weight}%"
    echo "Last Updated: $(kubectl get virtualservice maestro-conductor-vs -n "$NAMESPACE" -o jsonpath='{.metadata.resourceVersion}' 2>/dev/null || echo 'N/A')"

    # Check if circuit breaker is enabled
    local circuit_breaker_status="Disabled"
    if kubectl get destinationrule maestro-conductor-dr -n "$NAMESPACE" -o jsonpath='{.spec.trafficPolicy.outlierDetection}' 2>/dev/null | grep -q "consecutiveErrors"; then
        circuit_breaker_status="Enabled"
    fi
    echo "Circuit Breaker: $circuit_breaker_status"

    # Check for traffic mirroring
    local mirror_status="Disabled"
    if kubectl get virtualservice maestro-conductor-vs -n "$NAMESPACE" -o jsonpath='{.spec.http[0].mirror}' 2>/dev/null | grep -q "host"; then
        mirror_status="Enabled"
    fi
    echo "Traffic Mirroring: $mirror_status"

    echo "==============================================="

    # Determine phase based on weight
    local phase="Unknown"
    case "$canary_weight" in
        0) phase="Pre-deployment" ;;
        1) phase="Phase 1 (Internal)" ;;
        5) phase="Phase 2 (Early Adopters)" ;;
        25) phase="Phase 3 (Expanded)" ;;
        100) phase="Full Rollout" ;;
        *) phase="Custom (${canary_weight}%)" ;;
    esac

    echo "Current Phase: $phase"
    echo "==============================================="
}

# Ramp up command
cmd_ramp_up() {
    if [[ -z "$STEP" ]]; then
        log_error "Step parameter is required for ramp-up command"
        exit 1
    fi

    local current_weight
    current_weight=$(get_current_split)
    local new_weight=$((current_weight + STEP))

    if [[ $new_weight -gt 100 ]]; then
        new_weight=100
    fi

    log_info "Ramping up traffic from ${current_weight}% to ${new_weight}%"

    WEIGHT="$new_weight"
    cmd_split
}

# Ramp down command
cmd_ramp_down() {
    if [[ -z "$STEP" ]]; then
        log_error "Step parameter is required for ramp-down command"
        exit 1
    fi

    local current_weight
    current_weight=$(get_current_split)
    local new_weight=$((current_weight - STEP))

    if [[ $new_weight -lt 0 ]]; then
        new_weight=0
    fi

    log_info "Ramping down traffic from ${current_weight}% to ${new_weight}%"

    WEIGHT="$new_weight"
    cmd_split
}

# Circuit breaker command
cmd_circuit_breaker() {
    log_info "Managing circuit breaker configuration..."

    local destination_rule="maestro-conductor-dr"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would update circuit breaker configuration"
        return 0
    fi

    # Check current status
    local current_config
    current_config=$(kubectl get destinationrule "$destination_rule" -n "$NAMESPACE" -o jsonpath='{.spec.trafficPolicy.outlierDetection}' 2>/dev/null || echo "{}")

    if [[ "$current_config" == "{}" ]]; then
        # Enable circuit breaker
        kubectl patch destinationrule "$destination_rule" -n "$NAMESPACE" --type='merge' -p='
{
    "spec": {
        "trafficPolicy": {
            "outlierDetection": {
                "consecutiveErrors": 3,
                "interval": "30s",
                "baseEjectionTime": "30s",
                "maxEjectionPercent": 50
            }
        }
    }
}'
        log_success "Circuit breaker enabled"
        send_notification "Circuit breaker enabled"
    else
        # Disable circuit breaker
        kubectl patch destinationrule "$destination_rule" -n "$NAMESPACE" --type='json' -p='[
            {"op": "remove", "path": "/spec/trafficPolicy/outlierDetection"}
        ]'
        log_success "Circuit breaker disabled"
        send_notification "Circuit breaker disabled"
    fi
}

# Failover command
cmd_failover() {
    log_critical "Initiating immediate failover to stable deployment"

    if [[ "$FORCE" != "true" && "$DRY_RUN" != "true" ]]; then
        echo -n "Are you sure you want to failover immediately? [y/N]: "
        read -r confirmation
        if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
            log_info "Failover cancelled"
            return 0
        fi
    fi

    # Set traffic to 0% canary, 100% stable
    WEIGHT=0
    cmd_split

    # Send critical notification
    send_notification "EMERGENCY FAILOVER: All traffic routed to stable deployment" "danger"

    log_success "Failover completed - all traffic routed to stable deployment"
}

# Mirror command
cmd_mirror() {
    log_info "Enabling traffic mirroring to canary deployment..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would enable traffic mirroring"
        return 0
    fi

    kubectl patch virtualservice maestro-conductor-vs -n "$NAMESPACE" --type='merge' -p='
{
    "spec": {
        "http": [{
            "route": [{
                "destination": {
                    "host": "maestro-conductor.'$NAMESPACE'.svc.cluster.local",
                    "subset": "stable"
                },
                "weight": 100
            }],
            "mirror": {
                "host": "maestro-conductor.'$NAMESPACE'.svc.cluster.local",
                "subset": "canary"
            },
            "mirrorPercentage": {
                "value": 10.0
            }
        }]
    }
}'

    log_success "Traffic mirroring enabled (10% of traffic mirrored to canary)"
    send_notification "Traffic mirroring enabled - 10% shadow traffic to canary"
}

# Unmirror command
cmd_unmirror() {
    log_info "Disabling traffic mirroring..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would disable traffic mirroring"
        return 0
    fi

    kubectl patch virtualservice maestro-conductor-vs -n "$NAMESPACE" --type='json' -p='[
        {"op": "remove", "path": "/spec/http/0/mirror"},
        {"op": "remove", "path": "/spec/http/0/mirrorPercentage"}
    ]'

    log_success "Traffic mirroring disabled"
    send_notification "Traffic mirroring disabled"
}

# A/B test command
cmd_ab_test() {
    log_info "Configuring A/B testing setup..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would configure A/B testing"
        return 0
    fi

    # Create A/B testing configuration with header-based routing
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: maestro-conductor-ab-test
  namespace: ${NAMESPACE}
  labels:
    app: maestro-conductor
    component: ab-testing
spec:
  hosts:
  - maestro-conductor.${NAMESPACE}.svc.cluster.local
  http:
  - match:
    - headers:
        ab-test-group:
          exact: "canary"
    route:
    - destination:
        host: maestro-conductor.${NAMESPACE}.svc.cluster.local
        subset: canary
      weight: 100
  - match:
    - headers:
        ab-test-group:
          exact: "stable"
    route:
    - destination:
        host: maestro-conductor.${NAMESPACE}.svc.cluster.local
        subset: stable
      weight: 100
  - route:
    - destination:
        host: maestro-conductor.${NAMESPACE}.svc.cluster.local
        subset: canary
      weight: 50
    - destination:
        host: maestro-conductor.${NAMESPACE}.svc.cluster.local
        subset: stable
      weight: 50
EOF

    log_success "A/B testing configuration applied"
    send_notification "A/B testing enabled - 50/50 split with header override"
}

# Validate command
cmd_validate() {
    log_info "Validating traffic routing configuration..."

    local errors=0
    local warnings=0

    # Check VirtualService exists
    if ! kubectl get virtualservice maestro-conductor-vs -n "$NAMESPACE" >/dev/null 2>&1; then
        log_error "VirtualService not found"
        ((errors++))
    else
        log_success "VirtualService exists"
    fi

    # Check DestinationRule exists
    if ! kubectl get destinationrule maestro-conductor-dr -n "$NAMESPACE" >/dev/null 2>&1; then
        log_warning "DestinationRule not found"
        ((warnings++))
    else
        log_success "DestinationRule exists"
    fi

    # Validate traffic split adds up to 100%
    local canary_weight stable_weight
    canary_weight=$(get_current_split)
    stable_weight=$(get_stable_weight)
    local total_weight=$((canary_weight + stable_weight))

    if [[ $total_weight -ne 100 ]]; then
        log_error "Traffic weights don't add up to 100% (canary: ${canary_weight}%, stable: ${stable_weight}%)"
        ((errors++))
    else
        log_success "Traffic weights are valid (canary: ${canary_weight}%, stable: ${stable_weight}%)"
    fi

    # Check service endpoints
    local canary_endpoints stable_endpoints
    canary_endpoints=$(kubectl get endpoints maestro-conductor-canary -n "$NAMESPACE" -o jsonpath='{.subsets[0].addresses[*].ip}' 2>/dev/null | wc -w || echo "0")
    stable_endpoints=$(kubectl get endpoints maestro-conductor-stable -n "$NAMESPACE" -o jsonpath='{.subsets[0].addresses[*].ip}' 2>/dev/null | wc -w || echo "0")

    if [[ $canary_endpoints -eq 0 && $canary_weight -gt 0 ]]; then
        log_error "No canary endpoints available but canary weight is ${canary_weight}%"
        ((errors++))
    elif [[ $canary_endpoints -gt 0 ]]; then
        log_success "Canary endpoints available: $canary_endpoints"
    fi

    if [[ $stable_endpoints -eq 0 ]]; then
        log_error "No stable endpoints available"
        ((errors++))
    else
        log_success "Stable endpoints available: $stable_endpoints"
    fi

    # Summary
    echo "==============================================="
    echo "Validation Summary"
    echo "==============================================="
    echo "Errors: $errors"
    echo "Warnings: $warnings"

    if [[ $errors -eq 0 ]]; then
        log_success "Traffic routing validation passed"
        return 0
    else
        log_error "Traffic routing validation failed"
        return 1
    fi
}

# Main execution
main() {
    log_info "Starting traffic management operation: $COMMAND"

    # Check prerequisites
    check_prerequisites

    # Execute command
    case "$COMMAND" in
        split)
            cmd_split
            ;;
        status)
            cmd_status
            ;;
        ramp-up)
            cmd_ramp_up
            ;;
        ramp-down)
            cmd_ramp_down
            ;;
        circuit-breaker)
            cmd_circuit_breaker
            ;;
        failover)
            cmd_failover
            ;;
        mirror)
            cmd_mirror
            ;;
        unmirror)
            cmd_unmirror
            ;;
        ab-test)
            cmd_ab_test
            ;;
        validate)
            cmd_validate
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac

    log_success "Traffic management operation completed"
}

# Execute main function
main "$@"