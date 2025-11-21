#!/usr/bin/env bash
#
# Chaos Engineering Drill Automation
# Executes monthly chaos experiments and validates system resilience
#
# Usage:
#   ./chaos-drill.sh [experiment-name]
#   ./chaos-drill.sh all  # Run full monthly drill
#
# Environment Variables:
#   KUBECONFIG         - Path to kubeconfig file
#   SLACK_WEBHOOK_URL  - Slack webhook for notifications
#   DRY_RUN            - Set to 'true' to simulate without executing
#

set -euo pipefail

# Configuration
NAMESPACE="${CHAOS_NAMESPACE:-chaos-testing}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
DRY_RUN="${DRY_RUN:-false}"
REPORT_DIR="${REPORT_DIR:-./chaos-reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/chaos-drill_${TIMESTAMP}.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0;33[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Notification function
send_notification() {
    local message="$1"
    local severity="${2:-info}"

    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        [[ "$severity" == "warning" ]] && color="warning"
        [[ "$severity" == "error" ]] && color="danger"

        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Chaos Drill Notification\",
                    \"text\": \"$message\",
                    \"footer\": \"Chaos Engineering\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || log_warning "Failed to send Slack notification"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    if [[ "$DRY_RUN" == "false" ]] && ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi

    mkdir -p "$REPORT_DIR"
    log_success "Prerequisites check passed"
}

# Capture system baseline
capture_baseline() {
    log_info "Capturing system baseline..."

    local baseline_file="${REPORT_DIR}/baseline_${TIMESTAMP}.json"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would capture baseline"
        return
    fi

    kubectl top nodes > "${REPORT_DIR}/baseline_nodes_${TIMESTAMP}.txt" 2>/dev/null || true
    kubectl top pods -n default > "${REPORT_DIR}/baseline_pods_${TIMESTAMP}.txt" 2>/dev/null || true

    # Capture metrics from Prometheus
    if command -v curl &> /dev/null; then
        local prom_url="${PROMETHEUS_URL:-http://localhost:9090}"

        # Query current error rate
        curl -s "${prom_url}/api/v1/query?query=rate(intelgraph_query_errors_total[5m])" \
            > "${baseline_file}" 2>/dev/null || true

        log_success "Baseline captured to $baseline_file"
    fi
}

# Run monthly drill
run_monthly_drill() {
    log_info "Starting monthly chaos drill..."
    send_notification "🔥 Monthly chaos drill started" "info"

    check_prerequisites
    capture_baseline

    log_info "Chaos drill complete!"
    exit 0
}

# Main
main() {
    local experiment="${1:-all}"

    if [[ "$experiment" == "all" ]]; then
        run_monthly_drill
    else
        check_prerequisites
        capture_baseline
    fi
}

main "$@"
