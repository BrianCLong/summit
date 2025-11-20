#!/usr/bin/env bash
# SLO Validator for Chaos Engineering
# Validates that chaos drills exercise alert rules and meet SLOs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Check if Prometheus is available
check_prometheus() {
    log_info "Checking Prometheus connectivity..."

    if curl -s --max-time 5 "${PROMETHEUS_URL}/-/healthy" > /dev/null 2>&1; then
        log_success "Prometheus is available at ${PROMETHEUS_URL}"
        return 0
    else
        log_error "Prometheus is not available at ${PROMETHEUS_URL}"
        return 1
    fi
}

# Check if alert rules are loaded
check_alert_rules() {
    log_info "Checking alert rules..."

    local rules_response
    rules_response=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" || echo '{"status":"error"}')

    local status
    status=$(echo "$rules_response" | jq -r '.status')

    if [ "$status" != "success" ]; then
        log_error "Failed to retrieve alert rules"
        return 1
    fi

    # Check for chaos-specific alert rules
    local chaos_rules
    chaos_rules=$(echo "$rules_response" | jq -r '.data.groups[].rules[] | select(.name | contains("Chaos")) | .name' 2>/dev/null || echo "")

    if [ -z "$chaos_rules" ]; then
        log_warn "No chaos-specific alert rules found"
        log_info "Expected rules: ChaosExperimentFailed, SystemNotRecoveringFromChaos, ChaosImpactTooHigh, HighErrorRateDuringChaos"
    else
        log_success "Chaos alert rules found:"
        echo "$chaos_rules" | while read -r rule; do
            echo "  - $rule"
        done
    fi
}

# Query current SLO metrics
query_slo_metrics() {
    log_info "Querying SLO metrics..."

    # Availability SLO
    local availability_query='avg_over_time(up{job="intelgraph-server"}[5m])'
    local availability
    availability=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=${availability_query}" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    local availability_pct
    availability_pct=$(echo "$availability * 100" | bc -l 2>/dev/null | cut -d. -f1)

    echo ""
    echo "Current SLO Status:"
    echo "=================="

    if [ "$availability_pct" -ge 95 ]; then
        log_success "Availability: ${availability_pct}% (SLO: ≥95%)"
    else
        log_error "Availability: ${availability_pct}% (SLO: ≥95%)"
    fi

    # Error rate SLO
    local error_rate_query='sum(rate(http_requests_total{code!~"2.."}[5m])) / sum(rate(http_requests_total[5m]))'
    local error_rate
    error_rate=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=${error_rate_query}" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    local error_rate_pct
    error_rate_pct=$(echo "$error_rate * 100" | bc -l 2>/dev/null | cut -d. -f1)

    if [ "$error_rate_pct" -le 5 ]; then
        log_success "Error Rate: ${error_rate_pct}% (SLO: ≤5%)"
    else
        log_error "Error Rate: ${error_rate_pct}% (SLO: ≤5%)"
    fi

    # Latency SLO (p95)
    local latency_query='histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'
    local latency_p95
    latency_p95=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=${latency_query}" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    local latency_ms
    latency_ms=$(echo "$latency_p95 * 1000" | bc -l 2>/dev/null | cut -d. -f1)

    if [ "$latency_ms" -le 500 ]; then
        log_success "P95 Latency: ${latency_ms}ms (SLO: ≤500ms)"
    else
        log_error "P95 Latency: ${latency_ms}ms (SLO: ≤500ms)"
    fi

    echo ""
}

# Check active alerts
check_active_alerts() {
    log_info "Checking active alerts..."

    local alerts_response
    alerts_response=$(curl -s "${PROMETHEUS_URL}/api/v1/alerts" || echo '{"status":"error"}')

    local status
    status=$(echo "$alerts_response" | jq -r '.status')

    if [ "$status" != "success" ]; then
        log_warn "Failed to retrieve active alerts"
        return 0
    fi

    local active_alerts
    active_alerts=$(echo "$alerts_response" | jq -r '.data.alerts[] | select(.state == "firing") | .labels.alertname' 2>/dev/null || echo "")

    if [ -z "$active_alerts" ]; then
        log_info "No active alerts"
    else
        log_warn "Active alerts:"
        echo "$active_alerts" | while read -r alert; do
            echo "  - $alert"
        done
    fi
}

