#!/bin/bash
# ============================================================================
# Automated Rollback System with Health Checks and Monitoring
# ============================================================================
# Features:
# - Automatic detection of deployment failures
# - Health check monitoring with configurable thresholds
# - Integration with Prometheus metrics
# - Automatic rollback on failure
# - Slack/email notifications
# - Deployment history tracking
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }
bold() { echo -e "${BOLD}$1${NC}"; }

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph-prod}"
RELEASE_NAME="${RELEASE_NAME:-summit}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus-server.monitoring.svc.cluster.local}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"
ERROR_RATE_THRESHOLD="${ERROR_RATE_THRESHOLD:-0.05}"  # 5%
LATENCY_THRESHOLD_MS="${LATENCY_THRESHOLD_MS:-1000}"  # 1000ms
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"
DRY_RUN="${DRY_RUN:-false}"

# State file for tracking
STATE_FILE="/tmp/summit-rollback-state.json"
HISTORY_FILE="${PROJECT_ROOT}/deployment-history.jsonl"

show_help() {
    cat << EOF
🔄 Automated Rollback System

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    monitor             Start continuous monitoring for automatic rollback
    check               Run one-time health and metrics check
    rollback            Execute rollback with verification
    history             Show deployment history
    status              Show current deployment status
    test                Test rollback system (dry-run)
    help                Show this help message

Options:
    --namespace <ns>              Kubernetes namespace (default: intelgraph-prod)
    --release <name>              Helm release name (default: summit)
    --prometheus-url <url>        Prometheus server URL
    --interval <seconds>          Health check interval (default: 30)
    --retries <count>             Health check retries (default: 10)
    --error-threshold <float>     Error rate threshold (default: 0.05)
    --latency-threshold <ms>      Latency threshold (default: 1000)
    --slack-webhook <url>         Slack webhook for notifications
    --no-rollback                 Disable automatic rollback
    --dry-run                     Simulate without executing
    --help                        Show this help message

Environment Variables:
    SLACK_WEBHOOK                 Slack webhook URL for notifications
    PROMETHEUS_URL                Prometheus server URL

Examples:
    # Start monitoring (runs continuously)
    $0 monitor

    # Run one-time check
    $0 check

    # Manual rollback with verification
    $0 rollback

    # Test rollback system
    $0 test --dry-run
EOF
}

# Initialize state
init_state() {
    if [ ! -f "$STATE_FILE" ]; then
        cat > "$STATE_FILE" << EOF
{
  "initialized": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "last_check": "",
  "last_deployment": "",
  "failures": 0,
  "rollbacks": 0
}
EOF
    fi
}

# Update state
update_state() {
    local key="$1"
    local value="$2"

    if [ -f "$STATE_FILE" ]; then
        local temp_file=$(mktemp)
        jq --arg key "$key" --arg value "$value" '.[$key] = $value' "$STATE_FILE" > "$temp_file"
        mv "$temp_file" "$STATE_FILE"
    fi
}

# Send notification
send_notification() {
    local title="$1"
    local message="$2"
    local level="${3:-info}"  # info, warning, error, success

    local color="#36a64f"  # green
    case $level in
        warning) color="#ff9900" ;;
        error) color="#ff0000" ;;
        info) color="#0066cc" ;;
        success) color="#00ff00" ;;
    esac

    if [ -n "$SLACK_WEBHOOK" ]; then
        local payload=$(cat << EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "$title",
      "text": "$message",
      "footer": "Summit Automated Rollback System",
      "ts": $(date +%s)
    }
  ]
}
EOF
)
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK" &>/dev/null || true
    fi
}

# Log deployment event
log_deployment_event() {
    local event_type="$1"
    local status="$2"
    local details="$3"

    local event=$(cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "type": "$event_type",
  "status": "$status",
  "namespace": "$NAMESPACE",
  "release": "$RELEASE_NAME",
  "details": "$details"
}
EOF
)

    echo "$event" >> "$HISTORY_FILE"
}

# Get deployment version
get_current_version() {
    kubectl get deployment "$RELEASE_NAME" -n "$NAMESPACE" \
        -o json 2>/dev/null | \
        jq -r '.spec.template.spec.containers[0].image | split(":")[1] // "unknown"'
}

