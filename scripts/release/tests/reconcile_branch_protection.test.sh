#!/usr/bin/env bash
# reconcile_branch_protection.test.sh
# Unit tests for branch protection reconciliation scripts
#
# Tests that the reconciler correctly:
# - Parses YAML policy files with yq -o=json
# - Handles 404/403 API responses gracefully
# - Preserves check names with spaces
# - Reports "unknown" status when API is inaccessible
#
# Run: ./scripts/release/tests/reconcile_branch_protection.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="${SCRIPT_DIR}/fixtures"
RELEASE_SCRIPTS="${SCRIPT_DIR}/.."
TEMP_DIR=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

setup() {
    TEMP_DIR=$(mktemp -d)
    mkdir -p "${TEMP_DIR}/artifacts/release-train"
}

teardown() {
    if [[ -n "${TEMP_DIR}" && -d "${TEMP_DIR}" ]]; then
        rm -rf "${TEMP_DIR}"
    fi
}

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((++TESTS_PASSED)) || true
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((++TESTS_FAILED)) || true
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="$3"

    ((++TESTS_RUN)) || true
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

    ((++TESTS_RUN)) || true
    if echo "${output}" | grep -qE "${pattern}"; then
        log_pass "${message}"
    else
        log_fail "${message} (pattern '${pattern}' not found)"
    fi
}

assert_json_field() {
    local field="$1"
    local expected="$2"
    local json_file="$3"
    local message="$4"

    ((++TESTS_RUN)) || true
    local actual
    actual=$(jq -r "${field}" "${json_file}" 2>/dev/null || echo "PARSE_ERROR")

    if [[ "${actual}" == "${expected}" ]]; then
        log_pass "${message}"
    else
        log_fail "${message} (expected '${expected}', got '${actual}')"
    fi
}

# --- Test Cases ---

test_extract_policy_outputs_valid_json() {
    log_test "extract_required_checks_from_policy.sh outputs valid JSON"

    local output
    output=$("${RELEASE_SCRIPTS}/extract_required_checks_from_policy.sh" 2>/dev/null)
    local exit_code=$?

    assert_exit_code 0 "${exit_code}" "Script exits successfully"

    ((++TESTS_RUN)) || true
    if echo "${output}" | jq empty 2>/dev/null; then
        log_pass "Output is valid JSON"
    else
        log_fail "Output is not valid JSON: ${output}"
    fi
}

test_extract_policy_preserves_check_names_with_spaces() {
    log_test "extract_required_checks_from_policy.sh preserves check names with spaces"

    local output
    output=$("${RELEASE_SCRIPTS}/extract_required_checks_from_policy.sh" 2>/dev/null)

    # Check that multi-word check names are preserved as single strings
    ((++TESTS_RUN)) || true
    local has_multiword
    has_multiword=$(echo "${output}" | jq -r '.always_required[] | select(contains(" "))' 2>/dev/null | head -1)

    if [[ -n "${has_multiword}" ]]; then
        log_pass "Multi-word check names preserved: '${has_multiword}'"
    else
        log_fail "No multi-word check names found (expected names like 'CI Core (Primary Gate)')"
    fi
}

test_reconciler_handles_404_gracefully() {
    log_test "reconcile_branch_protection.sh handles 404 gracefully"

    setup

    # Run reconciler (will get 404 if branch protection not configured)
    local output
    set +e
    output=$("${RELEASE_SCRIPTS}/reconcile_branch_protection.sh" \
        --branch main \
        --mode plan \
        --out-dir "${TEMP_DIR}/artifacts/release-train" \
        2>&1)
    local exit_code=$?
    set -e

    # Script should not crash (exit 0)
    assert_exit_code 0 "${exit_code}" "Script does not crash on 404"

    # Output should mention API access issue
    assert_output_contains "Branch protection not configured|403|404|API" \
        "${output}" \
        "Output mentions API access issue"

    # JSON should be generated and valid
    local json_file="${TEMP_DIR}/artifacts/release-train/branch_protection_reconcile_plan.json"
    ((++TESTS_RUN)) || true
    if [[ -f "${json_file}" ]] && jq empty "${json_file}" 2>/dev/null; then
        log_pass "Valid JSON output generated"
    else
        log_fail "JSON output missing or invalid"
    fi

    teardown
}

