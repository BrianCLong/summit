#!/bin/bash

# Maestro Conductor vNext - Automated Canary Load Testing Script
# Version: 1.0
# Usage: ./canary-load-test.sh [phase] [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOAD_TESTS_DIR="$PROJECT_ROOT/tests/load"
DEFAULT_BASE_URL="https://api.maestro-conductor.com"
DEFAULT_DURATION=300
RESULTS_DIR="/tmp/canary-load-test-results"

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
Maestro Conductor vNext Canary Load Testing Script

USAGE:
    ./canary-load-test.sh PHASE [OPTIONS]

PHASES:
    phase1      Phase 1 load testing (1% canary, light load)
    phase2      Phase 2 load testing (5% canary, moderate load)
    phase3      Phase 3 load testing (25% canary, heavy load)
    rollout     Full rollout testing (100% canary, production load)
    stress      Stress testing (extreme load scenarios)
    endurance   Endurance testing (sustained load)

OPTIONS:
    --base-url URL          Target base URL (default: $DEFAULT_BASE_URL)
    --duration SECONDS      Test duration (default: $DEFAULT_DURATION)
    --auth-token TOKEN      Authentication token for API calls
    --tenant-id ID          Tenant ID for multi-tenant testing
    --concurrent-users N    Number of concurrent users (default: auto-calculated)
    --ramp-time SECONDS     Ramp-up time (default: 60)
    --output-format FORMAT  Output format: json, html, csv (default: json)
    --save-results          Save results to files
    --real-time-metrics     Enable real-time metrics monitoring
    --slack-webhook URL     Slack webhook for notifications
    --abort-on-failure      Abort test on threshold failures
    --dry-run               Validate configuration without running tests

EXAMPLES:
    ./canary-load-test.sh phase1 --duration 600 --save-results
    ./canary-load-test.sh phase3 --concurrent-users 500 --real-time-metrics
    ./canary-load-test.sh stress --base-url https://staging.maestro.com --abort-on-failure

LOAD PROFILES:
    Phase 1: 50 users, 5 min baseline + 5 min ramp
    Phase 2: 200 users, 10 min sustained load
    Phase 3: 1000 users, 15 min with spikes
    Rollout: 2000 users, 20 min production simulation
    Stress: 5000 users, aggressive load patterns
    Endurance: 500 users, 2+ hours sustained

EOF
}

# Parse command line arguments
PHASE=""
BASE_URL="$DEFAULT_BASE_URL"
DURATION="$DEFAULT_DURATION"
AUTH_TOKEN=""
TENANT_ID=""
CONCURRENT_USERS=""
RAMP_TIME=60
OUTPUT_FORMAT="json"
SAVE_RESULTS=false
REAL_TIME_METRICS=false
SLACK_WEBHOOK=""
ABORT_ON_FAILURE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        phase1|phase2|phase3|rollout|stress|endurance)
            PHASE="$1"
            shift
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --auth-token)
            AUTH_TOKEN="$2"
            shift 2
            ;;
        --tenant-id)
            TENANT_ID="$2"
            shift 2
            ;;
        --concurrent-users)
            CONCURRENT_USERS="$2"
            shift 2
            ;;
        --ramp-time)
            RAMP_TIME="$2"
            shift 2
            ;;
        --output-format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --save-results)
            SAVE_RESULTS=true
            shift
            ;;
        --real-time-metrics)
            REAL_TIME_METRICS=true
            shift
            ;;
        --slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --abort-on-failure)
            ABORT_ON_FAILURE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
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
if [[ -z "$PHASE" ]]; then
    log_error "Phase is required"
    show_help
    exit 1
fi

# Test ID for tracking
TEST_ID="canary-load-test-$(date +%Y%m%d-%H%M%S)-$PHASE"

