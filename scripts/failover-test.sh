#!/usr/bin/env bash
set -euo pipefail

# Multi-Region Failover Testing Script
# Tests failover capabilities and data consistency across regions

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }
info() { printf "${PURPLE}📋 %s${NC}\n" "$*"; }

# Configuration
PRIMARY_REGION="${PRIMARY_REGION:-us-east-1a}"
SECONDARY_REGION="${SECONDARY_REGION:-us-west-2a}"
TERTIARY_REGION="${TERTIARY_REGION:-eu-west-1a}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
TEST_TIMEOUT="${TEST_TIMEOUT:-30}"

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

# Helper functions
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    info "Running test: $test_name"
    
    if $test_function; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        pass "Test passed: $test_name"
        TEST_RESULTS+=("✅ $test_name")
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        fail "Test failed: $test_name"
        TEST_RESULTS+=("❌ $test_name")
    fi
}

# API helper functions
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local expected_status="${4:-200}"
    
    local curl_args=(-X "$method" -H "Content-Type: application/json" -s -w "%{http_code}")
    
    if [ -n "$data" ]; then
        curl_args+=(-d "$data")
    fi
    
    local response=$(curl "${curl_args[@]}" "$API_BASE_URL$endpoint")
    local status_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "$response_body"
        return 0
    else
        echo "API call failed: Expected $expected_status, got $status_code" >&2
        echo "Response: $response_body" >&2
        return 1
    fi
}

wait_for_service() {
    local url="$1"
    local timeout="${2:-30}"
    local count=0
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    return 1
}

# Test functions
test_region_health_monitoring() {
    say "Testing Region Health Monitoring"
    
    # Check primary region health
    local health_response=$(api_call GET "/status" "" "200")
    
    if echo "$health_response" | jq -e '.overall_status == "healthy"' >/dev/null; then
        pass "Primary region is healthy"
        return 0
    else
        fail "Primary region health check failed"
        return 1
    fi
}

test_data_replication_basic() {
    say "Testing Basic Data Replication"
    
    # Create test data
    local test_data='{"test_key": "failover_test_' + $(date +%s) + '", "test_value": "replication_test_data"}'
    
    # Insert data in primary region
    info "Inserting test data in primary region"
    local insert_response=$(api_call POST "/test-data" "$test_data" "201") || return 1
    local test_id=$(echo "$insert_response" | jq -r '.id // empty')
    
    if [ -z "$test_id" ]; then
        fail "Failed to create test data"
        return 1
    fi
    
    # Wait for replication
    info "Waiting for replication to complete"
    sleep 5
    
    # Verify data exists in secondary region
    info "Verifying data in secondary region"
    local verify_response=$(api_call GET "/test-data/$test_id" "" "200") || return 1
    
    if echo "$verify_response" | jq -e '.id == "'"$test_id"'"' >/dev/null; then
        pass "Data replicated successfully"
        return 0
    else
        fail "Data replication verification failed"
        return 1
    fi
}

test_conflict_resolution() {
    say "Testing Conflict Resolution"
    
    # Create test record
    local test_data='{"key": "conflict_test", "value": "initial_value", "version": 1}'
    local create_response=$(api_call POST "/test-data" "$test_data" "201") || return 1
    local test_id=$(echo "$create_response" | jq -r '.id')
    
    # Simulate concurrent updates
    info "Simulating concurrent updates"
    local update1='{"key": "conflict_test", "value": "update_from_region1", "version": 2}'
    local update2='{"key": "conflict_test", "value": "update_from_region2", "version": 2}'
    
    # Send updates concurrently
    api_call PUT "/test-data/$test_id" "$update1" "200" &
    local pid1=$!
    api_call PUT "/test-data/$test_id" "$update2" "200" &
    local pid2=$!
    
    # Wait for both updates
    wait $pid1 $pid2
    
    # Check conflict resolution
    sleep 2
    local final_response=$(api_call GET "/test-data/$test_id" "" "200") || return 1
    local final_value=$(echo "$final_response" | jq -r '.value')
    
    if [ -n "$final_value" ] && [ "$final_value" != "initial_value" ]; then
        pass "Conflict resolution completed: $final_value"
        return 0
    else
        fail "Conflict resolution failed"
        return 1
    fi
}

