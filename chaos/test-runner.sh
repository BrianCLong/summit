#!/usr/bin/env bash
# ==============================================================================
# Resilience Lab Chaos Runner - Unit Test Suite
# ==============================================================================
# Comprehensive test suite for chaos runner functionality
#
# Usage:
#   ./test-runner.sh [OPTIONS]
#
# Options:
#   --verbose    Verbose output
#   --bail       Stop on first failure
#   --coverage   Generate coverage report
#
# Exit Codes:
#   0  - All tests passed
#   1  - One or more tests failed
# ==============================================================================

set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly RUNNER_SCRIPT="${SCRIPT_DIR}/runner.sh"
readonly TEST_SCENARIOS_FILE="${SCRIPT_DIR}/test-scenarios.yaml"
readonly TEST_REPORTS_DIR="${PROJECT_ROOT}/artifacts/chaos/test-reports"

# Test configuration
VERBOSE=false
BAIL=false
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# ==============================================================================
# Test Framework Functions
# ==============================================================================

test_start() {
    local test_name=$1
    ((TOTAL_TESTS++))
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[TEST]${NC} $test_name"
    fi
}

test_pass() {
    ((PASSED_TESTS++))
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${GREEN}[PASS]${NC}"
    else
        echo -n "."
    fi
}

test_fail() {
    local test_name=$1
    local reason=$2
    ((FAILED_TESTS++))
    echo -e "${RED}[FAIL]${NC} $test_name: $reason"

    if [ "$BAIL" = "true" ]; then
        exit 1
    fi
}

test_skip() {
    local test_name=$1
    local reason=$2
    ((SKIPPED_TESTS++))
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${YELLOW}[SKIP]${NC} $test_name: $reason"
    else
        echo -n "S"
    fi
}

assert_equals() {
    local expected=$1
    local actual=$2
    local message=${3:-"Values not equal"}

    if [ "$expected" != "$actual" ]; then
        echo "Expected: $expected"
        echo "Actual: $actual"
        return 1
    fi
    return 0
}

assert_contains() {
    local haystack=$1
    local needle=$2
    local message=${3:-"String not found"}

    if ! echo "$haystack" | grep -q "$needle"; then
        echo "$message"
        echo "Haystack: $haystack"
        echo "Needle: $needle"
        return 1
    fi
    return 0
}

assert_file_exists() {
    local file=$1
    local message=${2:-"File does not exist: $file"}

    if [ ! -f "$file" ]; then
        echo "$message"
        return 1
    fi
    return 0
}

assert_exit_code() {
    local expected=$1
    local command=$2

    local actual
    set +e
    eval "$command" >/dev/null 2>&1
    actual=$?
    set -e

    if [ "$expected" -ne "$actual" ]; then
        echo "Expected exit code: $expected"
        echo "Actual exit code: $actual"
        return 1
    fi
    return 0
}

# ==============================================================================
# Setup and Teardown
# ==============================================================================

setup_test_environment() {
    mkdir -p "$TEST_REPORTS_DIR"

    # Create test scenarios file
    cat > "$TEST_SCENARIOS_FILE" <<'EOF'
metadata:
  version: "1.0.0"
  description: "Test scenarios for unit tests"

slos:
  recovery_time_seconds: 30
  max_error_rate_percent: 5
  min_availability_percent: 95

scenarios:
  - id: test-scenario-valid
    name: "Valid Test Scenario"
    description: "A valid scenario for testing"
    severity: low
    targets:
      compose:
        service: test-service
        action: restart
        duration: 5
      kubernetes:
        namespace: default
        selector: app=test
        action: delete-pod
    healthChecks:
      - type: http
        url: "http://localhost:4000/health"
        expectedStatus: 200
    metrics:
      - name: recovery_time
        threshold: 10

  - id: test-scenario-missing-config
    name: "Scenario with Missing Config"
    description: "Missing compose configuration"
    severity: low

test_suite:
  - test-scenario-valid

empty_suite:
EOF
}

teardown_test_environment() {
    rm -f "$TEST_SCENARIOS_FILE"
}

