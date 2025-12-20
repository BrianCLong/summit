#!/usr/bin/env bash
#
# Query Performance Benchmark Suite
# Validates that P95 query latency < 1.5s
#

set -euo pipefail

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
BENCHMARK_DURATION="${BENCHMARK_DURATION:-300}"  # 5 minutes
TARGET_P95_LATENCY="${TARGET_P95_LATENCY:-1.5}"  # seconds
CONCURRENT_USERS="${CONCURRENT_USERS:-50}"
REPORT_DIR="${REPORT_DIR:-./benchmark-reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$REPORT_DIR"

log_info() {
    echo "[$(date +%H:%M:%S)] [INFO] $*"
}

log_success() {
    echo -e "\033[0;32m[$(date +%H:%M:%S)] [SUCCESS]\033[0m $*"
}

log_error() {
    echo -e "\033[0;31m[$(date +%H:%M:%S)] [ERROR]\033[0m $*"
}

# Benchmark 1: Simple Entity Query
benchmark_entity_query() {
    log_info "Running entity query benchmark..."

    local results="${REPORT_DIR}/entity_query_${TIMESTAMP}.json"

    wrk -t4 -c"$CONCURRENT_USERS" -d"${BENCHMARK_DURATION}s" \
        -s - "$API_URL/graphql" <<'EOF' | tee "$results"
wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.body = '{"query": "{ entities(limit: 10) { id name type } }"}'
EOF

    log_success "Entity query benchmark complete"
}

# Benchmark 2: Complex Graph Query
benchmark_graph_query() {
    log_info "Running complex graph query benchmark..."

    local results="${REPORT_DIR}/graph_query_${TIMESTAMP}.json"

    wrk -t4 -c"$CONCURRENT_USERS" -d"${BENCHMARK_DURATION}s" \
        -s - "$API_URL/graphql" <<'EOF' | tee "$results"
wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.body = '{"query": "{ entity(id: \\"test-id\\") { id relationships { target { name } } } }"}'
EOF

    log_success "Graph query benchmark complete"
}

# Benchmark 3: Mixed Workload
benchmark_mixed_workload() {
    log_info "Running mixed workload benchmark..."

    local results="${REPORT_DIR}/mixed_${TIMESTAMP}.json"

    # Use Locust for more realistic mixed workload
    if command -v locust &> /dev/null; then
        locust -f /home/user/summit/scripts/locustfile.py \
            --headless \
            --users "$CONCURRENT_USERS" \
            --spawn-rate 10 \
            --run-time "${BENCHMARK_DURATION}s" \
            --host "$API_URL" \
            --json \
            > "$results"
    else
        log_error "Locust not installed, skipping mixed workload test"
    fi

    log_success "Mixed workload benchmark complete"
}

# Query Prometheus for metrics
query_prometheus_metrics() {
    log_info "Querying Prometheus for P95 latency..."

    # P95 latency over benchmark period
    local p95_query='histogram_quantile(0.95, rate(intelgraph_query_latency_seconds_bucket[5m]))'
    local p95_result=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=${p95_query}" | jq -r '.data.result[0].value[1]')

    if [[ -z "$p95_result" || "$p95_result" == "null" ]]; then
        log_error "Failed to query P95 latency from Prometheus"
        return 1
    fi

    log_info "P95 latency: ${p95_result}s"

    # Check acceptance criteria
    if (( $(echo "$p95_result < $TARGET_P95_LATENCY" | bc -l) )); then
        log_success "✓ P95 latency (${p95_result}s) meets acceptance criteria (<${TARGET_P95_LATENCY}s)"
        return 0
    else
        log_error "✗ P95 latency (${p95_result}s) exceeds acceptance criteria (<${TARGET_P95_LATENCY}s)"
        return 1
    fi
}

# Generate benchmark report
generate_report() {
    local p95_passed="$1"

    log_info "Generating benchmark report..."

    cat > "${REPORT_DIR}/report_${TIMESTAMP}.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "duration_seconds": $BENCHMARK_DURATION,
  "concurrent_users": $CONCURRENT_USERS,
  "target_p95_latency": $TARGET_P95_LATENCY,
  "p95_acceptance_test": $([ "$p95_passed" -eq 0 ] && echo "true" || echo "false"),
  "benchmarks_run": [
    "entity_query",
    "graph_query",
    "mixed_workload"
  ]
}
EOF

    echo ""
    echo "========================================="
    echo "  Benchmark Summary"
    echo "========================================="
    echo "Duration: ${BENCHMARK_DURATION}s"
    echo "Concurrent Users: $CONCURRENT_USERS"
    echo "Target P95 Latency: <${TARGET_P95_LATENCY}s"
    echo "P95 Test: $([ "$p95_passed" -eq 0 ] && echo "PASSED ✓" || echo "FAILED ✗")"
    echo "========================================="
    echo ""
    echo "Report: ${REPORT_DIR}/report_${TIMESTAMP}.json"
}

# Main
main() {
    log_info "Starting benchmark suite..."

    # Run benchmarks
    benchmark_entity_query
    sleep 10
    benchmark_graph_query
    sleep 10
    benchmark_mixed_workload

    # Wait for metrics to propagate
    log_info "Waiting for metrics to propagate..."
    sleep 30

    # Validate P95 latency
    query_prometheus_metrics
    local p95_passed=$?

    # Generate report
    generate_report "$p95_passed"

    # Exit with appropriate code
    exit "$p95_passed"
}

main