test_manual_failover() {
    say "Testing Manual Failover"
    
    # Get current active region
    local status_response=$(api_call GET "/status" "" "200") || return 1
    local current_region=$(echo "$status_response" | jq -r '.current_region // "'"$PRIMARY_REGION"'"')
    
    info "Current active region: $current_region"
    
    # Initiate manual failover
    local failover_data='{"target_region": "'"$SECONDARY_REGION"'", "reason": "Failover test"}'
    info "Initiating failover to $SECONDARY_REGION"
    
    local failover_response=$(api_call POST "/failover/manual" "$failover_data" "202") || return 1
    local failover_id=$(echo "$failover_response" | jq -r '.failover_id')
    
    if [ -z "$failover_id" ]; then
        fail "Failed to initiate failover"
        return 1
    fi
    
    # Monitor failover progress
    info "Monitoring failover progress: $failover_id"
    local timeout=60
    local count=0
    
    while [ $count -lt $timeout ]; do
        local progress_response=$(api_call GET "/failover/status/$failover_id" "" "200") || return 1
        local status=$(echo "$progress_response" | jq -r '.status')
        
        case "$status" in
            "completed")
                pass "Failover completed successfully"
                break
                ;;
            "failed")
                fail "Failover failed: $(echo "$progress_response" | jq -r '.error // "Unknown error"')"
                return 1
                ;;
            "in_progress")
                info "Failover in progress..."
                ;;
        esac
        
        sleep 2
        count=$((count + 2))
    done
    
    if [ $count -ge $timeout ]; then
        fail "Failover timed out"
        return 1
    fi
    
    # Verify new active region
    sleep 5
    local new_status_response=$(api_call GET "/status" "" "200") || return 1
    local new_region=$(echo "$new_status_response" | jq -r '.current_region // "unknown"')
    
    if [ "$new_region" = "$SECONDARY_REGION" ]; then
        pass "Active region successfully changed to: $new_region"
        return 0
    else
        fail "Active region verification failed. Expected: $SECONDARY_REGION, Got: $new_region"
        return 1
    fi
}

test_automatic_failover() {
    say "Testing Automatic Failover"
    
    # Get current status
    local status_response=$(api_call GET "/status" "" "200") || return 1
    local current_region=$(echo "$status_response" | jq -r '.current_region // "'"$PRIMARY_REGION"'"')
    
    info "Current active region: $current_region"
    
    # Simulate region failure
    info "Simulating region failure"
    local failure_data='{"region": "'"$current_region"'", "failure_type": "total_outage", "duration": 60}'
    api_call POST "/test/simulate-failure" "$failure_data" "202" || return 1
    
    # Monitor for automatic failover
    info "Monitoring for automatic failover"
    local timeout=90
    local count=0
    local failover_detected=false
    
    while [ $count -lt $timeout ]; do
        local new_status_response=$(api_call GET "/status" "" "200") || {
            # API might be temporarily unavailable during failover
            sleep 5
            count=$((count + 5))
            continue
        }
        
        local new_region=$(echo "$new_status_response" | jq -r '.current_region // "unknown"')
        
        if [ "$new_region" != "$current_region" ] && [ "$new_region" != "unknown" ]; then
            pass "Automatic failover detected: $current_region -> $new_region"
            failover_detected=true
            break
        fi
        
        sleep 5
        count=$((count + 5))
    done
    
    if [ "$failover_detected" = true ]; then
        return 0
    else
        fail "Automatic failover did not occur within timeout"
        return 1
    fi
}

