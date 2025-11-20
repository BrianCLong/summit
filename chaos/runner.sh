#!/usr/bin/env bash
# Resilience Lab Chaos Runner
# Executes chaos scenarios and records recovery metrics

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCENARIOS_FILE="${SCRIPT_DIR}/scenarios.yaml"
REPORTS_DIR="${PROJECT_ROOT}/artifacts/chaos/reports"
TEMP_DIR="${PROJECT_ROOT}/artifacts/chaos/temp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET="${TARGET:-compose}"  # compose or kubernetes
SCENARIO="${SCENARIO:-}"
SUITE="${SUITE:-smoke_suite}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# Create necessary directories
mkdir -p "$REPORTS_DIR" "$TEMP_DIR"

# Logging functions
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

# Check dependencies
check_dependencies() {
    local missing_deps=()

    if [ "$TARGET" = "compose" ]; then
        command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
        command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || missing_deps+=("docker-compose")
    elif [ "$TARGET" = "kubernetes" ] || [ "$TARGET" = "k8s" ]; then
        command -v kubectl >/dev/null 2>&1 || missing_deps+=("kubectl")
    fi

    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
}

# Parse YAML scenarios file (simple parser)
get_scenarios_from_suite() {
    local suite=$1
    # Extract scenario IDs from suite
    grep -A 100 "^${suite}:" "$SCENARIOS_FILE" | grep "^  -" | sed 's/^  - //' | grep -v "^$" || echo ""
}

get_scenario_config() {
    local scenario_id=$1
    local field=$2

    # Simple YAML parser - extract scenario block
    awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | grep "    ${field}:" | head -1 | sed "s/.*${field}: //" || echo ""
}

# Health check functions
http_health_check() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-5}

    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")

    if [ "$status" = "$expected_status" ]; then
        return 0
    else
        return 1
    fi
}

graphql_health_check() {
    local url=$1
    local query=${2:-'{"query": "{ __typename }"}'}
    local timeout=${3:-5}

    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" \
        -H "Content-Type: application/json" \
        -d "$query" \
        "$url" 2>/dev/null || echo "000")

    if [ "$status" = "200" ]; then
        return 0
    else
        return 1
    fi
}

tcp_health_check() {
    local host=$1
    local port=$2
    local timeout=${3:-3}

    timeout "$timeout" bash -c "cat < /dev/null > /dev/tcp/${host}/${port}" 2>/dev/null
}

# Execute chaos action for Docker Compose
compose_chaos_action() {
    local service=$1
    local action=$2
    local duration=${3:-60}

    log_info "Executing ${action} on compose service: ${service}"

    case "$action" in
        stop)
            if [ "$DRY_RUN" = "false" ]; then
                docker-compose -f "${PROJECT_ROOT}/compose/docker-compose.yml" stop "$service"
                sleep "$duration"
                docker-compose -f "${PROJECT_ROOT}/compose/docker-compose.yml" start "$service"
            else
                log_info "[DRY RUN] Would stop service $service for ${duration}s"
            fi
            ;;
        restart)
            if [ "$DRY_RUN" = "false" ]; then
                docker-compose -f "${PROJECT_ROOT}/compose/docker-compose.yml" restart "$service"
            else
                log_info "[DRY RUN] Would restart service $service"
            fi
            ;;
        pause)
            if [ "$DRY_RUN" = "false" ]; then
                docker-compose -f "${PROJECT_ROOT}/compose/docker-compose.yml" pause "$service"
                sleep "$duration"
                docker-compose -f "${PROJECT_ROOT}/compose/docker-compose.yml" unpause "$service"
            else
                log_info "[DRY RUN] Would pause service $service for ${duration}s"
            fi
            ;;
        network-delay)
            if [ "$DRY_RUN" = "false" ]; then
                # Use tc (traffic control) to add network latency
                local container_id
                container_id=$(docker-compose -f "${PROJECT_ROOT}/compose/docker-compose.yml" ps -q "$service")
                if [ -n "$container_id" ]; then
                    docker exec "$container_id" tc qdisc add dev eth0 root netem delay 100ms 20ms || log_warn "tc command failed (may need --privileged)"
                    sleep "$duration"
                    docker exec "$container_id" tc qdisc del dev eth0 root || true
                fi
            else
                log_info "[DRY RUN] Would add network delay to $service for ${duration}s"
            fi
            ;;
        cpu-stress|memory-stress)
            if [ "$DRY_RUN" = "false" ]; then
                local container_id
                container_id=$(docker-compose -f "${PROJECT_ROOT}/compose/docker-compose.yml" ps -q "$service")
                if [ -n "$container_id" ]; then
                    if [ "$action" = "cpu-stress" ]; then
                        docker exec -d "$container_id" sh -c "yes > /dev/null &" || log_warn "stress command failed"
                    else
                        docker exec -d "$container_id" sh -c "dd if=/dev/zero of=/tmp/mem bs=1M count=256 || true &" || log_warn "stress command failed"
                    fi
                    sleep "$duration"
                    docker exec "$container_id" pkill -f "yes|dd" || true
                fi
            else
                log_info "[DRY RUN] Would apply $action to $service for ${duration}s"
            fi
            ;;
        *)
            log_error "Unknown action: $action"
            return 1
            ;;
    esac
}

