#!/bin/bash

# IntelGraph Maestro Load Testing Automation Pipeline
# Comprehensive load testing with automated reporting and validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/test-results/load-testing"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_RUN_ID="maestro_load_test_${TIMESTAMP}"

# Load test configuration
TARGET_URL="${TARGET_URL:-http://localhost:5000}"
K8S_NAMESPACE="${K8S_NAMESPACE:-intelgraph-prod}"
TEST_PROFILE="${TEST_PROFILE:-baseline}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
ENABLE_MONITORING="${ENABLE_MONITORING:-true}"
AUTO_SCALE_TEST="${AUTO_SCALE_TEST:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for required tools
    if ! command -v k6 &> /dev/null; then
        missing_tools+=("k6")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        error "Please install missing tools and try again"
        exit 1
    fi
    
    # Check target system availability
    log "🔗 Checking target system availability at $TARGET_URL"
    if ! curl -s --fail --max-time 10 "$TARGET_URL/health" > /dev/null; then
        error "Target system at $TARGET_URL is not accessible"
        exit 1
    fi
    
    success "All prerequisites met"
}

# Setup test environment
setup_test_environment() {
    log "🏗️ Setting up test environment..."
    
    # Create results directory
    mkdir -p "$RESULTS_DIR/$TEST_RUN_ID"
    
    # Generate authentication token for load tests
    log "🔑 Generating test authentication token..."
    AUTH_TOKEN=$(generate_test_token)
    export AUTH_TOKEN
    
    # Save test configuration
    cat > "$RESULTS_DIR/$TEST_RUN_ID/test-config.json" << EOF
{
    "test_run_id": "$TEST_RUN_ID",
    "timestamp": "$TIMESTAMP",
    "target_url": "$TARGET_URL",
    "namespace": "$K8S_NAMESPACE",
    "test_profile": "$TEST_PROFILE",
    "environment": "$(kubectl config current-context)",
    "k6_version": "$(k6 version --quiet)",
    "configuration": {
        "auto_scale_test": $AUTO_SCALE_TEST,
        "monitoring_enabled": $ENABLE_MONITORING
    }
}
EOF
    
    success "Test environment setup complete"
}

# Generate test authentication token
generate_test_token() {
    # In production, this would integrate with your auth system
    # For now, using a placeholder token
    echo "load-test-token-$(date +%s)"
}

# Collect baseline metrics
collect_baseline_metrics() {
    log "📊 Collecting baseline system metrics..."
    
    local baseline_file="$RESULTS_DIR/$TEST_RUN_ID/baseline-metrics.json"
    
    # Kubernetes metrics
    kubectl top nodes > "$RESULTS_DIR/$TEST_RUN_ID/baseline-nodes.txt" 2>/dev/null || true
    kubectl top pods -n "$K8S_NAMESPACE" > "$RESULTS_DIR/$TEST_RUN_ID/baseline-pods.txt" 2>/dev/null || true
    
    # Application metrics via Prometheus (if available)
    if command -v curl &> /dev/null; then
        local prometheus_url="http://prometheus-server.monitoring.svc.cluster.local:80"
        
        # Try to get baseline metrics from Prometheus
        cat > "$baseline_file" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "system_metrics": {
        "maestro_pods_running": $(kubectl get pods -n "$K8S_NAMESPACE" -l app=maestro-conductor --no-headers 2>/dev/null | grep Running | wc -l || echo 0),
        "worker_pods_running": $(kubectl get pods -n "$K8S_NAMESPACE" -l app=task-workers --no-headers 2>/dev/null | grep Running | wc -l || echo 0),
        "postgres_pods_running": $(kubectl get pods -n "$K8S_NAMESPACE" -l app=postgres-conductor --no-headers 2>/dev/null | grep Running | wc -l || echo 0),
        "redis_pods_running": $(kubectl get pods -n "$K8S_NAMESPACE" -l app=redis-conductor --no-headers 2>/dev/null | grep Running | wc -l || echo 0)
    },
    "health_check": {
        "status": "$(curl -s "$TARGET_URL/health" | jq -r '.status' 2>/dev/null || echo 'unknown')",
        "response_time_ms": "$(curl -s -w '%{time_total}' -o /dev/null "$TARGET_URL/health" | awk '{print $1*1000}' || echo 0)"
    }
}
EOF
    fi
    
    success "Baseline metrics collected"
}