# Slack notification function
send_notification() {
    local message="$1"
    local color="${2:-good}"
    local urgency="${3:-normal}"

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local payload="{
            \"text\": \"🚀 Canary Load Test Update\",
            \"attachments\": [{
                \"color\": \"$color\",
                \"fields\": [
                    {\"title\": \"Test ID\", \"value\": \"$TEST_ID\", \"short\": true},
                    {\"title\": \"Phase\", \"value\": \"$PHASE\", \"short\": true},
                    {\"title\": \"Target\", \"value\": \"$BASE_URL\", \"short\": false},
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
    log_info "Checking prerequisites for load testing..."

    # Check Artillery installation
    if ! command -v artillery >/dev/null 2>&1; then
        log_error "Artillery is not installed. Install with: npm install -g artillery"
        exit 1
    fi

    # Check test configuration files exist
    if [[ ! -f "$LOAD_TESTS_DIR/production-simulation.yml" ]]; then
        log_error "Production simulation config not found: $LOAD_TESTS_DIR/production-simulation.yml"
        exit 1
    fi

    if [[ ! -f "$LOAD_TESTS_DIR/streaming-metrics.yml" ]]; then
        log_error "Streaming metrics config not found: $LOAD_TESTS_DIR/streaming-metrics.yml"
        exit 1
    fi

    # Test target connectivity
    log_info "Testing connectivity to $BASE_URL..."
    if ! curl -f -s --max-time 10 "$BASE_URL/api/v1/health" >/dev/null 2>&1; then
        log_warning "Health endpoint not accessible - proceeding anyway"
    else
        log_success "Target endpoint is accessible"
    fi

    # Create results directory
    mkdir -p "$RESULTS_DIR"

    log_success "Prerequisites check completed"
}

# Get phase configuration
get_phase_config() {
    local phase="$1"

    case "$phase" in
        phase1)
            echo "users=50 duration=600 ramp=60 profile=light"
            ;;
        phase2)
            echo "users=200 duration=900 ramp=120 profile=moderate"
            ;;
        phase3)
            echo "users=1000 duration=1200 ramp=180 profile=heavy"
            ;;
        rollout)
            echo "users=2000 duration=1800 ramp=300 profile=production"
            ;;
        stress)
            echo "users=5000 duration=900 ramp=60 profile=stress"
            ;;
        endurance)
            echo "users=500 duration=7200 ramp=300 profile=endurance"
            ;;
        *)
            log_error "Unknown phase: $phase"
            exit 1
            ;;
    esac
}

# Generate dynamic Artillery configuration
generate_test_config() {
    local config_str
    config_str=$(get_phase_config "$PHASE")

    # Parse configuration
    local users duration ramp profile
    eval "$config_str"

    # Override with command line parameters if provided
    if [[ -n "$CONCURRENT_USERS" ]]; then
        users="$CONCURRENT_USERS"
    fi

    if [[ "$DURATION" != "$DEFAULT_DURATION" ]]; then
        duration="$DURATION"
    fi

    ramp="$RAMP_TIME"

    log_info "Test configuration: $users users, ${duration}s duration, ${ramp}s ramp-up, $profile profile"

    # Create dynamic config file
    local config_file="$RESULTS_DIR/test-config-$TEST_ID.yml"

    cat > "$config_file" << EOF
# Generated Artillery configuration for $PHASE
# Test ID: $TEST_ID

config:
  target: "$BASE_URL"
  phases:
EOF

    case "$profile" in
        light)
            cat >> "$config_file" << EOF
    - duration: $ramp
      arrivalRate: 1
      rampTo: 5
      name: "Ramp-up"
    - duration: $((duration - ramp))
      arrivalRate: 5
      name: "Steady Load"
EOF
            ;;
        moderate)
            cat >> "$config_file" << EOF
    - duration: $ramp
      arrivalRate: 5
      rampTo: 25
      name: "Ramp-up"
    - duration: $((duration - ramp - 120))
      arrivalRate: 25
      name: "Baseline"
    - duration: 120
      arrivalRate: 25
      rampTo: 50
      name: "Load Increase"
EOF
            ;;
        heavy)
            cat >> "$config_file" << EOF
    - duration: $ramp
      arrivalRate: 10
      rampTo: 100
      name: "Ramp-up"
    - duration: $((duration - ramp - 300))
      arrivalRate: 100
      name: "Sustained Load"
    - duration: 120
      arrivalRate: 100
      rampTo: 200
      name: "Spike Test"
    - duration: 180
      arrivalRate: 200
      rampTo: 50
      name: "Cool-down"