# Execute chaos action for Kubernetes
k8s_chaos_action() {
    local selector=$1
    local action=$2
    local namespace=${3:-default}

    log_info "Executing ${action} on k8s pods: ${selector} in namespace: ${namespace}"

    case "$action" in
        delete-pod)
            if [ "$DRY_RUN" = "false" ]; then
                kubectl delete pod -n "$namespace" -l "$selector" --wait=false
            else
                log_info "[DRY RUN] Would delete pods matching $selector in $namespace"
            fi
            ;;
        *)
            log_error "Unknown k8s action: $action"
            return 1
            ;;
    esac
}

# Wait for system to recover and measure recovery time
measure_recovery() {
    local health_check_url=$1
    local max_wait=${2:-300}
    local check_interval=${3:-2}

    local start_time
    start_time=$(date +%s)
    local elapsed=0

    log_info "Waiting for system recovery (max ${max_wait}s)..."

    while [ $elapsed -lt $max_wait ]; do
        if http_health_check "$health_check_url" 200 5; then
            local end_time
            end_time=$(date +%s)
            local recovery_time=$((end_time - start_time))
            log_success "System recovered in ${recovery_time}s"
            echo "$recovery_time"
            return 0
        fi

        sleep "$check_interval"
        elapsed=$((elapsed + check_interval))
    done

    log_error "System did not recover within ${max_wait}s"
    echo "-1"
    return 1
}

# Collect metrics from Prometheus (if available)
collect_prometheus_metrics() {
    local scenario_id=$1
    local start_time=$2
    local end_time=$3
    local output_file=$4

    local prom_url="${PROMETHEUS_URL:-http://localhost:9090}"

    # Check if Prometheus is available
    if ! http_health_check "$prom_url/-/healthy" 200 2; then
        log_warn "Prometheus not available, skipping metrics collection"
        return 0
    fi

    log_info "Collecting metrics from Prometheus..."

    # Query for error rate
    local error_rate_query='sum(rate(http_requests_total{code!~"2.."}[1m])) / sum(rate(http_requests_total[1m]))'
    curl -s -G "$prom_url/api/v1/query_range" \
        --data-urlencode "query=$error_rate_query" \
        --data-urlencode "start=$start_time" \
        --data-urlencode "end=$end_time" \
        --data-urlencode "step=5s" > "${output_file}.error_rate.json" 2>/dev/null || true

    # Query for latency
    local latency_query='histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[1m])) by (le))'
    curl -s -G "$prom_url/api/v1/query_range" \
        --data-urlencode "query=$latency_query" \
        --data-urlencode "start=$start_time" \
        --data-urlencode "end=$end_time" \
        --data-urlencode "step=5s" > "${output_file}.latency.json" 2>/dev/null || true
}

