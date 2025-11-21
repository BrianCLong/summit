#!/bin/bash
#
# Run All Demo Tests
#
# This script runs all unit tests across the demo infrastructure
# and provides a summary report.
#
# Usage:
#   ./scripts/run_all_tests.sh          # Run all tests
#   ./scripts/run_all_tests.sh -v       # Verbose output
#   ./scripts/run_all_tests.sh -q       # Quiet mode (summary only)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMOS_DIR="$(dirname "$SCRIPT_DIR")"
VERBOSE=${1:-""}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}        Demo Infrastructure Test Suite${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Track results
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

run_test_suite() {
    local name=$1
    local path=$2
    local test_file=$3

    echo -e "${YELLOW}▶ Running: ${name}${NC}"

    cd "$path"

    if [ "$VERBOSE" == "-v" ]; then
        if python3 -m unittest "$test_file" -v 2>&1; then
            result="PASSED"
        else
            result="FAILED"
        fi
    elif [ "$VERBOSE" == "-q" ]; then
        if python3 -m unittest "$test_file" 2>&1 | tail -1; then
            result="PASSED"
        else
            result="FAILED"
        fi
    else
        output=$(python3 -m unittest "$test_file" 2>&1)
        if echo "$output" | grep -q "^OK"; then
            result="PASSED"
            # Extract test count
            count=$(echo "$output" | grep -oE "Ran [0-9]+ test" | grep -oE "[0-9]+")
            echo -e "  ${GREEN}✓ ${count} tests passed${NC}"
        else
            result="FAILED"
            echo -e "  ${RED}✗ Some tests failed${NC}"
            echo "$output" | grep -E "^(FAIL|ERROR):" | head -5
        fi
    fi

    # Update counters
    count=$(python3 -m unittest "$test_file" 2>&1 | grep -oE "Ran [0-9]+ test" | grep -oE "[0-9]+" || echo "0")
    TOTAL_TESTS=$((TOTAL_TESTS + count))

    if [ "$result" == "PASSED" ]; then
        TOTAL_PASSED=$((TOTAL_PASSED + count))
    else
        failed_count=$(python3 -m unittest "$test_file" 2>&1 | grep -oE "failures=[0-9]+" | grep -oE "[0-9]+" || echo "0")
        error_count=$(python3 -m unittest "$test_file" 2>&1 | grep -oE "errors=[0-9]+" | grep -oE "[0-9]+" || echo "0")
        TOTAL_FAILED=$((TOTAL_FAILED + failed_count + error_count))
        TOTAL_PASSED=$((TOTAL_TESTS - TOTAL_FAILED))
    fi

    echo ""
}

# Run test suites
echo -e "${BLUE}Running test suites...${NC}"
echo ""

# 1. Misinfo Defense Pipeline Tests
run_test_suite \
    "Misinfo Defense Pipeline" \
    "$DEMOS_DIR/misinfo-defense/pipelines" \
    "test_load_demo_data"

# 2. De-escalation Pipeline Tests
run_test_suite \
    "De-escalation Pipeline" \
    "$DEMOS_DIR/deescalation/pipelines" \
    "test_load_demo_data"

# 3. Safety Harness Tests
run_test_suite \
    "Safety Harness" \
    "$DEMOS_DIR/copilot" \
    "test_safety_harness"

# Summary
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}                    Test Summary${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "  Total Tests:  ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed:       ${TOTAL_PASSED}${NC}"

if [ $TOTAL_FAILED -gt 0 ]; then
    echo -e "  ${RED}Failed:       ${TOTAL_FAILED}${NC}"
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
else
    echo -e "  Failed:       0"
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
fi
