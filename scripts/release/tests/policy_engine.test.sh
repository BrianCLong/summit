#!/usr/bin/env bash
# policy_engine.test.sh
# Unit tests for policy parsing and requiredness computation
#
# Tests that the verify-green-for-tag.sh script correctly:
# - Loads policy files (JSON and YAML)
# - Computes required checks based on changed files
# - Handles conditional checks correctly
#
# Run: ./scripts/release/tests/policy_engine.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="${SCRIPT_DIR}/fixtures"
RELEASE_SCRIPTS="${SCRIPT_DIR}/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="$3"

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ "${actual}" -eq "${expected}" ]]; then
        log_pass "${message}"
    else
        log_fail "${message} (expected exit ${expected}, got ${actual})"
    fi
}

assert_output_contains() {
    local pattern="$1"
    local output="$2"
    local message="$3"

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "${output}" | grep -q "${pattern}"; then
        log_pass "${message}"
    else
        log_fail "${message} (pattern '${pattern}' not found)"
    fi
}

assert_output_not_contains() {
    local pattern="$1"
    local output="$2"
    local message="$3"

    TESTS_RUN=$((TESTS_RUN + 1))
    if ! echo "${output}" | grep -q "${pattern}"; then
        log_pass "${message}"
    else
        log_fail "${message} (pattern '${pattern}' should not be present)"
    fi
}

# ===========================================================================
# Test: Docs-only change - conditional checks should be SKIPPED
# ===========================================================================
test_docs_only_change() {
    log_test "Docs-only change: conditional checks should be SKIPPED"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.lst" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    # Should pass (all always-required are success, conditionals skipped)
    assert_exit_code 0 "${exit_code}" "Docs-only change should pass"

    # Conditional checks should show SKIP
    assert_output_contains "SKIP" "${output}" "Conditional checks should be SKIPPED"

    # Workflow Lint should NOT be required
    assert_output_contains "Workflow Lint.*SKIP" "${output}" "Workflow Lint should be SKIPPED for docs-only"
}

# ===========================================================================
# Test: Workflow change - Workflow Lint should be REQUIRED
# ===========================================================================
test_workflow_change() {
    log_test "Workflow change: Workflow Lint should be REQUIRED"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_workflow.lst" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    # Should pass (Workflow Lint is success)
    assert_exit_code 0 "${exit_code}" "Workflow change with success should pass"

    # Workflow Lint should be conditionally required
    assert_output_contains "Workflow Lint.*COND" "${output}" "Workflow Lint should be REQUIRED for workflow changes"
}

# ===========================================================================
# Test: Workflow change with failed Workflow Lint - should FAIL
# ===========================================================================
test_workflow_change_failed_lint() {
    log_test "Workflow change with failed Workflow Lint: should FAIL"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_workflow_lint_failed.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_workflow.lst" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    # Should fail (Workflow Lint is failure and required)
    assert_exit_code 1 "${exit_code}" "Workflow change with failed lint should fail"

    # Should indicate blocked
    assert_output_contains "BLOCKED" "${output}" "Should indicate BLOCKED"
}

# ===========================================================================
# Test: Server change - CodeQL should be REQUIRED
# ===========================================================================
test_server_change() {
    log_test "Server change: CodeQL should be REQUIRED"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_server.lst" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    # Should pass
    assert_exit_code 0 "${exit_code}" "Server change with success should pass"

    # CodeQL should be conditionally required
    assert_output_contains "CodeQL.*COND" "${output}" "CodeQL should be REQUIRED for server changes"

    # Workflow Lint should be skipped
    assert_output_contains "Workflow Lint.*SKIP" "${output}" "Workflow Lint should be SKIPPED for server-only changes"
}

# ===========================================================================
# Test: Dockerfile change - Docker Build and SBOM should be REQUIRED
# ===========================================================================
test_dockerfile_change() {
    log_test "Dockerfile change: Docker Build and SBOM should be REQUIRED"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_dockerfile.lst" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    # Should pass
    assert_exit_code 0 "${exit_code}" "Dockerfile change with success should pass"

    # Docker Build should be conditionally required
    assert_output_contains "Docker Build.*COND" "${output}" "Docker Build should be REQUIRED for Dockerfile changes"

    # SBOM Scan should be conditionally required
    assert_output_contains "SBOM Scan.*COND" "${output}" "SBOM Scan should be REQUIRED for Dockerfile changes"
}

# ===========================================================================
# Test: Always-required checks must always pass
# ===========================================================================
test_always_required() {
    log_test "Always-required checks: CI Core and Unit Tests should be ALWAYS required"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.lst" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    # CI Core should be ALWAYS required
    assert_output_contains "CI Core.*ALWAYS" "${output}" "CI Core should be ALWAYS required"

    # Unit Tests should be ALWAYS required
    assert_output_contains "Unit Tests.*ALWAYS" "${output}" "Unit Tests should be ALWAYS required"
}

# ===========================================================================
# Test: Stable output (no empty or malformed lines)
# ===========================================================================
test_output_stability() {
    log_test "Output stability: should produce consistent non-empty output"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.lst" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    # Output should contain truth table header
    assert_output_contains "PROMOTION GATE TRUTH TABLE" "${output}" "Should contain truth table header"

    # Output should contain WORKFLOW column
    assert_output_contains "WORKFLOW" "${output}" "Should contain WORKFLOW column header"

    # Output should contain GREEN FOR PROMOTION or BLOCKED
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "${output}" | grep -qE "(GREEN FOR PROMOTION|BLOCKED)"; then
        log_pass "Should contain final verdict"
    else
        log_fail "Should contain final verdict (GREEN FOR PROMOTION or BLOCKED)"
    fi
}

# ===========================================================================
# Main test runner
# ===========================================================================
main() {
    echo ""
    echo "=========================================="
    echo "  Policy Engine Unit Tests"
    echo "=========================================="
    echo ""

    # Pre-flight checks
    if [[ ! -f "${RELEASE_SCRIPTS}/verify-green-for-tag.sh" ]]; then
        echo -e "${RED}ERROR: verify-green-for-tag.sh not found${NC}"
        exit 2
    fi

    if [[ ! -d "${FIXTURES_DIR}" ]]; then
        echo -e "${RED}ERROR: fixtures directory not found${NC}"
        exit 2
    fi

    # Run tests
    test_docs_only_change
    test_workflow_change
    test_workflow_change_failed_lint
    test_server_change
    test_dockerfile_change
    test_always_required
    test_output_stability

    # Summary
    echo ""
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    echo ""
    echo "Tests run:    ${TESTS_RUN}"
    echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Tests failed: ${RED}${TESTS_FAILED}${NC}"
    echo ""

    if [[ ${TESTS_FAILED} -gt 0 ]]; then
        echo -e "${RED}SOME TESTS FAILED${NC}"
        exit 1
    else
        echo -e "${GREEN}ALL TESTS PASSED${NC}"
        exit 0
    fi
}

main "$@"