# Run a single chaos scenario
run_scenario() {
    local scenario_id=$1

    log_info "========================================="
    log_info "Running chaos scenario: ${scenario_id}"
    log_info "========================================="

    # Extract scenario configuration
    local scenario_name
    scenario_name=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | grep "name:" | head -1 | sed 's/.*name: "\(.*\)"/\1/')

    local start_timestamp
    start_timestamp=$(date +%s)
    local report_file="${REPORTS_DIR}/${scenario_id}_$(date +%Y%m%d_%H%M%S).json"

    # Initialize report
    cat > "$report_file" <<EOF
{
  "scenario_id": "$scenario_id",
  "scenario_name": "$scenario_name",
  "target": "$TARGET",
  "start_time": "$start_timestamp",
  "start_time_human": "$(date -d @$start_timestamp 2>/dev/null || date -r $start_timestamp)",
  "status": "running",
  "metrics": {}
}
EOF

    # Pre-chaos health check
    log_info "Pre-chaos health check..."
    if ! http_health_check "http://localhost:4000/health" 200 5; then
        log_error "System unhealthy before chaos - aborting"
        jq '.status = "aborted" | .reason = "pre-check failed"' "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
        return 1
    fi

    log_success "System healthy, proceeding with chaos"

    # Execute chaos based on target
    local chaos_start
    chaos_start=$(date +%s)

    if [ "$TARGET" = "compose" ]; then
        # Extract compose target configuration
        local service
        service=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | grep "compose:" -A 10 | grep "service:" | head -1 | awk '{print $2}')
        local action
        action=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | grep "compose:" -A 10 | grep "action:" | head -1 | awk '{print $2}')
        local duration
        duration=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | grep "compose:" -A 10 | grep "duration:" | head -1 | awk '{print $2}')

        if [ -n "$service" ] && [ -n "$action" ]; then
            compose_chaos_action "$service" "$action" "${duration:-60}"
        else
            log_error "Invalid compose configuration for scenario $scenario_id"
            return 1
        fi
    elif [ "$TARGET" = "kubernetes" ] || [ "$TARGET" = "k8s" ]; then
        # Extract k8s target configuration
        local selector
        selector=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | grep "kubernetes:" -A 10 | grep "selector:" | head -1 | awk '{print $2}')
        local action
        action=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | grep "kubernetes:" -A 10 | grep "action:" | head -1 | awk '{print $2}')
        local namespace
        namespace=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | grep "kubernetes:" -A 10 | grep "namespace:" | head -1 | awk '{print $2}')

        if [ -n "$selector" ] && [ -n "$action" ]; then
            k8s_chaos_action "$selector" "$action" "${namespace:-default}"
        else
            log_error "Invalid k8s configuration for scenario $scenario_id"
            return 1
        fi
    fi

    local chaos_end
    chaos_end=$(date +%s)

    # Measure recovery
    log_info "Measuring system recovery..."
    local recovery_time
    recovery_time=$(measure_recovery "http://localhost:4000/health" 300 2)

    local end_timestamp
    end_timestamp=$(date +%s)

    # Collect Prometheus metrics if available
    collect_prometheus_metrics "$scenario_id" "$chaos_start" "$end_timestamp" "${TEMP_DIR}/${scenario_id}"

    # Determine pass/fail based on SLO
    local slo_recovery_time
    slo_recovery_time=$(grep "recovery_time_seconds:" "$SCENARIOS_FILE" | awk '{print $2}')

    local status="pass"
    if [ "$recovery_time" = "-1" ] || [ "$recovery_time" -gt "${slo_recovery_time:-30}" ]; then
        status="fail"
    fi

    # Update report
    jq --arg status "$status" \
       --arg recovery_time "$recovery_time" \
       --arg end_time "$end_timestamp" \
       --arg end_time_human "$(date -d @$end_timestamp 2>/dev/null || date -r $end_timestamp)" \
       --arg total_duration "$((end_timestamp - start_timestamp))" \
       '.status = $status |
        .end_time = $end_time |
        .end_time_human = $end_time_human |
        .total_duration_seconds = ($total_duration | tonumber) |
        .metrics.recovery_time_seconds = ($recovery_time | tonumber)' \
       "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"

    if [ "$status" = "pass" ]; then
        log_success "Scenario ${scenario_id}: PASSED (recovered in ${recovery_time}s)"
    else
        log_error "Scenario ${scenario_id}: FAILED (recovery time: ${recovery_time}s, SLO: ${slo_recovery_time}s)"
    fi

    echo "$report_file"
}

