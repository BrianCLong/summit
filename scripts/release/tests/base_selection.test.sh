#!/usr/bin/env bash
# base_selection.test.sh
# Unit tests for compute_base_for_commit.sh
#
# Tests that base selection correctly handles:
# - RC tag series (rc.1 -> rc.2)
# - GA tags corresponding to RC
# - Fallback to merge-base when no prior tags exist
#
# Run: ./scripts/release/tests/base_selection.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

# Temporary directory for test repo
TEST_REPO=""

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

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="$3"

    ((TESTS_RUN++))
    if [[ "${actual}" == "${expected}" ]]; then
        log_pass "${message}"
    else
        log_fail "${message} (expected '${expected}', got '${actual}')"
    fi
}

assert_not_empty() {
    local value="$1"
    local message="$2"

    ((TESTS_RUN++))
    if [[ -n "${value}" ]]; then
        log_pass "${message}"
    else
        log_fail "${message} (value is empty)"
    fi
}

# ===========================================================================
# Setup: Create temporary test repository
# ===========================================================================
setup_test_repo() {
    TEST_REPO=$(mktemp -d)
    cd "${TEST_REPO}"

    git init -q
    git config user.email "test@test.com"
    git config user.name "Test User"

    # Create main branch with initial commit
    echo "initial" > file.txt
    git add file.txt
    git commit -q -m "Initial commit"
    git branch -M main

    # Store main HEAD
    MAIN_HEAD=$(git rev-parse HEAD)

    echo "Test repo created at: ${TEST_REPO}"
}

# ===========================================================================
# Cleanup: Remove temporary test repository
# ===========================================================================
cleanup_test_repo() {
    if [[ -n "${TEST_REPO}" ]] && [[ -d "${TEST_REPO}" ]]; then
        rm -rf "${TEST_REPO}"
    fi
}

# ===========================================================================
# Test: RC.1 tag - should use merge-base or previous GA
# ===========================================================================
test_rc1_base() {
    log_test "RC.1 tag: base should be merge-base or previous GA"

    cd "${TEST_REPO}"

    # Create a commit for RC.1
    echo "rc1 change" >> file.txt
    git add file.txt
    git commit -q -m "RC1 changes"

    local rc1_sha
    rc1_sha=$(git rev-parse HEAD)

    # Tag as v1.0.0-rc.1
    git tag -a "v1.0.0-rc.1" -m "RC 1"

    # Run compute_base
    local base
    base=$("${RELEASE_SCRIPTS}/compute_base_for_commit.sh" --tag "v1.0.0-rc.1" --commit "${rc1_sha}" 2>/dev/null || echo "")

    # Should return something (merge-base or parent)
    assert_not_empty "${base}" "RC.1 base should not be empty"
}

# ===========================================================================
# Test: RC.2 tag - should use RC.1 as base
# ===========================================================================
test_rc2_base() {
    log_test "RC.2 tag: base should be RC.1"

    cd "${TEST_REPO}"

    # Get RC.1 SHA
    local rc1_sha
    rc1_sha=$(git rev-parse "v1.0.0-rc.1")

    # Create a commit for RC.2
    echo "rc2 change" >> file.txt
    git add file.txt
    git commit -q -m "RC2 changes"

    local rc2_sha
    rc2_sha=$(git rev-parse HEAD)

    # Tag as v1.0.0-rc.2
    git tag -a "v1.0.0-rc.2" -m "RC 2"

    # Run compute_base
    local base
    base=$("${RELEASE_SCRIPTS}/compute_base_for_commit.sh" --tag "v1.0.0-rc.2" --commit "${rc2_sha}" 2>/dev/null || echo "")

    # Should return v1.0.0-rc.1
    assert_equals "v1.0.0-rc.1" "${base}" "RC.2 base should be v1.0.0-rc.1"
}