EOF
            ;;
        production)
            cat >> "$config_file" << EOF
    - duration: $ramp
      arrivalRate: 20
      rampTo: 150
      name: "Ramp-up"
    - duration: $((duration - ramp - 600))
      arrivalRate: 150
      name: "Production Load"
    - duration: 180
      arrivalRate: 150
      rampTo: 300
      name: "Peak Load"
    - duration: 240
      arrivalRate: 300
      name: "Stress Phase"
    - duration: 180
      arrivalRate: 300
      rampTo: 100
      name: "Cool-down"
EOF
            ;;
        stress)
            cat >> "$config_file" << EOF
    - duration: $ramp
      arrivalRate: 50
      rampTo: 500
      name: "Aggressive Ramp"
    - duration: $((duration - ramp - 240))
      arrivalRate: 500
      name: "Stress Load"
    - duration: 120
      arrivalRate: 500
      rampTo: 1000
      name: "Maximum Load"
    - duration: 120
      arrivalRate: 1000
      rampTo: 100
      name: "Recovery"
EOF
            ;;
        endurance)
            cat >> "$config_file" << EOF
    - duration: $ramp
      arrivalRate: 10
      rampTo: 50
      name: "Gradual Ramp"
    - duration: $((duration - ramp))
      arrivalRate: 50
      name: "Endurance Load"
EOF
            ;;
    esac

    # Add common configuration
    cat >> "$config_file" << EOF

  defaults:
    headers:
      Content-Type: "application/json"
      User-Agent: "Artillery/CanaryLoadTest-$PHASE"
$(if [[ -n "$AUTH_TOKEN" ]]; then echo "      Authorization: \"Bearer $AUTH_TOKEN\""; fi)

  variables:
$(if [[ -n "$AUTH_TOKEN" ]]; then echo "    auth_token: \"$AUTH_TOKEN\""; fi)
$(if [[ -n "$TENANT_ID" ]]; then echo "    tenant_id: \"$TENANT_ID\""; fi)

  plugins:
    metrics-by-endpoint:
      useOnlyRequestNames: true
    apdex:
      threshold: 500
      tolerated: 1000

# Import scenarios from base configuration
scenarios:
  # Basic health check
  - name: "Health Check"
    weight: 10
    flow:
      - get:
          url: "/api/v1/health"
          name: "GET /health"
          expect:
            - statusCode: 200

  # Workflow operations
  - name: "Workflow Operations"
    weight: 40
    flow:
      - post:
          url: "/api/v1/workflows"
          name: "POST /workflows"
          json:
            name: "Canary Test Workflow {{ \$randomNumber(1, 10000) }}"
            template: "load-test-template"
$(if [[ -n "$TENANT_ID" ]]; then echo "            tenant_id: \"$TENANT_ID\""; fi)
          capture:
            - json: "\$.workflow_id"
              as: "workflow_id"

      - get:
          url: "/api/v1/workflows/{{ workflow_id }}"
          name: "GET /workflows/{id}"

  # ML inference
  - name: "ML Inference"
    weight: 25
    flow:
      - post:
          url: "/api/v1/ml/inference"
          name: "POST /ml/inference"
          json:
            model_id: "test-model"
            input:
              text: "Load test inference {{ \$randomString() }}"

  # Policy evaluation
  - name: "Policy Evaluation"
    weight: 15
    flow:
      - post:
          url: "/api/v1/policies/evaluate"
          name: "POST /policies/evaluate"
          json:
            policy_id: "load-test-policy"
            context:
              action: "test"
$(if [[ -n "$TENANT_ID" ]]; then echo "              tenant_id: \"$TENANT_ID\""; fi)

  # Event operations
  - name: "Event Operations"
    weight: 10
    flow:
      - post:
          url: "/api/v1/events"
          name: "POST /events"
          json:
            aggregate_id: "load-test-{{ \$randomNumber(1, 1000) }}"
            aggregate_type: "test"
            events:
              - event_type: "TestEvent"
                data:
                  test_id: "$TEST_ID"

# Performance thresholds based on phase
thresholds:
EOF

    case "$profile" in
        light|moderate)
            cat >> "$config_file" << EOF
  http_req_duration:
    - threshold: "p(95) < 1000"
      abort_on_failure: $ABORT_ON_FAILURE
  http_req_failed:
    - threshold: "rate < 0.01"
      abort_on_failure: $ABORT_ON_FAILURE