# Run a test suite
run_suite() {
    local suite=$1

    log_info "Running chaos test suite: ${suite}"

    local scenarios
    scenarios=$(get_scenarios_from_suite "$suite")

    if [ -z "$scenarios" ]; then
        log_error "No scenarios found in suite: $suite"
        return 1
    fi

    local suite_report="${REPORTS_DIR}/suite_${suite}_$(date +%Y%m%d_%H%M%S).json"
    local scenario_reports=()
    local passed=0
    local failed=0

    for scenario in $scenarios; do
        local report
        report=$(run_scenario "$scenario")
        scenario_reports+=("$report")

        local status
        status=$(jq -r '.status' "$report")
        if [ "$status" = "pass" ]; then
            ((passed++))
        else
            ((failed++))
        fi

        # Brief pause between scenarios
        sleep 5
    done

    # Generate suite summary report
    cat > "$suite_report" <<EOF
{
  "suite": "$suite",
  "target": "$TARGET",
  "timestamp": "$(date -Iseconds)",
  "summary": {
    "total": $((passed + failed)),
    "passed": $passed,
    "failed": $failed
  },
  "scenarios": []
}
EOF

    # Aggregate individual reports
    for report in "${scenario_reports[@]}"; do
        local content
        content=$(cat "$report")
        jq --argjson scenario "$content" '.scenarios += [$scenario]' "$suite_report" > "${suite_report}.tmp" && mv "${suite_report}.tmp" "$suite_report"
    done

    log_info "========================================="
    log_info "Suite Results: ${passed} passed, ${failed} failed"
    log_info "Report: ${suite_report}"
    log_info "========================================="

    if [ $failed -gt 0 ]; then
        return 1
    fi

    return 0
}