# Health check
run_health_check() {
    local service_url="${1:-}"

    if [ -z "$service_url" ]; then
        service_url=$(kubectl get ingress "$RELEASE_NAME" -n "$NAMESPACE" \
                      -o json 2>/dev/null | \
                      jq -r '.spec.rules[0].host // "localhost"')
        service_url="https://${service_url}"
    fi

    info "Running health check: $service_url/health"

    local response
    local status_code

    response=$(curl -s -w "\n%{http_code}" "${service_url}/health" --max-time 10 || echo "error\n000")
    status_code=$(echo "$response" | tail -n 1)

    if [ "$status_code" != "200" ]; then
        error "Health check failed with status: $status_code"
        return 1
    fi

    local health_status=$(echo "$response" | head -n -1 | jq -r '.status // "unknown"')

    if [ "$health_status" != "healthy" ]; then
        error "Health status is: $health_status"
        return 1
    fi

    log "Health check passed ✅"
    return 0
}

# Check Prometheus metrics
check_prometheus_metrics() {
    local service_name="$RELEASE_NAME"
    local failed=0

    info "Checking Prometheus metrics..."

    # Check error rate
    local error_rate_query="sum(rate(http_requests_total{service=\"${service_name}\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"${service_name}\"}[5m]))"
    local error_rate=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=${error_rate_query}" | \
                      jq -r '.data.result[0].value[1] // "0"')

    if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
        error "Error rate too high: ${error_rate} (threshold: ${ERROR_RATE_THRESHOLD})"
        failed=1
    else
        log "Error rate OK: ${error_rate}"
    fi

    # Check p95 latency
    local latency_query="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service=\"${service_name}\"}[5m])) by (le)) * 1000"
    local p95_latency=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=${latency_query}" | \
                       jq -r '.data.result[0].value[1] // "0"')

    if (( $(echo "$p95_latency > $LATENCY_THRESHOLD_MS" | bc -l) )); then
        error "P95 latency too high: ${p95_latency}ms (threshold: ${LATENCY_THRESHOLD_MS}ms)"
        failed=1
    else
        log "P95 latency OK: ${p95_latency}ms"
    fi

    # Check pod restart count
    local restart_query="sum(kube_pod_container_status_restarts_total{namespace=\"${NAMESPACE}\",pod=~\"${service_name}-.*\"})"
    local restart_count=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=${restart_query}" | \
                         jq -r '.data.result[0].value[1] // "0"')

    if (( $(echo "$restart_count > 5" | bc -l) )); then
        warn "High pod restart count: ${restart_count}"
    fi

    return $failed
}

# Check pod status
check_pod_status() {
    info "Checking pod status..."

    local pods_ready=$(kubectl get deployment "$RELEASE_NAME" -n "$NAMESPACE" \
                      -o json | jq '.status.readyReplicas // 0')
    local pods_desired=$(kubectl get deployment "$RELEASE_NAME" -n "$NAMESPACE" \
                        -o json | jq '.spec.replicas // 0')

    if [ "$pods_ready" -lt "$pods_desired" ]; then
        error "Not all pods ready: ${pods_ready}/${pods_desired}"
        return 1
    fi

    log "All pods ready: ${pods_ready}/${pods_desired} ✅"
    return 0
}

# Comprehensive health check
comprehensive_check() {
    local failures=0

    bold "🔍 Running comprehensive health check..."

    if ! check_pod_status; then
        ((failures++))
    fi

    if ! run_health_check; then
        ((failures++))
    fi

    if ! check_prometheus_metrics; then
        ((failures++))
    fi

    if [ $failures -gt 0 ]; then
        error "Health check failed with $failures failures"
        update_state "failures" "$(($(jq -r '.failures // 0' "$STATE_FILE") + 1))"
        return 1
    fi

    log "All health checks passed ✅"
    update_state "last_check" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    update_state "failures" "0"
    return 0
}