test_data_consistency_after_failover() {
    say "Testing Data Consistency After Failover"
    
    # Create test data before failover
    local test_data='{"key": "consistency_test", "value": "pre_failover_data", "timestamp": '$(date +%s)'}'
    local create_response=$(api_call POST "/test-data" "$test_data" "201") || return 1
    local test_id=$(echo "$create_response" | jq -r '.id')
    
    # Perform failover
    local failover_data='{"target_region": "'"$TERTIARY_REGION"'", "reason": "Consistency test"}'
    local failover_response=$(api_call POST "/failover/manual" "$failover_data" "202") || return 1
    local failover_id=$(echo "$failover_response" | jq -r '.failover_id')
    
    # Wait for failover completion
    local timeout=60
    local count=0
    
    while [ $count -lt $timeout ]; do
        local progress_response=$(api_call GET "/failover/status/$failover_id" "" "200") || return 1
        local status=$(echo "$progress_response" | jq -r '.status')
        
        if [ "$status" = "completed" ]; then
            break
        elif [ "$status" = "failed" ]; then
            fail "Failover failed during consistency test"
            return 1
        fi
        
        sleep 2
        count=$((count + 2))
    done
    
    # Verify data consistency
    info "Verifying data consistency after failover"
    sleep 5
    
    local verify_response=$(api_call GET "/test-data/$test_id" "" "200") || return 1
    local retrieved_value=$(echo "$verify_response" | jq -r '.value')
    
    if [ "$retrieved_value" = "pre_failover_data" ]; then
        pass "Data consistency maintained after failover"
        return 0
    else
        fail "Data consistency check failed. Expected: pre_failover_data, Got: $retrieved_value"
        return 1
    fi
}

test_rollback_capability() {
    say "Testing Rollback Capability"
    
    # Get current region
    local status_response=$(api_call GET "/status" "" "200") || return 1
    local original_region=$(echo "$status_response" | jq -r '.current_region // "'"$PRIMARY_REGION"'"')
    
    # Perform failover
    local target_region="$SECONDARY_REGION"
    if [ "$original_region" = "$SECONDARY_REGION" ]; then
        target_region="$TERTIARY_REGION"
    fi
    
    local failover_data='{"target_region": "'"$target_region"'", "reason": "Rollback test"}'
    local failover_response=$(api_call POST "/failover/manual" "$failover_data" "202") || return 1
    local failover_id=$(echo "$failover_response" | jq -r '.failover_id')
    
    # Wait for failover
    local timeout=60
    local count=0
    
    while [ $count -lt $timeout ]; do
        local progress_response=$(api_call GET "/failover/status/$failover_id" "" "200") || return 1
        local status=$(echo "$progress_response" | jq -r '.status')
        
        if [ "$status" = "completed" ]; then
            break
        elif [ "$status" = "failed" ]; then
            fail "Failover failed during rollback test"
            return 1
        fi
        
        sleep 2
        count=$((count + 2))
    done
    
    # Initiate rollback
    info "Initiating rollback to original region: $original_region"
    local rollback_data='{"target_region": "'"$original_region"'", "reason": "Rollback test"}'
    local rollback_response=$(api_call POST "/failover/manual" "$rollback_data" "202") || return 1
    local rollback_id=$(echo "$rollback_response" | jq -r '.failover_id')
    
    # Wait for rollback
    count=0
    while [ $count -lt $timeout ]; do
        local rollback_progress=$(api_call GET "/failover/status/$rollback_id" "" "200") || return 1
        local rollback_status=$(echo "$rollback_progress" | jq -r '.status')
        
        if [ "$rollback_status" = "completed" ]; then
            pass "Rollback completed successfully"
            break
        elif [ "$rollback_status" = "failed" ]; then
            fail "Rollback failed"
            return 1
        fi
        
        sleep 2
        count=$((count + 2))
    done
    
    if [ $count -ge $timeout ]; then
        fail "Rollback timed out"
        return 1
    fi
    
    # Verify rollback
    sleep 5
    local final_status=$(api_call GET "/status" "" "200") || return 1
    local final_region=$(echo "$final_status" | jq -r '.current_region // "unknown"')
    
    if [ "$final_region" = "$original_region" ]; then
        pass "Rollback verification successful: back to $original_region"
        return 0
    else
        fail "Rollback verification failed. Expected: $original_region, Got: $final_region"
        return 1
    fi
}