EOF
            ;;
        heavy|production)
            cat >> "$config_file" << EOF
  http_req_duration:
    - threshold: "p(95) < 1500"
      abort_on_failure: $ABORT_ON_FAILURE
  http_req_failed:
    - threshold: "rate < 0.02"
      abort_on_failure: $ABORT_ON_FAILURE
EOF
            ;;
        stress)
            cat >> "$config_file" << EOF
  http_req_duration:
    - threshold: "p(95) < 3000"
      abort_on_failure: false
  http_req_failed:
    - threshold: "rate < 0.05"
      abort_on_failure: $ABORT_ON_FAILURE
EOF
            ;;
        endurance)
            cat >> "$config_file" << EOF
  http_req_duration:
    - threshold: "p(95) < 2000"
      abort_on_failure: $ABORT_ON_FAILURE
  http_req_failed:
    - threshold: "rate < 0.03"
      abort_on_failure: $ABORT_ON_FAILURE
EOF
            ;;
    esac

    echo "$config_file"
}

# Run load test
run_load_test() {
    local config_file="$1"
    local output_file="$RESULTS_DIR/results-$TEST_ID"

    log_info "Starting load test: $TEST_ID"
    send_notification "Load test started"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute artillery run $config_file"
        log_info "Configuration preview:"
        head -50 "$config_file"
        return 0
    fi

    # Build Artillery command
    local artillery_cmd="artillery run \"$config_file\""

    if [[ "$OUTPUT_FORMAT" != "console" ]]; then
        artillery_cmd+=" --output \"${output_file}.json\""
    fi

    # Environment variables for the test
    export BASE_URL="$BASE_URL"
    if [[ -n "$AUTH_TOKEN" ]]; then
        export AUTH_TOKEN="$AUTH_TOKEN"
    fi
    if [[ -n "$TENANT_ID" ]]; then
        export TENANT_ID="$TENANT_ID"
    fi

    # Execute the test
    log_info "Executing: $artillery_cmd"

    if eval "$artillery_cmd"; then
        log_success "Load test completed successfully"
        send_notification "Load test completed successfully" "good"
    else
        log_error "Load test failed or was aborted"
        send_notification "Load test failed or was aborted" "danger"
        return 1
    fi

    # Generate reports if results were saved
    if [[ "$SAVE_RESULTS" == "true" && -f "${output_file}.json" ]]; then
        generate_reports "${output_file}.json"
    fi
}

# Run streaming metrics test
run_streaming_test() {
    if [[ "$REAL_TIME_METRICS" != "true" ]]; then
        return 0
    fi

    log_info "Starting WebSocket streaming metrics test..."

    local streaming_output="$RESULTS_DIR/streaming-$TEST_ID.json"
    local streaming_cmd="artillery run \"$LOAD_TESTS_DIR/streaming-metrics.yml\""

    # Set environment variables
    export BASE_URL="$(echo "$BASE_URL" | sed 's/^http/ws/')"  # Convert to WebSocket URL
    if [[ -n "$AUTH_TOKEN" ]]; then
        export AUTH_TOKEN="$AUTH_TOKEN"
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute WebSocket test"
        return 0
    fi

    # Run in background and capture PID
    eval "$streaming_cmd --output \"$streaming_output\"" &
    local streaming_pid=$!

    log_info "WebSocket test running in background (PID: $streaming_pid)"

    # Return the PID for later cleanup
    echo "$streaming_pid" > "$RESULTS_DIR/streaming-pid-$TEST_ID"
}