# Execute load tests based on profile
execute_load_tests() {
    log "🚀 Starting load test execution (Profile: $TEST_PROFILE)..."
    
    local test_script="$SCRIPT_DIR/k6-load-tests.js"
    local results_file="$RESULTS_DIR/$TEST_RUN_ID/k6-results.json"
    local log_file="$RESULTS_DIR/$TEST_RUN_ID/k6-execution.log"
    
    # Set test profile specific options
    local test_options=""
    case $TEST_PROFILE in
        "baseline")
            test_options="--duration 10m --vus 50"
            ;;
        "peak")
            test_options="--duration 15m --vus 100"
            ;;
        "stress") 
            test_options="--duration 20m --vus 200"
            ;;
        "spike")
            test_options="--duration 5m --vus 50"
            ;;
        "endurance")
            test_options="--duration 60m --vus 75"
            ;;
        *)
            warning "Unknown test profile '$TEST_PROFILE', using baseline"
            test_options="--duration 10m --vus 50"
            ;;
    esac
    
    # Start system monitoring if enabled
    local monitoring_pid=""
    if [ "$ENABLE_MONITORING" = "true" ]; then
        start_system_monitoring &
        monitoring_pid=$!
    fi
    
    # Execute k6 load test
    log "⚡ Running k6 load test..."
    log "Test parameters: $test_options"
    
    if ! k6 run \
        --out json="$results_file" \
        --summary-export="$RESULTS_DIR/$TEST_RUN_ID/summary.json" \
        $test_options \
        -e TARGET_URL="$TARGET_URL" \
        -e AUTH_TOKEN="$AUTH_TOKEN" \
        -e K8S_NAMESPACE="$K8S_NAMESPACE" \
        -e TEST_PROFILE="$TEST_PROFILE" \
        "$test_script" 2>&1 | tee "$log_file"; then
        
        error "Load test execution failed"
        
        # Stop monitoring if it was started
        if [ -n "$monitoring_pid" ]; then
            kill "$monitoring_pid" 2>/dev/null || true
        fi
        
        return 1
    fi
    
    # Stop monitoring
    if [ -n "$monitoring_pid" ]; then
        kill "$monitoring_pid" 2>/dev/null || true
        wait "$monitoring_pid" 2>/dev/null || true
    fi
    
    success "Load test execution completed"
}

# Start system monitoring during test
start_system_monitoring() {
    log "📈 Starting system monitoring..."
    
    local monitoring_dir="$RESULTS_DIR/$TEST_RUN_ID/monitoring"
    mkdir -p "$monitoring_dir"
    
    while true; do
        # Collect resource usage every 30 seconds
        {
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$(kubectl top nodes --no-headers | awk '{cpu+=$2; mem+=$4} END {print cpu","mem}' 2>/dev/null || echo "0,0")"
        } >> "$monitoring_dir/node-usage.csv"
        
        {
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$(kubectl top pods -n "$K8S_NAMESPACE" --no-headers | awk '{cpu+=$2; mem+=$3} END {print cpu","mem}' 2>/dev/null || echo "0,0")"
        } >> "$monitoring_dir/pod-usage.csv"
        
        # Application health check
        {
            local health_status=$(curl -s --max-time 5 "$TARGET_URL/health" | jq -r '.status' 2>/dev/null || echo "unknown")
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$health_status"
        } >> "$monitoring_dir/health-status.csv"
        
        sleep 30
    done &
}