# Generate HTML report
generate_html_report() {
    local json_report=$1
    local html_report="${json_report%.json}.html"

    log_info "Generating HTML report: ${html_report}"

    cat > "$html_report" <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Chaos Engineering Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #f0f0f0; padding: 15px; border-radius: 5px; flex: 1; }
        .metric.pass { background: #d4edda; border-left: 4px solid #28a745; }
        .metric.fail { background: #f8d7da; border-left: 4px solid #dc3545; }
        .scenario { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .scenario h3 { margin-top: 0; }
        .status { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        .status.pass { background: #28a745; color: white; }
        .status.fail { background: #dc3545; color: white; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔥 Resilience Lab - Chaos Engineering Report</h1>
        <div id="report"></div>
    </div>
    <script>
EOF

    echo "const reportData = " >> "$html_report"
    cat "$json_report" >> "$html_report"

    cat >> "$html_report" <<'EOF'
;

        const container = document.getElementById('report');

        if (reportData.suite) {
            // Suite report
            container.innerHTML = `
                <div class="summary">
                    <div class="metric">
                        <h3>Total Scenarios</h3>
                        <p style="font-size: 24px; margin: 0;">${reportData.summary.total}</p>
                    </div>
                    <div class="metric pass">
                        <h3>Passed</h3>
                        <p style="font-size: 24px; margin: 0;">${reportData.summary.passed}</p>
                    </div>
                    <div class="metric fail">
                        <h3>Failed</h3>
                        <p style="font-size: 24px; margin: 0;">${reportData.summary.failed}</p>
                    </div>
                </div>
                <h2>Scenarios</h2>
                ${reportData.scenarios.map(s => `
                    <div class="scenario">
                        <h3>${s.scenario_name} <span class="status ${s.status}">${s.status.toUpperCase()}</span></h3>
                        <table>
                            <tr><th>Metric</th><th>Value</th></tr>
                            <tr><td>Recovery Time</td><td>${s.metrics.recovery_time_seconds || 'N/A'}s</td></tr>
                            <tr><td>Total Duration</td><td>${s.total_duration_seconds || 'N/A'}s</td></tr>
                            <tr><td>Start Time</td><td>${s.start_time_human}</td></tr>
                            <tr><td>End Time</td><td>${s.end_time_human}</td></tr>
                        </table>
                    </div>
                `).join('')}
            `;
        } else {
            // Single scenario report
            container.innerHTML = `
                <div class="scenario">
                    <h2>${reportData.scenario_name} <span class="status ${reportData.status}">${reportData.status.toUpperCase()}</span></h2>
                    <table>
                        <tr><th>Metric</th><th>Value</th></tr>
                        <tr><td>Recovery Time</td><td>${reportData.metrics.recovery_time_seconds || 'N/A'}s</td></tr>
                        <tr><td>Total Duration</td><td>${reportData.total_duration_seconds || 'N/A'}s</td></tr>
                        <tr><td>Start Time</td><td>${reportData.start_time_human}</td></tr>
                        <tr><td>End Time</td><td>${reportData.end_time_human}</td></tr>
                    </table>
                </div>
            `;
        }
    </script>
</body>
</html>
EOF

    log_success "HTML report generated: ${html_report}"
}

# Main execution
main() {
    log_info "Resilience Lab Chaos Runner"
    log_info "Target: ${TARGET}"
    log_info "Dry Run: ${DRY_RUN}"

    # Check dependencies
    if ! check_dependencies; then
        exit 1
    fi

    # Run scenario or suite
    if [ -n "$SCENARIO" ]; then
        local report
        report=$(run_scenario "$SCENARIO")
        generate_html_report "$report"
    else
        local suite_report="${REPORTS_DIR}/suite_${SUITE}_$(date +%Y%m%d_%H%M%S).json"
        if run_suite "$SUITE"; then
            log_success "All scenarios passed!"
            generate_html_report "$suite_report"
            exit 0
        else
            log_error "Some scenarios failed"
            generate_html_report "$suite_report"
            exit 1
        fi
    fi
}

# Show usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
    -t, --target TARGET      Target environment: compose or kubernetes (default: compose)
    -s, --scenario ID        Run specific scenario by ID
    -u, --suite SUITE        Run test suite: smoke_suite, ci_suite, full_suite (default: smoke_suite)
    -d, --dry-run            Dry run mode - don't actually execute chaos
    -v, --verbose            Verbose output
    -h, --help               Show this help message

Examples:
    # Run smoke suite against compose
    $0 --suite smoke_suite

    # Run specific scenario
    $0 --scenario kill-graphql-api

    # Run full suite against k8s
    $0 --target kubernetes --suite full_suite

    # Dry run
    $0 --scenario kill-postgres --dry-run

Environment Variables:
    TARGET               Target environment (compose, kubernetes)
    SCENARIO             Scenario ID to run
    SUITE                Suite to run (smoke_suite, ci_suite, full_suite)
    DRY_RUN              Dry run mode (true, false)
    PROMETHEUS_URL       Prometheus URL for metrics collection
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--target)
            TARGET="$2"
            shift 2
            ;;
        -s|--scenario)
            SCENARIO="$2"
            shift 2
            ;;
        -u|--suite)
            SUITE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main
main