# Generate reports
generate_reports() {
    local results_file="$1"

    log_info "Generating test reports..."

    # HTML report
    if command -v artillery >/dev/null 2>&1; then
        local html_file="${results_file%.json}.html"
        if artillery report "$results_file" --output "$html_file" 2>/dev/null; then
            log_success "HTML report generated: $html_file"
        else
            log_warning "Could not generate HTML report"
        fi
    fi

    # Summary report
    local summary_file="${results_file%.json}-summary.txt"
    if command -v jq >/dev/null 2>&1 && [[ -f "$results_file" ]]; then
        {
            echo "==============================================="
            echo "Load Test Summary Report"
            echo "==============================================="
            echo "Test ID: $TEST_ID"
            echo "Phase: $PHASE"
            echo "Target: $BASE_URL"
            echo "Duration: $(jq -r '.aggregate.counters."vusers.created"' "$results_file" 2>/dev/null || echo 'N/A') virtual users created"
            echo "Requests: $(jq -r '.aggregate.counters."http.requests"' "$results_file" 2>/dev/null || echo 'N/A') total requests"
            echo "Responses: $(jq -r '.aggregate.counters."http.responses"' "$results_file" 2>/dev/null || echo 'N/A') total responses"
            echo "Average Response Time: $(jq -r '.aggregate.latency.mean' "$results_file" 2>/dev/null || echo 'N/A')ms"
            echo "P95 Response Time: $(jq -r '.aggregate.latency.p95' "$results_file" 2>/dev/null || echo 'N/A')ms"
            echo "P99 Response Time: $(jq -r '.aggregate.latency.p99' "$results_file" 2>/dev/null || echo 'N/A')ms"
            echo "Error Rate: $(jq -r '.aggregate.counters."http.codes.200" // 0' "$results_file" 2>/dev/null || echo 'N/A')"
            echo "==============================================="
        } > "$summary_file"

        log_success "Summary report generated: $summary_file"
    fi

    # CSV export for analysis
    if [[ "$OUTPUT_FORMAT" == "csv" ]] && command -v jq >/dev/null 2>&1; then
        local csv_file="${results_file%.json}.csv"
        {
            echo "timestamp,metric,value"
            jq -r '.intermediate[] | [.timestamp, "rps", .counters."http.responses"] | @csv' "$results_file" 2>/dev/null
            jq -r '.intermediate[] | [.timestamp, "response_time", .latency.mean] | @csv' "$results_file" 2>/dev/null
        } > "$csv_file" 2>/dev/null && log_success "CSV export generated: $csv_file"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up load test resources..."

    # Stop background WebSocket test if running
    if [[ -f "$RESULTS_DIR/streaming-pid-$TEST_ID" ]]; then
        local streaming_pid
        streaming_pid=$(cat "$RESULTS_DIR/streaming-pid-$TEST_ID")
        if kill -0 "$streaming_pid" 2>/dev/null; then
            log_info "Stopping WebSocket test (PID: $streaming_pid)"
            kill "$streaming_pid" 2>/dev/null || true
        fi
        rm -f "$RESULTS_DIR/streaming-pid-$TEST_ID"
    fi

    # Cleanup temporary files
    find "$RESULTS_DIR" -name "test-config-*.yml" -mtime +1 -delete 2>/dev/null || true
}

# Main execution function
main() {
    log_info "Starting Maestro Conductor vNext canary load testing"
    log_info "Test ID: $TEST_ID"
    log_info "Phase: $PHASE"
    log_info "Target: $BASE_URL"

    # Send initial notification
    send_notification "Load test initialization started"

    # Check prerequisites
    check_prerequisites

    # Generate test configuration
    local config_file
    config_file=$(generate_test_config)
    log_success "Test configuration generated: $config_file"

    # Start streaming test if enabled
    run_streaming_test

    # Run main load test
    if run_load_test "$config_file"; then
        log_success "Load testing completed successfully"
        send_notification "Load testing phase completed successfully" "good"
    else
        log_error "Load testing failed"
        send_notification "Load testing failed - check logs for details" "danger"
        cleanup
        exit 1
    fi

    # Print results summary
    echo ""
    echo "==============================================="
    echo "Load Test Results Summary"
    echo "==============================================="
    echo "Test ID: $TEST_ID"
    echo "Phase: $PHASE"
    echo "Results Directory: $RESULTS_DIR"
    if [[ "$SAVE_RESULTS" == "true" ]]; then
        echo "Results Files:"
        find "$RESULTS_DIR" -name "*$TEST_ID*" -type f | sed 's/^/  /'
    fi
    echo "==============================================="

    # Cleanup
    cleanup

    log_success "Canary load testing completed!"
}

# Trap for cleanup
trap cleanup EXIT

# Execute main function
main "$@"