# Execute rollback
execute_rollback() {
    local current_version=$(get_current_version)

    bold "⚠️  Initiating automatic rollback..."

    send_notification \
        "🔄 Automatic Rollback Initiated" \
        "Current version: $current_version\nReason: Health check failures\nNamespace: $NAMESPACE" \
        "warning"

    log_deployment_event "rollback_initiated" "in_progress" "version=$current_version"

    if [ "$DRY_RUN" == "true" ]; then
        warn "DRY RUN: Would execute rollback"
        return 0
    fi

    # Execute rollback using helm
    local rollback_result=0
    if helm rollback "$RELEASE_NAME" -n "$NAMESPACE" --wait --timeout 10m; then
        log "Rollback command executed successfully"
    else
        error "Rollback command failed"
        rollback_result=1
    fi

    # Wait for rollback to stabilize
    sleep 30

    # Verify rollback
    if comprehensive_check; then
        local new_version=$(get_current_version)
        log "Rollback successful! Now running version: $new_version"

        send_notification \
            "✅ Rollback Successful" \
            "Rolled back from $current_version to $new_version\nNamespace: $NAMESPACE" \
            "success"

        log_deployment_event "rollback_completed" "success" "from=$current_version to=$new_version"
        update_state "rollbacks" "$(($(jq -r '.rollbacks // 0' "$STATE_FILE") + 1))"
        return 0
    else
        error "Rollback verification failed!"

        send_notification \
            "❌ Rollback Failed" \
            "Rollback verification failed for $current_version\nManual intervention required!\nNamespace: $NAMESPACE" \
            "error"

        log_deployment_event "rollback_failed" "error" "version=$current_version"
        return 1
    fi
}

# Monitor continuously
monitor() {
    bold "🔍 Starting continuous deployment monitoring..."

    init_state

    local consecutive_failures=0
    local max_consecutive_failures=3

    while true; do
        info "Running health check (consecutive failures: $consecutive_failures)"

        if comprehensive_check; then
            consecutive_failures=0
        else
            ((consecutive_failures++))

            warn "Health check failed ($consecutive_failures/$max_consecutive_failures)"

            if [ $consecutive_failures -ge $max_consecutive_failures ]; then
                error "Maximum consecutive failures reached!"

                if [ "$ROLLBACK_ON_FAILURE" == "true" ]; then
                    execute_rollback
                    consecutive_failures=0
                else
                    warn "Automatic rollback disabled, manual intervention required"
                fi
            fi
        fi

        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Show deployment history
show_history() {
    if [ ! -f "$HISTORY_FILE" ]; then
        info "No deployment history found"
        return
    fi

    bold "📜 Deployment History (last 20 events):"
    tail -n 20 "$HISTORY_FILE" | jq -r '. | "\(.timestamp) [\(.type)] \(.status): \(.details)"'
}

# Show current status
show_status() {
    bold "📊 Current Deployment Status"

    local current_version=$(get_current_version)

    echo "Version: $current_version"
    echo "Namespace: $NAMESPACE"
    echo "Release: $RELEASE_NAME"
    echo

    if [ -f "$STATE_FILE" ]; then
        echo "System State:"
        jq '.' "$STATE_FILE"
    fi

    echo
    kubectl get deployment "$RELEASE_NAME" -n "$NAMESPACE"
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --release)
                RELEASE_NAME="$2"
                shift 2
                ;;
            --prometheus-url)
                PROMETHEUS_URL="$2"
                shift 2
                ;;
            --interval)
                HEALTH_CHECK_INTERVAL="$2"
                shift 2
                ;;
            --retries)
                HEALTH_CHECK_RETRIES="$2"
                shift 2
                ;;
            --error-threshold)
                ERROR_RATE_THRESHOLD="$2"
                shift 2
                ;;
            --latency-threshold)
                LATENCY_THRESHOLD_MS="$2"
                shift 2
                ;;
            --slack-webhook)
                SLACK_WEBHOOK="$2"
                shift 2
                ;;
            --no-rollback)
                ROLLBACK_ON_FAILURE="false"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
}

# Main
main() {
    parse_args "$@"

    # Check dependencies
    command -v kubectl >/dev/null 2>&1 || { error "kubectl is required"; exit 1; }
    command -v helm >/dev/null 2>&1 || { error "helm is required"; exit 1; }
    command -v jq >/dev/null 2>&1 || { error "jq is required"; exit 1; }
    command -v curl >/dev/null 2>&1 || { error "curl is required"; exit 1; }

    local command="${1:-help}"

    case "$command" in
        monitor)
            monitor
            ;;
        check)
            comprehensive_check
            ;;
        rollback)
            execute_rollback
            ;;
        history)
            show_history
            ;;
        status)
            show_status
            ;;
        test)
            DRY_RUN=true
            comprehensive_check
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
