#!/usr/bin/env bash
# verify_green_contract.test.sh
# Contract tests for verify-green-for-tag.sh output format
#
# Tests that the script produces stable, parseable output:
# - Truth table format is consistent
# - Exit codes are correct (0=pass, 1=fail, 2=invalid)
# - Key phrases appear in expected conditions
#
# Run: ./scripts/release/tests/verify_green_contract.test.sh

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
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="$3"

    ((TESTS_RUN++))
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

    ((TESTS_RUN++))
    if echo "${output}" | grep -qE "${pattern}"; then
        log_pass "${message}"
    else
        log_fail "${message} (pattern '${pattern}' not found)"
    fi
}

# ===========================================================================
# Contract: Exit code 0 when all required checks pass
# ===========================================================================
test_exit_code_pass() {
    log_test "Contract: Exit code 0 when all required checks pass"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_exit_code 0 "${exit_code}" "Exit code should be 0 for passing checks"
}

# ===========================================================================
# Contract: Exit code 1 when required check fails
# ===========================================================================
test_exit_code_fail() {
    log_test "Contract: Exit code 1 when required check fails"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_workflow_lint_failed.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_workflow.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_exit_code 1 "${exit_code}" "Exit code should be 1 for failing checks"
}

# ===========================================================================
# Contract: Exit code 2 for invalid arguments
# ===========================================================================
test_exit_code_invalid() {
    log_test "Contract: Exit code 2 for invalid arguments (missing --tag)"

    local exit_code

    set +e
    "${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        2>/dev/null
    exit_code=$?
    set -e

    assert_exit_code 2 "${exit_code}" "Exit code should be 2 for missing --tag"
}

# ===========================================================================
# Contract: "GREEN FOR PROMOTION" appears on success
# ===========================================================================
test_green_message() {
    log_test "Contract: 'GREEN FOR PROMOTION' appears on success"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_output_contains "GREEN FOR PROMOTION" "${output}" "Success message should appear"
}

# ===========================================================================
# Contract: "BLOCKED" appears on failure
# ===========================================================================
test_blocked_message() {
    log_test "Contract: 'BLOCKED' appears on failure"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_workflow_lint_failed.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_workflow.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_output_contains "BLOCKED" "${output}" "Blocked message should appear"
}

# ===========================================================================
# Contract: Truth table header format
# ===========================================================================
test_truth_table_header() {
    log_test "Contract: Truth table contains expected columns"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_output_contains "WORKFLOW" "${output}" "WORKFLOW column should be present"
    assert_output_contains "REQUIRED" "${output}" "REQUIRED column should be present"
    assert_output_contains "STATUS" "${output}" "STATUS column should be present"
}

# ===========================================================================
# Contract: Tag and commit info displayed
# ===========================================================================
test_tag_commit_displayed() {
    log_test "Contract: Tag and commit info displayed in output"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_output_contains "v1.0.0-rc.1" "${output}" "Tag should be displayed"
    assert_output_contains "abc123" "${output}" "Commit should be displayed"
}

# ===========================================================================
# Contract: ALWAYS keyword for always-required checks
# ===========================================================================
test_always_keyword() {
    log_test "Contract: ALWAYS keyword appears for always-required checks"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_output_contains "ALWAYS" "${output}" "ALWAYS keyword should appear for always-required checks"
}

# ===========================================================================
# Contract: COND keyword for conditionally-required checks
# ===========================================================================
test_cond_keyword() {
    log_test "Contract: COND keyword appears for conditionally-required checks"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_workflow.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_output_contains "COND" "${output}" "COND keyword should appear for conditionally-required checks"
}

# ===========================================================================
# Contract: SKIP keyword for skipped conditional checks
# ===========================================================================
test_skip_keyword() {
    log_test "Contract: SKIP keyword appears for skipped conditional checks"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_output_contains "SKIP" "${output}" "SKIP keyword should appear for skipped conditional checks"
}

# ===========================================================================
# Contract: Offline mode indicator
# ===========================================================================
test_offline_mode_indicator() {
    log_test "Contract: Offline mode indicator appears"

    local output
    local exit_code

    set +e
    output=$("${RELEASE_SCRIPTS}/verify-green-for-tag.sh" \
        --tag "v1.0.0-rc.1" \
        --offline-policy-file "${FIXTURES_DIR}/test_policy.json" \
        --offline-status-file "${FIXTURES_DIR}/status_all_success.json" \
        --offline-changed-files "${FIXTURES_DIR}/changed_docs_only.txt" \
        --base "test-base" \
        --commit "abc123" \
        2>&1)
    exit_code=$?
    set -e

    assert_output_contains "OFFLINE" "${output}" "Offline mode indicator should appear"
}

# ===========================================================================
# Main test runner
# ===========================================================================
main() {
    echo ""
    echo "=========================================="
    echo "  Verify-Green Contract Tests"
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
    test_exit_code_pass
    test_exit_code_fail
    test_exit_code_invalid
    test_green_message
    test_blocked_message
    test_truth_table_header
    test_tag_commit_displayed
    test_always_keyword
    test_cond_keyword
    test_skip_keyword
    test_offline_mode_indicator

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