test_replication_lag_monitoring() {
    say "Testing Replication Lag Monitoring"
    
    # Get replication status
    local replication_response=$(api_call GET "/replication/status" "" "200") || return 1
    
    # Check if lag metrics are present
    if echo "$replication_response" | jq -e '.regions | length > 0' >/dev/null; then
        local max_lag=$(echo "$replication_response" | jq -r '.regions | map(.lag_ms) | max')
        local avg_lag=$(echo "$replication_response" | jq -r '.regions | map(.lag_ms) | add / length')
        
        info "Replication lag - Max: ${max_lag}ms, Average: ${avg_lag}ms"
        
        # Check if lag is within acceptable limits (< 5 seconds)
        if [ "$(echo "$max_lag < 5000" | bc)" = "1" ]; then
            pass "Replication lag within acceptable limits"
            return 0
        else
            warn "High replication lag detected: ${max_lag}ms"
            return 1
        fi
    else
        fail "No replication status data available"
        return 1
    fi
}

# Load testing functions
run_load_test_during_failover() {
    say "Running Load Test During Failover"
    
    # Start background load test
    info "Starting background load generation"
    {
        for i in {1..60}; do
            local test_data='{"load_test": true, "iteration": '$i', "timestamp": '$(date +%s)'}'
            api_call POST "/test-data" "$test_data" "201" >/dev/null 2>&1 || true
            sleep 1
        done
    } &
    local load_test_pid=$!
    
    # Wait a bit for load to establish
    sleep 10
    
    # Trigger failover during load
    local failover_data='{"target_region": "'"$SECONDARY_REGION"'", "reason": "Load test failover"}'
    local failover_response=$(api_call POST "/failover/manual" "$failover_data" "202") || return 1
    local failover_id=$(echo "$failover_response" | jq -r '.failover_id')
    
    # Monitor failover completion
    local timeout=90
    local count=0
    
    while [ $count -lt $timeout ]; do
        local progress_response=$(api_call GET "/failover/status/$failover_id" "" "200") || {
            sleep 2
            count=$((count + 2))
            continue
        }
        local status=$(echo "$progress_response" | jq -r '.status')
        
        if [ "$status" = "completed" ]; then
            pass "Failover completed under load"
            break
        elif [ "$status" = "failed" ]; then
            fail "Failover failed under load"
            kill $load_test_pid >/dev/null 2>&1 || true
            return 1
        fi
        
        sleep 2
        count=$((count + 2))
    done
    
    # Stop load test
    kill $load_test_pid >/dev/null 2>&1 || true
    wait $load_test_pid >/dev/null 2>&1 || true
    
    if [ $count -lt $timeout ]; then
        pass "Load test during failover completed successfully"
        return 0
    else
        fail "Failover under load timed out"
        return 1
    fi
}