# Test auto-scaling behavior
test_auto_scaling() {
    if [ "$AUTO_SCALE_TEST" = "false" ]; then
        log "⏭️ Auto-scaling test disabled, skipping..."
        return 0
    fi
    
    log "🔄 Testing auto-scaling behavior..."
    
    # Get initial replica count
    local initial_replicas=$(kubectl get deployment maestro-conductor -n "$K8S_NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo 0)
    log "Initial replicas: $initial_replicas"
    
    # Record scaling events during test
    kubectl get events -n "$K8S_NAMESPACE" --field-selector reason=ScalingReplicaSet -w --output-watch-events > "$RESULTS_DIR/$TEST_RUN_ID/scaling-events.log" &
    local events_pid=$!
    
    # Monitor replica count changes
    (
        while true; do
            local current_replicas=$(kubectl get deployment maestro-conductor -n "$K8S_NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo 0)
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$current_replicas" >> "$RESULTS_DIR/$TEST_RUN_ID/replica-count.csv"
            sleep 10
        done
    ) &
    local monitor_pid=$!
    
    # Let the monitoring run during the test
    sleep 10
    
    # Clean up monitoring processes
    kill "$events_pid" "$monitor_pid" 2>/dev/null || true
    wait "$events_pid" "$monitor_pid" 2>/dev/null || true
    
    # Get final replica count
    local final_replicas=$(kubectl get deployment maestro-conductor -n "$K8S_NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo 0)
    log "Final replicas: $final_replicas"
    
    # Analyze scaling behavior
    if [ "$final_replicas" -gt "$initial_replicas" ]; then
        success "✅ Auto-scaling triggered: $initial_replicas → $final_replicas replicas"
    else
        warning "⚠️ No auto-scaling detected (may be normal for low load)"
    fi
}

# Analyze test results
analyze_results() {
    log "📋 Analyzing test results..."
    
    local results_file="$RESULTS_DIR/$TEST_RUN_ID/k6-results.json"
    local summary_file="$RESULTS_DIR/$TEST_RUN_ID/summary.json"
    local analysis_file="$RESULTS_DIR/$TEST_RUN_ID/analysis.json"
    
    if [ ! -f "$results_file" ]; then
        error "Results file not found: $results_file"
        return 1
    fi
    
    # Parse k6 results and generate analysis
    cat > "$analysis_file" << EOF
{
    "test_run_id": "$TEST_RUN_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "test_profile": "$TEST_PROFILE",
    "target_url": "$TARGET_URL",
    "analysis": {
        "total_requests": $(jq '[.data[] | select(.type=="Point" and .metric=="http_reqs")] | length' "$results_file" 2>/dev/null || echo 0),
        "error_rate": $(jq -r '[.data[] | select(.type=="Point" and .metric=="http_req_failed")] | map(.data.value) | add / length * 100' "$results_file" 2>/dev/null || echo 0),
        "avg_response_time": $(jq -r '[.data[] | select(.type=="Point" and .metric=="http_req_duration")] | map(.data.value) | add / length' "$results_file" 2>/dev/null || echo 0),
        "workflow_success_rate": $(jq -r '[.data[] | select(.type=="Point" and .metric=="workflow_success_rate")] | map(.data.value) | add / length * 100' "$results_file" 2>/dev/null || echo 0)
    },
    "thresholds": {
        "error_rate_threshold": 2.0,
        "response_time_threshold": 5000,
        "workflow_success_threshold": 98.0
    }
}
EOF
    
    # Determine test result status
    local error_rate=$(jq -r '.analysis.error_rate' "$analysis_file")
    local response_time=$(jq -r '.analysis.avg_response_time' "$analysis_file")
    local workflow_success=$(jq -r '.analysis.workflow_success_rate' "$analysis_file")
    
    local test_passed=true
    
    if (( $(echo "$error_rate > 2.0" | bc -l) )); then
        warning "❌ Error rate too high: ${error_rate}% (threshold: 2%)"
        test_passed=false
    fi
    
    if (( $(echo "$response_time > 5000" | bc -l) )); then
        warning "❌ Response time too high: ${response_time}ms (threshold: 5000ms)"
        test_passed=false
    fi
    
    if (( $(echo "$workflow_success < 98.0" | bc -l) )); then
        warning "❌ Workflow success rate too low: ${workflow_success}% (threshold: 98%)"
        test_passed=false
    fi
    
    # Update analysis with result
    jq ".result = \"$([ "$test_passed" = true ] && echo "PASSED" || echo "FAILED")\"" "$analysis_file" > "$analysis_file.tmp" && mv "$analysis_file.tmp" "$analysis_file"
    
    if [ "$test_passed" = true ]; then
        success "✅ Load test PASSED - All thresholds met"
    else
        error "❌ Load test FAILED - Some thresholds not met"
        return 1
    fi
}

# Generate comprehensive report
generate_report() {
    log "📝 Generating test report..."
    
    local report_file="$RESULTS_DIR/$TEST_RUN_ID/load-test-report.html"
    
    # Create HTML report
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IntelGraph Maestro Load Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #007bff; }
        .metric-card.success { border-left-color: #28a745; }
        .metric-card.warning { border-left-color: #ffc107; }
        .metric-card.error { border-left-color: #dc3545; }
        .metric-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .metric-label { color: #6c757d; font-size: 0.9em; }
        .section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .section h2 { margin-top: 0; color: #495057; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 0.8em; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #e9ecef; font-weight: 600; }
        .chart-placeholder { height: 200px; background: #e9ecef; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 IntelGraph Maestro Load Test Report</h1>
            <p>Comprehensive Performance Analysis</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>Test Summary</h2>
                <table>
                    <tr><th>Test Run ID</th><td>TEST_RUN_ID_PLACEHOLDER</td></tr>
                    <tr><th>Test Profile</th><td>TEST_PROFILE_PLACEHOLDER</td></tr>
                    <tr><th>Target URL</th><td>TARGET_URL_PLACEHOLDER</td></tr>
                    <tr><th>Execution Time</th><td>TIMESTAMP_PLACEHOLDER</td></tr>
                    <tr><th>Status</th><td><span class="status-badge status-RESULT_PLACEHOLDER">RESULT_PLACEHOLDER</span></td></tr>
                </table>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card success">
                    <div class="metric-label">Total Requests</div>
                    <div class="metric-value">TOTAL_REQUESTS_PLACEHOLDER</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Error Rate</div>
                    <div class="metric-value">ERROR_RATE_PLACEHOLDER%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Avg Response Time</div>
                    <div class="metric-value">AVG_RESPONSE_TIME_PLACEHOLDERms</div>
                </div>
                <div class="metric-card success">
                    <div class="metric-label">Workflow Success Rate</div>
                    <div class="metric-value">WORKFLOW_SUCCESS_PLACEHOLDER%</div>
                </div>
            </div>
            
            <div class="section">
                <h2>Performance Metrics</h2>
                <div class="chart-placeholder">
                    📈 Performance charts would be rendered here in a full implementation
                </div>
            </div>
            
            <div class="section">
                <h2>System Resource Usage</h2>
                <div class="chart-placeholder">
                    💾 Resource usage charts would be rendered here
                </div>
            </div>
            
            <div class="section">
                <h2>Test Configuration</h2>
                <table>
                    <tr><th>Parameter</th><th>Value</th></tr>
                    <tr><td>Auto-scaling Test</td><td>AUTO_SCALE_TEST_PLACEHOLDER</td></tr>
                    <tr><td>Monitoring Enabled</td><td>ENABLE_MONITORING_PLACEHOLDER</td></tr>
                    <tr><td>Kubernetes Namespace</td><td>K8S_NAMESPACE_PLACEHOLDER</td></tr>
                    <tr><td>k6 Version</td><td>K6_VERSION_PLACEHOLDER</td></tr>
                </table>
            </div>
        </div>
    </div>
    
    <script>
        // In a full implementation, this would include interactive charts
        console.log('IntelGraph Maestro Load Test Report Generated');
    </script>
</body>
</html>
EOF
    
    # Replace placeholders with actual values
    if [ -f "$RESULTS_DIR/$TEST_RUN_ID/analysis.json" ]; then
        local analysis_data=$(cat "$RESULTS_DIR/$TEST_RUN_ID/analysis.json")
        
        sed -i.bak \
            -e "s/TEST_RUN_ID_PLACEHOLDER/$TEST_RUN_ID/g" \
            -e "s/TEST_PROFILE_PLACEHOLDER/$TEST_PROFILE/g" \
            -e "s/TARGET_URL_PLACEHOLDER/$TARGET_URL/g" \
            -e "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" \
            -e "s/AUTO_SCALE_TEST_PLACEHOLDER/$AUTO_SCALE_TEST/g" \
            -e "s/ENABLE_MONITORING_PLACEHOLDER/$ENABLE_MONITORING/g" \
            -e "s/K8S_NAMESPACE_PLACEHOLDER/$K8S_NAMESPACE/g" \
            -e "s/K6_VERSION_PLACEHOLDER/$(k6 version --quiet)/g" \
            "$report_file" && rm "$report_file.bak"
        
        # Extract metrics from analysis
        local total_requests=$(echo "$analysis_data" | jq -r '.analysis.total_requests // 0')
        local error_rate=$(echo "$analysis_data" | jq -r '.analysis.error_rate // 0' | xargs printf "%.2f")
        local response_time=$(echo "$analysis_data" | jq -r '.analysis.avg_response_time // 0' | xargs printf "%.0f")
        local workflow_success=$(echo "$analysis_data" | jq -r '.analysis.workflow_success_rate // 0' | xargs printf "%.2f")
        local result=$(echo "$analysis_data" | jq -r '.result // "UNKNOWN"')
        
        sed -i.bak \
            -e "s/TOTAL_REQUESTS_PLACEHOLDER/$total_requests/g" \
            -e "s/ERROR_RATE_PLACEHOLDER/$error_rate/g" \
            -e "s/AVG_RESPONSE_TIME_PLACEHOLDER/$response_time/g" \
            -e "s/WORKFLOW_SUCCESS_PLACEHOLDER/$workflow_success/g" \
            -e "s/RESULT_PLACEHOLDER/$result/g" \
            "$report_file" && rm "$report_file.bak"
    fi
    
    success "Report generated: $report_file"
}

# Send notifications
send_notifications() {
    if [ -z "$SLACK_WEBHOOK" ]; then
        log "📬 Slack webhook not configured, skipping notifications"
        return 0
    fi
    
    log "📬 Sending notifications..."
    
    local analysis_file="$RESULTS_DIR/$TEST_RUN_ID/analysis.json"
    if [ ! -f "$analysis_file" ]; then
        warning "Analysis file not found, skipping notifications"
        return 0
    fi
    
    local result=$(jq -r '.result' "$analysis_file")
    local error_rate=$(jq -r '.analysis.error_rate' "$analysis_file")
    local response_time=$(jq -r '.analysis.avg_response_time' "$analysis_file")
    local workflow_success=$(jq -r '.analysis.workflow_success_rate' "$analysis_file")
    
    local color="good"
    local emoji="✅"
    if [ "$result" = "FAILED" ]; then
        color="danger"
        emoji="❌"
    fi
    
    local slack_payload=$(cat << EOF
{
    "username": "IntelGraph Load Test",
    "icon_emoji": ":bar_chart:",
    "attachments": [
        {
            "color": "$color",
            "title": "$emoji Maestro Load Test Results",
            "fields": [
                {
                    "title": "Test Profile",
                    "value": "$TEST_PROFILE",
                    "short": true
                },
                {
                    "title": "Result",
                    "value": "$result",
                    "short": true
                },
                {
                    "title": "Error Rate",
                    "value": "${error_rate}%",
                    "short": true
                },
                {
                    "title": "Avg Response Time",
                    "value": "${response_time}ms",
                    "short": true
                },
                {
                    "title": "Workflow Success Rate",
                    "value": "${workflow_success}%",
                    "short": true
                },
                {
                    "title": "Test Run ID",
                    "value": "$TEST_RUN_ID",
                    "short": true
                }
            ],
            "footer": "IntelGraph Maestro Load Testing",
            "ts": $(date +%s)
        }
    ]
}
EOF
)
    
    if curl -X POST -H 'Content-type: application/json' \
        --data "$slack_payload" \
        "$SLACK_WEBHOOK" >/dev/null 2>&1; then
        success "Slack notification sent"
    else
        warning "Failed to send Slack notification"
    fi
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up..."
    
    # Kill any remaining background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Reset any temporary configurations
    # (Implementation specific cleanup would go here)
    
    log "Cleanup completed"
}

# Main execution function
main() {
    log "🎯 Starting IntelGraph Maestro Load Testing Pipeline"
    log "Target: $TARGET_URL"
    log "Profile: $TEST_PROFILE"
    log "Namespace: $K8S_NAMESPACE"
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Execute pipeline steps
    check_prerequisites
    setup_test_environment
    collect_baseline_metrics
    
    if ! execute_load_tests; then
        error "Load test execution failed"
        exit 1
    fi
    
    test_auto_scaling
    
    if ! analyze_results; then
        warning "Load test analysis indicates performance issues"
        # Continue to generate report even if analysis shows failures
    fi
    
    generate_report
    send_notifications
    
    success "🏁 Load testing pipeline completed"
    success "Results available at: $RESULTS_DIR/$TEST_RUN_ID"
    
    # Return exit code based on test results
    if [ -f "$RESULTS_DIR/$TEST_RUN_ID/analysis.json" ]; then
        local result=$(jq -r '.result' "$RESULTS_DIR/$TEST_RUN_ID/analysis.json")
        if [ "$result" = "FAILED" ]; then
            exit 1
        fi
    fi
}

# Help function
show_help() {
    cat << EOF
IntelGraph Maestro Load Testing Pipeline

Usage: $0 [OPTIONS]

Options:
    -u, --url URL               Target URL for load testing (default: http://localhost:5000)
    -p, --profile PROFILE       Test profile: baseline, peak, stress, spike, endurance (default: baseline)
    -n, --namespace NAMESPACE   Kubernetes namespace (default: intelgraph-prod)
    -s, --slack-webhook URL     Slack webhook URL for notifications
    -a, --auto-scale           Enable auto-scaling behavior testing
    -m, --no-monitoring        Disable system monitoring during tests
    -h, --help                 Show this help message

Test Profiles:
    baseline    - Normal production load simulation (50 VUs, 10min)
    peak        - Expected peak traffic (100 VUs, 15min)
    stress      - Beyond normal capacity (200 VUs, 20min)
    spike       - Sudden traffic increase (300 VUs spike, 5min)
    endurance   - Long duration test (75 VUs, 60min)

Environment Variables:
    TARGET_URL          - Override target URL
    K8S_NAMESPACE       - Override Kubernetes namespace  
    SLACK_WEBHOOK       - Slack webhook URL for notifications
    AUTO_SCALE_TEST     - Enable auto-scaling testing (true/false)
    ENABLE_MONITORING   - Enable system monitoring (true/false)

Examples:
    $0 --profile peak --auto-scale
    $0 --url https://maestro.example.com --slack-webhook https://hooks.slack.com/...
    TARGET_URL=https://staging.example.com $0 --profile stress

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            TARGET_URL="$2"
            shift 2
            ;;
        -p|--profile)
            TEST_PROFILE="$2"
            shift 2
            ;;
        -n|--namespace)
            K8S_NAMESPACE="$2"
            shift 2
            ;;
        -s|--slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        -a|--auto-scale)
            AUTO_SCALE_TEST="true"
            shift
            ;;
        -m|--no-monitoring)
            ENABLE_MONITORING="false"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"