# ===========================================================================
# Test: GA tag - should use same base as corresponding RC
# ===========================================================================
test_ga_base() {
    log_test "GA tag: base should match RC's base for same SHA"

    cd "${TEST_REPO}"

    # GA tag points to same commit as RC.2
    local rc2_sha
    rc2_sha=$(git rev-parse "v1.0.0-rc.2")

    # Tag as v1.0.0 (GA)
    git tag -a "v1.0.0" "${rc2_sha}" -m "GA 1.0.0"

    # Run compute_base
    local base
    base=$("${RELEASE_SCRIPTS}/compute_base_for_commit.sh" --tag "v1.0.0" --commit "${rc2_sha}" 2>/dev/null || echo "")

    # Should return v1.0.0-rc.1 (same base as RC.2)
    assert_equals "v1.0.0-rc.1" "${base}" "GA base should be v1.0.0-rc.1 (same as RC.2)"
}

# ===========================================================================
# Test: New version RC.1 - should use previous GA as base
# ===========================================================================
test_new_version_rc1_base() {
    log_test "New version RC.1: base should be previous GA"

    cd "${TEST_REPO}"

    # Create commit for v1.0.1-rc.1
    echo "v1.0.1 change" >> file.txt
    git add file.txt
    git commit -q -m "v1.0.1-rc.1 changes"

    local rc1_sha
    rc1_sha=$(git rev-parse HEAD)

    # Tag as v1.0.1-rc.1
    git tag -a "v1.0.1-rc.1" -m "RC 1 for 1.0.1"

    # Run compute_base
    local base
    base=$("${RELEASE_SCRIPTS}/compute_base_for_commit.sh" --tag "v1.0.1-rc.1" --commit "${rc1_sha}" 2>/dev/null || echo "")

    # Should return v1.0.0 (previous GA)
    assert_equals "v1.0.0" "${base}" "v1.0.1-rc.1 base should be v1.0.0"
}

# ===========================================================================
# Test: JSON output mode
# ===========================================================================
test_json_output() {
    log_test "JSON output: should produce valid JSON"

    cd "${TEST_REPO}"

    local rc2_sha
    rc2_sha=$(git rev-parse "v1.0.0-rc.2")

    # Run compute_base with --json
    local output
    output=$("${RELEASE_SCRIPTS}/compute_base_for_commit.sh" --tag "v1.0.0-rc.2" --commit "${rc2_sha}" --json 2>/dev/null || echo "{}")

    # Should be valid JSON with required fields
    local tag_type
    tag_type=$(echo "${output}" | jq -r '.tag_type' 2>/dev/null || echo "")

    assert_equals "rc" "${tag_type}" "JSON output should contain tag_type=rc"

    local base
    base=$(echo "${output}" | jq -r '.base' 2>/dev/null || echo "")

    assert_equals "v1.0.0-rc.1" "${base}" "JSON output should contain correct base"
}

# ===========================================================================
# Test: Invalid tag format
# ===========================================================================
test_invalid_tag() {
    log_test "Invalid tag: should return non-zero exit"

    cd "${TEST_REPO}"

    local exit_code
    set +e
    "${RELEASE_SCRIPTS}/compute_base_for_commit.sh" --tag "invalid-tag" --commit "abc123" 2>/dev/null
    exit_code=$?
    set -e

    ((TESTS_RUN++))
    if [[ ${exit_code} -ne 0 ]]; then
        log_pass "Invalid tag should return non-zero exit"
    else
        log_fail "Invalid tag should return non-zero exit (got 0)"
    fi
}

# ===========================================================================
# Main test runner
# ===========================================================================
main() {
    echo ""
    echo "=========================================="
    echo "  Base Selection Unit Tests"
    echo "=========================================="
    echo ""

    # Pre-flight checks
    if [[ ! -f "${RELEASE_SCRIPTS}/compute_base_for_commit.sh" ]]; then
        echo -e "${RED}ERROR: compute_base_for_commit.sh not found${NC}"
        exit 2
    fi

    if ! command -v git &> /dev/null; then
        echo -e "${RED}ERROR: git not found${NC}"
        exit 2
    fi

    # Setup
    setup_test_repo

    # Trap to ensure cleanup
    trap cleanup_test_repo EXIT

    # Run tests
    test_rc1_base
    test_rc2_base
    test_ga_base
    test_new_version_rc1_base
    test_json_output
    test_invalid_tag

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