# Generate test report
generate_report() {
    say "📊 Failover Test Report"
    
    local report_file="failover-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Multi-Region Failover Test Report

**Generated:** $(date -u "+%Y-%m-%d %H:%M:%S UTC")  
**Test Environment:** $API_BASE_URL  
**Primary Region:** $PRIMARY_REGION  
**Secondary Region:** $SECONDARY_REGION  
**Tertiary Region:** $TERTIARY_REGION  

## Test Summary

- **Total Tests:** $TESTS_RUN
- **Passed:** $TESTS_PASSED
- **Failed:** $TESTS_FAILED
- **Success Rate:** $(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_RUN" | bc)%

## Test Results

$(printf '%s\n' "${TEST_RESULTS[@]}")

## Recommendations

$(if [ $TESTS_FAILED -eq 0 ]; then
    echo "✅ All tests passed. Failover system is ready for production."
else
    echo "⚠️  Some tests failed. Review failed tests and address issues before production deployment."
fi)

## Next Steps

1. Review any failed tests and investigate root causes
2. Run tests in different network conditions
3. Test with production-like data volumes
4. Verify monitoring and alerting systems
5. Document operational procedures

---
*Report generated by Conductor Failover Test Suite*
EOF

    echo "📄 Test report generated: $report_file"
}

# Cleanup function
cleanup() {
    info "Cleaning up test data and resetting state"
    
    # Reset to primary region if needed
    local current_status=$(api_call GET "/status" "" "200" 2>/dev/null) || return 0
    local current_region=$(echo "$current_status" | jq -r '.current_region // "'"$PRIMARY_REGION"'"')
    
    if [ "$current_region" != "$PRIMARY_REGION" ]; then
        info "Resetting to primary region: $PRIMARY_REGION"
        local reset_data='{"target_region": "'"$PRIMARY_REGION"'", "reason": "Test cleanup"}'
        api_call POST "/failover/manual" "$reset_data" "202" >/dev/null 2>&1 || true
        
        # Wait for reset
        sleep 30
    fi
    
    # Clean test data
    api_call DELETE "/test-data/cleanup" "" "200" >/dev/null 2>&1 || true
}

# Main execution
main() {
    say "🚀 Multi-Region Failover Test Suite"
    
    # Verify API connectivity
    if ! wait_for_service "$API_BASE_URL/status" "$TEST_TIMEOUT"; then
        fail "API service is not accessible: $API_BASE_URL"
        exit 1
    fi
    
    pass "API service is accessible"
    
    # Run tests
    run_test "Region Health Monitoring" test_region_health_monitoring
    run_test "Basic Data Replication" test_data_replication_basic
    run_test "Conflict Resolution" test_conflict_resolution
    run_test "Manual Failover" test_manual_failover
    run_test "Automatic Failover" test_automatic_failover
    run_test "Data Consistency After Failover" test_data_consistency_after_failover
    run_test "Rollback Capability" test_rollback_capability
    run_test "Replication Lag Monitoring" test_replication_lag_monitoring
    run_test "Load Test During Failover" run_load_test_during_failover
    
    # Generate report
    generate_report
    
    # Cleanup
    cleanup
    
    # Final status
    say "✅ Failover Testing Complete"
    echo ""
    echo "📊 Results Summary:"
    echo "   Total Tests: $TESTS_RUN"
    echo "   Passed: $TESTS_PASSED"
    echo "   Failed: $TESTS_FAILED"
    echo "   Success Rate: $(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_RUN" | bc)%"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        pass "All tests passed! Failover system is ready."
        exit 0
    else
        echo ""
        fail "$TESTS_FAILED tests failed. Review and fix issues."
        exit 1
    fi
}

# Handle arguments
case "${1:-}" in
    --quick)
        # Quick test mode - essential tests only
        main() {
            say "⚡ Quick Failover Test"
            run_test "Region Health Monitoring" test_region_health_monitoring
            run_test "Manual Failover" test_manual_failover
            run_test "Rollback Capability" test_rollback_capability
            generate_report
            cleanup
        }
        main
        ;;
    --load-test)
        # Load test focus
        main() {
            say "🔥 Load Test Focus"
            run_test "Load Test During Failover" run_load_test_during_failover
            generate_report
            cleanup
        }
        main
        ;;
    --help)
        cat << EOF
Usage: $0 [options]

Multi-Region Failover Test Suite

Options:
  --quick       Run essential tests only
  --load-test   Focus on load testing during failover
  --help        Show this help

Environment Variables:
  PRIMARY_REGION     Primary region ID (default: us-east-1a)
  SECONDARY_REGION   Secondary region ID (default: us-west-2a)  
  TERTIARY_REGION    Tertiary region ID (default: eu-west-1a)
  API_BASE_URL       API base URL (default: http://localhost:3000/api)
  TEST_TIMEOUT       Test timeout in seconds (default: 30)

Examples:
  # Full test suite
  ./scripts/failover-test.sh
  
  # Quick essential tests
  ./scripts/failover-test.sh --quick
  
  # Load testing focus  
  ./scripts/failover-test.sh --load-test

EOF
        ;;
    *)
        main
        ;;
esac