test_reconciler_reports_unknown_when_api_inaccessible() {
    log_test "reconcile_branch_protection.sh reports 'unknown' when API inaccessible"

    setup

    # Run reconciler
    "${RELEASE_SCRIPTS}/reconcile_branch_protection.sh" \
        --branch main \
        --mode plan \
        --out-dir "${TEMP_DIR}/artifacts/release-train" \
        2>/dev/null || true

    local json_file="${TEMP_DIR}/artifacts/release-train/branch_protection_reconcile_plan.json"

    # Check if api_accessible is false
    local api_accessible
    api_accessible=$(jq -r '.api_accessible' "${json_file}" 2>/dev/null || echo "PARSE_ERROR")

    if [[ "${api_accessible}" == "false" ]]; then
        # When API is not accessible, needs_reconciliation should be "unknown"
        assert_json_field '.needs_reconciliation' 'unknown' "${json_file}" \
            "needs_reconciliation is 'unknown' when API inaccessible"
    else
        # API was accessible, skip this test
        ((++TESTS_RUN)) || true
        log_pass "API was accessible - skipping unknown status test (not applicable)"
    fi

    teardown
}

test_reconciler_preserves_target_state_names() {
    log_test "reconcile_branch_protection.sh preserves target state check names"

    setup

    "${RELEASE_SCRIPTS}/reconcile_branch_protection.sh" \
        --branch main \
        --mode plan \
        --out-dir "${TEMP_DIR}/artifacts/release-train" \
        2>/dev/null || true

    local json_file="${TEMP_DIR}/artifacts/release-train/branch_protection_reconcile_plan.json"

    # Target state should contain full check names, not word-split
    ((++TESTS_RUN)) || true
    local has_split_names
    has_split_names=$(jq -r '.target_state[] | select(. == "CI" or . == "Core" or . == "(Primary")' "${json_file}" 2>/dev/null | head -1)

    if [[ -z "${has_split_names}" ]]; then
        log_pass "Target state does not contain word-split names"
    else
        log_fail "Target state contains word-split names: '${has_split_names}'"
    fi

    # Should have proper full names
    ((++TESTS_RUN)) || true
    local has_full_names
    has_full_names=$(jq -r '.target_state[] | select(contains(" "))' "${json_file}" 2>/dev/null | head -1)

    if [[ -n "${has_full_names}" ]]; then
        log_pass "Target state has full check names: '${has_full_names}'"
    else
        log_fail "Target state missing full check names with spaces"
    fi

    teardown
}

test_markdown_output_generated() {
    log_test "reconcile_branch_protection.sh generates markdown output"

    setup

    "${RELEASE_SCRIPTS}/reconcile_branch_protection.sh" \
        --branch main \
        --mode plan \
        --out-dir "${TEMP_DIR}/artifacts/release-train" \
        2>/dev/null || true

    local md_file="${TEMP_DIR}/artifacts/release-train/branch_protection_reconcile_plan.md"

    ((++TESTS_RUN)) || true
    if [[ -f "${md_file}" ]]; then
        log_pass "Markdown output file exists"
    else
        log_fail "Markdown output file missing"
        teardown
        return
    fi

    # Check for expected sections
    assert_output_contains "# Branch Protection Reconciliation Plan" \
        "$(cat "${md_file}")" \
        "Markdown has title"

    assert_output_contains "## Target State" \
        "$(cat "${md_file}")" \
        "Markdown has target state section"

    teardown
}

# --- Run Tests ---

main() {
    echo "=========================================="
    echo "Branch Protection Reconciler Tests"
    echo "=========================================="
    echo ""

    test_extract_policy_outputs_valid_json
    test_extract_policy_preserves_check_names_with_spaces
    test_reconciler_handles_404_gracefully
    test_reconciler_reports_unknown_when_api_inaccessible
    test_reconciler_preserves_target_state_names
    test_markdown_output_generated

    echo ""
    echo "=========================================="
    echo "Results: ${TESTS_PASSED}/${TESTS_RUN} passed"
    if [[ ${TESTS_FAILED} -gt 0 ]]; then
        echo -e "${RED}${TESTS_FAILED} tests failed${NC}"
        exit 1
    else
        echo -e "${GREEN}All tests passed${NC}"
        exit 0
    fi
}

main "$@"
