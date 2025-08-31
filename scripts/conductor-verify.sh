#!/usr/bin/env bash
set -euo pipefail

# Conductor Go-Live Verifier
# Performs comprehensive health, metrics, GraphQL, and JSON-RPC MCP synthetics
# Plus minimal e2e "plan → conduct" flow validation

# Configuration
SRV=${SRV:-http://localhost:4000}
UI=${UI:-http://localhost:3000}
GOPS=${GOPS:-http://localhost:8081}
FILES=${FILES:-http://localhost:8082}
TIMEOUT=${TIMEOUT:-30}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test wrapper
run_test() {
    local test_name="$1"
    shift
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if "$@"; then
        pass "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        fail "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Individual test functions
test_health_surfaces() {
    # Main conductor health
    if ! curl -fsS --max-time $TIMEOUT "$SRV/health/conductor" | jq -e '.status' >/dev/null; then
        return 1
    fi
    
    # GraphOps MCP health
    if ! curl -fsS --max-time $TIMEOUT "$GOPS/health" | jq -e '.status' >/dev/null; then
        return 1
    fi
    
    # Files MCP health
    if ! curl -fsS --max-time $TIMEOUT "$FILES/health" | jq -e '.status' >/dev/null; then
        return 1
    fi
    
    return 0
}

test_prometheus_metrics() {
    # Check that conductor metrics are being exposed
    if ! curl -fsS --max-time $TIMEOUT "$SRV/metrics" | grep -E 'conductor_|process_cpu_seconds_total' | head -n 20 | grep -q conductor_; then
        return 1
    fi
    return 0
}

test_graphql_health() {
    # Basic GraphQL health check
    local response
    response=$(curl -fsS --max-time $TIMEOUT -X POST "$SRV/graphql" \
        -H 'content-type: application/json' \
        --data '{"query":"query { __schema { queryType { name } } }"}')
    
    if ! echo "$response" | jq -e '.data.__schema.queryType.name' >/dev/null; then
        return 1
    fi
    return 0
}

test_preview_routing() {
    # Test conductor routing preview
    local response
    response=$(curl -fsS --max-time $TIMEOUT -X POST "$SRV/graphql" \
        -H 'content-type: application/json' \
        --data '{
            "query": "query PreviewRouting($input: ConductInput!) { previewRouting(input: $input) { expert reason confidence } }",
            "variables": {
                "input": {
                    "task": "Find connections between Acme LLC and Jane Doe via 2023-2025 filings",
                    "maxLatencyMs": 30000
                }
            }
        }')
    
    if ! echo "$response" | jq -e '.data.previewRouting.expert' >/dev/null; then
        return 1
    fi
    return 0
}

test_conduct_execution() {
    # Test conductor execution (should route but may use mock implementations)
    local response
    response=$(curl -fsS --max-time $TIMEOUT -X POST "$SRV/graphql" \
        -H 'content-type: application/json' \
        --data '{
            "query": "mutation Conduct($input: ConductInput!) { conduct(input: $input) { expertId auditId latencyMs cost } }",
            "variables": {
                "input": {
                    "task": "List last 3 nodes created and export summary",
                    "maxLatencyMs": 30000
                }
            }
        }')
    
    if ! echo "$response" | jq -e '.data.conduct.expertId' >/dev/null; then
        return 1
    fi
    return 0
}

test_mcp_graphops_jsonrpc() {
    # Test GraphOps MCP JSON-RPC ping
    local response
    response=$(curl -fsS --max-time $TIMEOUT -X POST "$GOPS/jsonrpc" \
        -H 'content-type: application/json' \
        --data '{"jsonrpc":"2.0","id":"1","method":"ping"}')
    
    if ! echo "$response" | jq -e '.result' >/dev/null 2>&1 && 
       ! echo "$response" | jq -e '.id' >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

test_mcp_files_jsonrpc() {
    # Test Files MCP JSON-RPC ping  
    local response
    response=$(curl -fsS --max-time $TIMEOUT -X POST "$FILES/jsonrpc" \
        -H 'content-type: application/json' \
        --data '{"jsonrpc":"2.0","id":"2","method":"ping"}')
    
    if ! echo "$response" | jq -e '.result' >/dev/null 2>&1 && 
       ! echo "$response" | jq -e '.id' >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

test_ui_accessibility() {
    # Test that Conductor Studio UI is accessible
    local status_code
    status_code=$(curl -fsS --max-time $TIMEOUT -o /dev/null -w "%{http_code}" "$UI/conductor")
    
    if [ "$status_code" != "200" ]; then
        return 1
    fi
    return 0
}

test_metrics_endpoint() {
    # Verify key conductor metrics are present
    local metrics
    metrics=$(curl -fsS --max-time $TIMEOUT "$SRV/metrics")
    
    local required_metrics=(
        "conductor_router_decisions_total"
        "conductor_expert_latency_seconds"
        "conductor_active_tasks"
        "conductor_mcp_operations_total"
    )
    
    for metric in "${required_metrics[@]}"; do
        if ! echo "$metrics" | grep -q "^$metric"; then
            return 1
        fi
    done
    return 0
}

test_security_headers() {
    # Check that security headers are present
    local headers
    headers=$(curl -fsS --max-time $TIMEOUT -I "$SRV/health/conductor")
    
    if ! echo "$headers" | grep -qi "x-conductor-version"; then
        return 1
    fi
    return 0
}

# Performance benchmarks
benchmark_routing_latency() {
    say "Running routing latency benchmark..."
    
    local total_time=0
    local iterations=5
    local max_acceptable_ms=500
    
    for i in $(seq 1 $iterations); do
        local start_time=$(date +%s%3N)
        
        curl -fsS --max-time $TIMEOUT -X POST "$SRV/graphql" \
            -H 'content-type: application/json' \
            --data '{"query":"query PreviewRouting($input: ConductInput!) { previewRouting(input: $input) { expert confidence } }","variables":{"input":{"task":"Quick routing test","maxLatencyMs":5000}}}' \
            >/dev/null
        
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        total_time=$((total_time + duration))
        
        printf "  Iteration %d: %dms\n" $i $duration
    done
    
    local avg_time=$((total_time / iterations))
    printf "  Average routing time: %dms\n" $avg_time
    
    if [ $avg_time -gt $max_acceptable_ms ]; then
        warn "Routing latency ${avg_time}ms exceeds threshold ${max_acceptable_ms}ms"
        return 1
    else
        pass "Routing latency ${avg_time}ms within acceptable range"
        return 0
    fi
}

# Main verification flow
main() {
    say "🧠 Conductor Go-Live Comprehensive Verifier"
    say "============================================"
    printf "Endpoints: Server=%s, UI=%s, GraphOps=%s, Files=%s\n" "$SRV" "$UI" "$GOPS" "$FILES"
    printf "Timeout: %ds\n" "$TIMEOUT"
    
    say "Health Surfaces"
    run_test "Health endpoints responding" test_health_surfaces
    
    say "Metrics & Observability"
    run_test "Prometheus metrics available" test_prometheus_metrics
    run_test "Key conductor metrics present" test_metrics_endpoint
    run_test "Security headers present" test_security_headers
    
    say "GraphQL API"
    run_test "GraphQL endpoint healthy" test_graphql_health
    run_test "Routing preview functional" test_preview_routing
    run_test "Task execution functional" test_conduct_execution
    
    say "MCP JSON-RPC Services"
    run_test "GraphOps MCP responding" test_mcp_graphops_jsonrpc
    run_test "Files MCP responding" test_mcp_files_jsonrpc
    
    say "User Interface"
    run_test "Conductor Studio accessible" test_ui_accessibility
    
    say "Performance Benchmarks"
    if benchmark_routing_latency; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
    
    # Summary
    say "Verification Summary"
    printf "Tests Run: %d\n" $TESTS_RUN
    printf "Passed: ${GREEN}%d${NC}\n" $TESTS_PASSED  
    printf "Failed: ${RED}%d${NC}\n" $TESTS_FAILED
    
    local success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))
    printf "Success Rate: %d%%\n" $success_rate
    
    if [ $TESTS_FAILED -eq 0 ]; then
        say "🎉 All verifications passed! Conductor is go-live ready."
        
        printf "\n📚 Quick Start Commands:\n"
        printf "  Open Studio: just studio-open\n"
        printf "  Run smoke test: just conductor-smoke  \n"
        printf "  Check status: just conductor-status\n"
        printf "  View logs: just conductor-logs\n"
        
        return 0
    elif [ $success_rate -ge 90 ]; then
        warn "Minor issues detected but system is operational"
        printf "\n🔧 Consider investigating failed tests before production deployment\n"
        return 1
    else
        fail "Critical issues detected - system not ready for production"
        printf "\n🚨 Fix failed tests before proceeding\n"
        return 2
    fi
}

# Show detailed output for debugging
if [ "${VERBOSE:-}" = "true" ]; then
    set -x
fi

# Parse command line arguments
case "${1:-}" in
    --help)
        echo "Usage: $0 [--verbose] [--timeout=N]"
        echo ""
        echo "Environment variables:"
        echo "  SRV=http://localhost:4000      Server endpoint"
        echo "  UI=http://localhost:3000       UI endpoint"  
        echo "  GOPS=http://localhost:8081     GraphOps MCP endpoint"
        echo "  FILES=http://localhost:8082    Files MCP endpoint"
        echo "  TIMEOUT=30                     Request timeout in seconds"
        echo "  VERBOSE=true                   Enable verbose output"
        exit 0
        ;;
    --verbose)
        export VERBOSE=true
        ;;
    --timeout=*)
        export TIMEOUT="${1#*=}"
        ;;
esac

# Verify prerequisites
for cmd in curl jq; do
    if ! command -v $cmd >/dev/null 2>&1; then
        fail "Required command not found: $cmd"
        exit 1
    fi
done

# Run main verification
main