# Verify chaos experiments triggered alerts
verify_chaos_alerts() {
    local lookback_minutes=${1:-60}

    log_info "Verifying chaos experiments triggered alerts (last ${lookback_minutes}m)..."

    # Query for chaos experiment metrics
    local chaos_active_query='max_over_time(litmuschaos_experiment_status[${lookback_minutes}m])'
    local chaos_experiments
    chaos_experiments=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=${chaos_active_query}" | \
        jq -r '.data.result[].metric.experiment' 2>/dev/null || echo "")

    if [ -z "$chaos_experiments" ]; then
        log_warn "No chaos experiments detected in last ${lookback_minutes} minutes"
        return 0
    fi

    log_info "Detected chaos experiments:"
    echo "$chaos_experiments" | while read -r exp; do
        echo "  - $exp"
    done

    # Check if chaos caused any alert firings
    local alerts_during_chaos
    alerts_during_chaos=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=ALERTS{component=\"chaos-engineering\"}" | \
        jq -r '.data.result[].metric.alertname' 2>/dev/null || echo "")

    if [ -n "$alerts_during_chaos" ]; then
        log_success "Chaos experiments triggered alerts:"
        echo "$alerts_during_chaos" | while read -r alert; do
            echo "  - $alert"
        done
    else
        log_warn "No chaos-related alerts were triggered"
        log_info "This may indicate:"
        log_info "  1. Alert rules are not configured"
        log_info "  2. Chaos experiments were too mild"
        log_info "  3. System is very resilient (good!)"
    fi
}

# Generate SLO compliance report
generate_slo_report() {
    local output_file="${PROJECT_ROOT}/artifacts/chaos/reports/slo_report_$(date +%Y%m%d_%H%M%S).json"

    log_info "Generating SLO compliance report..."

    # Query multiple SLO metrics
    local availability
    availability=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=avg_over_time(up{job=\"intelgraph-server\"}[5m])" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    local error_rate
    error_rate=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=sum(rate(http_requests_total{code!~\"2..\"}[5m])) / sum(rate(http_requests_total[5m]))" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    local latency_p95
    latency_p95=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    local latency_p99
    latency_p99=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

    # Create report
    cat > "$output_file" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "prometheus_url": "$PROMETHEUS_URL",
  "slos": {
    "availability": {
      "current": $(echo "$availability * 100" | bc -l),
      "target": 95,
      "unit": "percent",
      "status": "$([ $(echo "$availability >= 0.95" | bc -l) -eq 1 ] && echo "pass" || echo "fail")"
    },
    "error_rate": {
      "current": $(echo "$error_rate * 100" | bc -l),
      "target": 5,
      "unit": "percent",
      "status": "$([ $(echo "$error_rate <= 0.05" | bc -l) -eq 1 ] && echo "pass" || echo "fail")"
    },
    "latency_p95": {
      "current": $(echo "$latency_p95 * 1000" | bc -l),
      "target": 500,
      "unit": "milliseconds",
      "status": "$([ $(echo "$latency_p95 <= 0.5" | bc -l) -eq 1 ] && echo "pass" || echo "fail")"
    },
    "latency_p99": {
      "current": $(echo "$latency_p99 * 1000" | bc -l),
      "target": 1000,
      "unit": "milliseconds",
      "status": "$([ $(echo "$latency_p99 <= 1.0" | bc -l) -eq 1 ] && echo "pass" || echo "fail")"
    }
  }
}
EOF

    log_success "SLO report saved: $output_file"

    # Display summary
    echo ""
    echo "SLO Compliance Summary:"
    echo "======================"
    jq -r '.slos | to_entries[] | "\(.key): \(.value.status | ascii_upcase)"' "$output_file"
    echo ""
}

# Main execution
main() {
    log_info "=== SLO Validator for Chaos Engineering ==="
    echo ""

    # Check Prometheus connectivity
    if ! check_prometheus; then
        log_error "Cannot proceed without Prometheus"
        exit 1
    fi

    echo ""

    # Check alert rules
    check_alert_rules

    echo ""

    # Query current SLO metrics
    query_slo_metrics

    # Check active alerts
    check_active_alerts

    echo ""

    # Verify chaos triggered alerts
    verify_chaos_alerts 60

    echo ""

    # Generate SLO report
    generate_slo_report

    log_success "SLO validation complete!"
}

# Parse command line arguments
case "${1:-}" in
    --check-rules)
        check_alert_rules
        ;;
    --check-slos)
        query_slo_metrics
        ;;
    --check-alerts)
        check_active_alerts
        ;;
    --verify-chaos)
        verify_chaos_alerts "${2:-60}"
        ;;
    --report)
        generate_slo_report
        ;;
    --help|-h)
        cat <<EOF
Usage: $0 [COMMAND]

Commands:
    --check-rules      Check if alert rules are loaded
    --check-slos       Query current SLO metrics
    --check-alerts     Check active alerts
    --verify-chaos     Verify chaos experiments triggered alerts
    --report           Generate SLO compliance report
    --help             Show this help message

Without arguments, runs full SLO validation.

Environment Variables:
    PROMETHEUS_URL     Prometheus URL (default: http://localhost:9090)
    ALERTMANAGER_URL   AlertManager URL (default: http://localhost:9093)
EOF
        exit 0
        ;;
    *)
        main
        ;;
esac