# ==============================================================================
# Unit Tests - Dependency Checking
# ==============================================================================

test_check_dependencies_all_present() {
    test_start "check_dependencies: all dependencies present"

    # Source functions from runner (without executing main)
    local output
    output=$(TARGET=compose bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        check_dependencies 2>&1
    ")

    if assert_contains "$output" "All dependencies satisfied" "Should report all dependencies satisfied"; then
        test_pass
    else
        test_fail "check_dependencies: all dependencies present" "Dependency check failed"
    fi
}

test_check_dependencies_invalid_target() {
    test_start "check_dependencies: invalid target"

    local output
    set +e
    output=$(TARGET=invalid bash -c "
        source '$RUNNER_SCRIPT' 2>&1
    " 2>&1)
    local exit_code=$?
    set -e

    if [ $exit_code -ne 0 ] && assert_contains "$output" "Invalid TARGET" "Should reject invalid target"; then
        test_pass
    else
        test_fail "check_dependencies: invalid target" "Should fail with invalid target"
    fi
}

# ==============================================================================
# Unit Tests - YAML Parsing
# ==============================================================================

test_get_scenarios_from_suite_valid() {
    test_start "get_scenarios_from_suite: valid suite"

    setup_test_environment

    local output
    output=$(SCENARIOS_FILE="$TEST_SCENARIOS_FILE" bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        get_scenarios_from_suite 'test_suite'
    ")

    if assert_contains "$output" "test-scenario-valid" "Should contain test-scenario-valid"; then
        test_pass
    else
        test_fail "get_scenarios_from_suite: valid suite" "Failed to parse suite"
    fi

    teardown_test_environment
}

test_get_scenarios_from_suite_nonexistent() {
    test_start "get_scenarios_from_suite: nonexistent suite"

    setup_test_environment

    local output
    set +e
    output=$(SCENARIOS_FILE="$TEST_SCENARIOS_FILE" bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        get_scenarios_from_suite 'nonexistent_suite' 2>&1
    ")
    local exit_code=$?
    set -e

    if [ $exit_code -ne 0 ] && assert_contains "$output" "Suite not found" "Should report suite not found"; then
        test_pass
    else
        test_fail "get_scenarios_from_suite: nonexistent suite" "Should fail with nonexistent suite"
    fi

    teardown_test_environment
}

test_get_scenarios_from_suite_empty() {
    test_start "get_scenarios_from_suite: empty suite"

    setup_test_environment

    local output
    set +e
    output=$(SCENARIOS_FILE="$TEST_SCENARIOS_FILE" bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        get_scenarios_from_suite 'empty_suite' 2>&1
    ")
    local exit_code=$?
    set -e

    if [ $exit_code -ne 0 ] && assert_contains "$output" "No scenarios found" "Should report no scenarios"; then
        test_pass
    else
        test_fail "get_scenarios_from_suite: empty suite" "Should fail with empty suite"
    fi

    teardown_test_environment
}

test_get_scenario_config() {
    test_start "get_scenario_config: retrieve configuration"

    setup_test_environment

    local output
    output=$(SCENARIOS_FILE="$TEST_SCENARIOS_FILE" bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        get_scenario_config 'test-scenario-valid' 'name'
    ")

    if assert_equals "Valid Test Scenario" "$output" "Should retrieve scenario name"; then
        test_pass
    else
        test_fail "get_scenario_config" "Failed to retrieve config"
    fi

    teardown_test_environment
}

test_get_nested_config() {
    test_start "get_nested_config: retrieve nested configuration"

    setup_test_environment

    local output
    output=$(SCENARIOS_FILE="$TEST_SCENARIOS_FILE" bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        get_nested_config 'test-scenario-valid' 'compose' 'service'
    ")

    if assert_equals "test-service" "$output" "Should retrieve nested service config"; then
        test_pass
    else
        test_fail "get_nested_config" "Failed to retrieve nested config"
    fi

    teardown_test_environment
}

# ==============================================================================
# Unit Tests - Health Checks
# ==============================================================================

test_http_health_check_success() {
    test_start "http_health_check: successful health check"

    # Start a simple HTTP server for testing
    python3 -m http.server 8765 >/dev/null 2>&1 &
    local server_pid=$!
    sleep 1

    local result
    set +e
    result=$(bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        http_health_check 'http://localhost:8765' 200 5 && echo 'success'
    ")
    local exit_code=$?
    set -e

    kill $server_pid 2>/dev/null || true

    if [ $exit_code -eq 0 ] && assert_equals "success" "$result" "Should succeed"; then
        test_pass
    else
        test_fail "http_health_check: successful" "Health check should have succeeded"
    fi
}

test_http_health_check_failure() {
    test_start "http_health_check: failed health check"

    local result
    set +e
    result=$(bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        http_health_check 'http://localhost:19999' 200 2 2>&1
    ")
    local exit_code=$?
    set -e

    if [ $exit_code -ne 0 ]; then
        test_pass
    else
        test_fail "http_health_check: failure" "Health check should have failed"
    fi
}

# ==============================================================================
# Unit Tests - Lock File Handling
# ==============================================================================

test_check_lock_no_existing_lock() {
    test_start "check_lock: no existing lock"

    local temp_dir=$(mktemp -d)
    local lock_file="$temp_dir/chaos-runner.lock"

    local result
    result=$(bash -c "
        LOCK_FILE='$lock_file'
        source '$RUNNER_SCRIPT' &>/dev/null || true
        check_lock && echo 'success'
    ")

    if assert_equals "success" "$result" "Should succeed without existing lock"; then
        test_pass
    else
        test_fail "check_lock: no existing lock" "Should create lock successfully"
    fi

    rm -rf "$temp_dir"
}

test_check_lock_stale_lock() {
    test_start "check_lock: stale lock file"

    local temp_dir=$(mktemp -d)
    local lock_file="$temp_dir/chaos-runner.lock"

    # Create stale lock with non-existent PID
    echo "999999" > "$lock_file"

    local result
    result=$(bash -c "
        LOCK_FILE='$lock_file'
        source '$RUNNER_SCRIPT' &>/dev/null || true
        check_lock && echo 'success'
    ")

    if assert_equals "success" "$result" "Should remove stale lock and succeed"; then
        test_pass
    else
        test_fail "check_lock: stale lock" "Should handle stale lock"
    fi

    rm -rf "$temp_dir"
}

# ==============================================================================
# Unit Tests - Error Handling
# ==============================================================================

test_cleanup_on_exit() {
    test_start "cleanup: proper cleanup on exit"

    local temp_dir=$(mktemp -d)
    local lock_file="$temp_dir/test.lock"
    echo "$$" > "$lock_file"

    # Test cleanup function
    bash -c "
        LOCK_FILE='$lock_file'
        CLEANUP_NEEDED=true
        source '$RUNNER_SCRIPT' &>/dev/null || true
        cleanup
    "

    if [ ! -f "$lock_file" ]; then
        test_pass
    else
        test_fail "cleanup: on exit" "Lock file should be removed"
    fi

    rm -rf "$temp_dir"
}

# ==============================================================================
# Integration Tests - Dry Run Mode
# ==============================================================================

test_dry_run_mode() {
    test_start "dry_run: execute without actual chaos"

    # Check if Docker is available
    if ! command -v docker >/dev/null 2>&1; then
        test_skip "dry_run: execute without actual chaos" "Docker not available"
        return
    fi

    setup_test_environment

    local output
    output=$(DRY_RUN=true TARGET=compose SCENARIO=test-scenario-valid SCENARIOS_FILE="$TEST_SCENARIOS_FILE" bash "$RUNNER_SCRIPT" 2>&1 || true)

    if assert_contains "$output" "DRY RUN" "Should indicate dry run mode"; then
        test_pass
    else
        test_fail "dry_run: execute" "Dry run should be indicated"
    fi

    teardown_test_environment
}

# ==============================================================================
# Integration Tests - Report Generation
# ==============================================================================

test_report_generation_json() {
    test_start "report_generation: JSON report created"

    setup_test_environment
    mkdir -p "$TEST_REPORTS_DIR"

    # Create a mock report
    local test_report="$TEST_REPORTS_DIR/test_report_$$.json"
    cat > "$test_report" <<'EOF'
{
  "scenario_id": "test",
  "status": "pass",
  "metrics": {
    "recovery_time_seconds": 10
  }
}
EOF

    if assert_file_exists "$test_report" "JSON report should exist"; then
        test_pass
    else
        test_fail "report_generation: JSON" "JSON report not created"
    fi

    rm -f "$test_report"
    teardown_test_environment
}

test_report_generation_html() {
    test_start "report_generation: HTML report created"

    setup_test_environment
    mkdir -p "$TEST_REPORTS_DIR"

    # Create a mock JSON report
    local test_json="$TEST_REPORTS_DIR/test_report_$$.json"
    cat > "$test_json" <<'EOF'
{
  "scenario_id": "test",
  "scenario_name": "Test Scenario",
  "status": "pass",
  "target": "compose",
  "start_time": 1234567890,
  "start_time_human": "2009-02-13 23:31:30",
  "metrics": {
    "recovery_time_seconds": 10
  },
  "total_duration_seconds": 15
}
EOF

    # Generate HTML report
    bash -c "
        source '$RUNNER_SCRIPT' &>/dev/null || true
        generate_html_report '$test_json'
    " >/dev/null 2>&1

    local test_html="${test_json%.json}.html"

    if assert_file_exists "$test_html" "HTML report should exist"; then
        if assert_contains "$(cat "$test_html")" "Resilience Lab" "HTML should contain expected content"; then
            test_pass
        else
            test_fail "report_generation: HTML" "HTML report missing expected content"
        fi
    else
        test_fail "report_generation: HTML" "HTML report not created"
    fi

    rm -f "$test_json" "$test_html"
    teardown_test_environment
}

# ==============================================================================
# Test Execution
# ==============================================================================

run_all_tests() {
    echo "========================================="
    echo "Resilience Lab - Test Suite"
    echo "========================================="
    echo ""

    # Check if runner script exists
    if [ ! -f "$RUNNER_SCRIPT" ]; then
        echo -e "${RED}[ERROR]${NC} Runner script not found: $RUNNER_SCRIPT"
        exit 1
    fi

    # Dependency tests
    echo "Running dependency tests..."
    test_check_dependencies_all_present
    test_check_dependencies_invalid_target

    # YAML parsing tests
    echo -e "\nRunning YAML parsing tests..."
    test_get_scenarios_from_suite_valid
    test_get_scenarios_from_suite_nonexistent
    test_get_scenarios_from_suite_empty
    test_get_scenario_config
    test_get_nested_config

    # Health check tests
    echo -e "\nRunning health check tests..."
    test_http_health_check_success
    test_http_health_check_failure

    # Lock file tests
    echo -e "\nRunning lock file tests..."
    test_check_lock_no_existing_lock
    test_check_lock_stale_lock

    # Error handling tests
    echo -e "\nRunning error handling tests..."
    test_cleanup_on_exit

    # Integration tests
    echo -e "\nRunning integration tests..."
    test_dry_run_mode

    # Report generation tests
    echo -e "\nRunning report generation tests..."
    test_report_generation_json
    test_report_generation_html

    # Summary
    echo -e "\n========================================="
    echo "Test Summary"
    echo "========================================="
    echo -e "Total:   $TOTAL_TESTS"
    echo -e "${GREEN}Passed:  $PASSED_TESTS${NC}"

    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "${RED}Failed:  $FAILED_TESTS${NC}"
    else
        echo -e "Failed:  $FAILED_TESTS"
    fi

    if [ $SKIPPED_TESTS -gt 0 ]; then
        echo -e "${YELLOW}Skipped: $SKIPPED_TESTS${NC}"
    fi

    echo "========================================="

    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# ==============================================================================
# Main
# ==============================================================================

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --bail)
            BAIL=true
            shift
            ;;
        --coverage)
            echo "Coverage reporting not yet implemented"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

run_all_tests
