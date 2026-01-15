#!/usr/bin/env bash
# redaction_layer.test.sh v1.0.0
# Tests for the Release Ops redaction layer
#
# Verifies that the sanitizer correctly removes forbidden patterns
# and collapses sensitive sections. Fast, deterministic, no network.
#
# Authority: docs/ci/RELEASE_OPS_REDACTION.md

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
FIXTURES_DIR="${SCRIPT_DIR}/fixtures"
REDACTION_SCRIPT="${REPO_ROOT}/scripts/release/redact_release_ops_content.sh"
HTML_RENDER_SCRIPT="${REPO_ROOT}/scripts/release/render_release_ops_single_page_html.sh"
REDACTION_POLICY="${REPO_ROOT}/docs/ci/REDACTION_POLICY.yml"

# Test outputs
TMP_DIR=""
SANITIZED_MD=""
SANITIZED_HTML=""

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# --- Logging ---
log_info() {
    echo "[INFO] $*"
}

log_pass() {
    echo "[PASS] $*"
    ((TESTS_PASSED++))
}

log_fail() {
    echo "[FAIL] $*"
    ((TESTS_FAILED++))
}

log_error() {
    echo "[ERROR] $*" >&2
}

# --- Setup/Teardown ---
setup() {
    TMP_DIR=$(mktemp -d)
    SANITIZED_MD="${TMP_DIR}/sanitized.md"
    SANITIZED_HTML="${TMP_DIR}/sanitized.html"

    log_info "Test temp directory: ${TMP_DIR}"
}

teardown() {
    if [[ -n "${TMP_DIR}" ]] && [[ -d "${TMP_DIR}" ]]; then
        rm -rf "${TMP_DIR}"
    fi
}

trap teardown EXIT

# --- Test Helpers ---

# Check that a pattern does NOT appear in content
assert_not_contains() {
    local content="$1"
    local pattern="$2"
    local description="${3:-pattern should not appear}"

    ((TESTS_RUN++))

    if echo "${content}" | grep -qE "${pattern}" 2>/dev/null; then
        log_fail "${description}: Found forbidden pattern '${pattern}'"
        return 1
    else
        log_pass "${description}: Pattern absent '${pattern}'"
        return 0
    fi
}

# Check that a literal string DOES appear in content
assert_contains() {
    local content="$1"
    local literal="$2"
    local description="${3:-string should appear}"

    ((TESTS_RUN++))

    if echo "${content}" | grep -qF "${literal}" 2>/dev/null; then
        log_pass "${description}: Found '${literal}'"
        return 0
    else
        log_fail "${description}: Missing expected string '${literal}'"
        return 1
    fi
}

# Run assertions from the expectations file
run_assertions_from_file() {
    local content="$1"
    local assertions_file="$2"
    local content_type="${3:-markdown}"

    local line_num=0
    while IFS= read -r line || [[ -n "${line}" ]]; do
        ((line_num++))

        # Skip comments and empty lines
        [[ -z "${line}" ]] && continue
        [[ "${line}" =~ ^# ]] && continue
        [[ "${line}" =~ ^[[:space:]]*$ ]] && continue

        if [[ "${line}" =~ ^MUST_NOT_CONTAIN:[[:space:]]*(.+)$ ]]; then
            local pattern="${BASH_REMATCH[1]}"
            assert_not_contains "${content}" "${pattern}" "[${content_type}:${line_num}] MUST_NOT_CONTAIN"
        elif [[ "${line}" =~ ^MUST_CONTAIN:[[:space:]]*(.+)$ ]]; then
            local literal="${BASH_REMATCH[1]}"
            assert_contains "${content}" "${literal}" "[${content_type}:${line_num}] MUST_CONTAIN"
        fi
    done < "${assertions_file}"
}

# --- Tests ---

test_redaction_script_exists() {
    ((TESTS_RUN++))

    if [[ -x "${REDACTION_SCRIPT}" ]]; then
        log_pass "Redaction script exists and is executable"
        return 0
    else
        log_fail "Redaction script missing or not executable: ${REDACTION_SCRIPT}"
        return 1
    fi
}

test_policy_file_exists() {
    ((TESTS_RUN++))

    if [[ -f "${REDACTION_POLICY}" ]]; then
        log_pass "Redaction policy file exists"
        return 0
    else
        log_fail "Redaction policy missing: ${REDACTION_POLICY}"
        return 1
    fi
}

test_fixtures_exist() {
    ((TESTS_RUN++))

    local input="${FIXTURES_DIR}/redaction_input.md"
    local assertions="${FIXTURES_DIR}/redaction_expected_assertions.txt"

    if [[ -f "${input}" ]] && [[ -f "${assertions}" ]]; then
        log_pass "Test fixtures exist"
        return 0
    else
        log_fail "Test fixtures missing"
        [[ ! -f "${input}" ]] && log_error "  Missing: ${input}"
        [[ ! -f "${assertions}" ]] && log_error "  Missing: ${assertions}"
        return 1
    fi
}

test_sanitizer_runs() {
    ((TESTS_RUN++))

    local input="${FIXTURES_DIR}/redaction_input.md"

    if "${REDACTION_SCRIPT}" \
        --in "${input}" \
        --out "${SANITIZED_MD}" \
        --mode sanitized \
        --policy "${REDACTION_POLICY}" 2>/dev/null; then
        log_pass "Sanitizer executed successfully"
        return 0
    else
        log_fail "Sanitizer failed to execute"
        return 1
    fi
}

test_sanitizer_produces_output() {
    ((TESTS_RUN++))

    if [[ -f "${SANITIZED_MD}" ]] && [[ -s "${SANITIZED_MD}" ]]; then
        log_pass "Sanitizer produced non-empty output"
        return 0
    else
        log_fail "Sanitizer output is missing or empty"
        return 1
    fi
}

test_verify_only_passes() {
    ((TESTS_RUN++))

    if "${REDACTION_SCRIPT}" \
        --in "${SANITIZED_MD}" \
        --verify-only \
        --policy "${REDACTION_POLICY}" 2>/dev/null; then
        log_pass "Verify-only check passed on sanitized output"
        return 0
    else
        log_fail "Verify-only check FAILED - forbidden patterns remain!"
        return 1
    fi
}

test_verify_only_fails_on_raw_input() {
    ((TESTS_RUN++))

    local input="${FIXTURES_DIR}/redaction_input.md"

    # This should FAIL because raw input contains forbidden patterns
    if "${REDACTION_SCRIPT}" \
        --in "${input}" \
        --verify-only \
        --policy "${REDACTION_POLICY}" 2>/dev/null; then
        log_fail "Verify-only should have detected forbidden patterns in raw input"
        return 1
    else
        log_pass "Verify-only correctly detected forbidden patterns in raw input"
        return 0
    fi
}

test_markdown_assertions() {
    log_info "Running markdown assertions..."

    local content
    content=$(cat "${SANITIZED_MD}")
    local assertions="${FIXTURES_DIR}/redaction_expected_assertions.txt"

    run_assertions_from_file "${content}" "${assertions}" "markdown"
}

test_html_rendering() {
    ((TESTS_RUN++))

    if [[ ! -x "${HTML_RENDER_SCRIPT}" ]]; then
        log_info "HTML render script not executable, skipping HTML tests"
        log_pass "HTML tests skipped (renderer not available)"
        return 0
    fi

    if "${HTML_RENDER_SCRIPT}" "${SANITIZED_MD}" "${SANITIZED_HTML}" 2>/dev/null; then
        log_pass "HTML rendering succeeded"
    else
        log_fail "HTML rendering failed"
        return 1
    fi

    return 0
}

test_html_assertions() {
    if [[ ! -f "${SANITIZED_HTML}" ]]; then
        log_info "Skipping HTML assertions (no HTML output)"
        return 0
    fi

    log_info "Running HTML assertions..."

    local content
    content=$(cat "${SANITIZED_HTML}")
    local assertions="${FIXTURES_DIR}/redaction_expected_assertions.txt"

    # Run same assertions on HTML (forbidden patterns should still be absent)
    run_assertions_from_file "${content}" "${assertions}" "html"
}

test_full_mode_passthrough() {
    ((TESTS_RUN++))

    local input="${FIXTURES_DIR}/redaction_input.md"
    local full_output="${TMP_DIR}/full.md"

    if "${REDACTION_SCRIPT}" \
        --in "${input}" \
        --out "${full_output}" \
        --mode full \
        --policy "${REDACTION_POLICY}" 2>/dev/null; then

        # Full mode should preserve content
        local input_size full_size
        input_size=$(wc -c < "${input}")
        full_size=$(wc -c < "${full_output}")

        # Allow for minor differences (normalization)
        if [[ ${full_size} -ge $((input_size - 100)) ]]; then
            log_pass "Full mode preserves content (${full_size} bytes, original ${input_size})"
            return 0
        else
            log_fail "Full mode removed too much content"
            return 1
        fi
    else
        log_fail "Full mode failed to execute"
        return 1
    fi
}

# --- Main ---

print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Tests for the Release Ops redaction layer.

OPTIONS:
    --verbose    Show detailed output
    --help       Show this help message

EXAMPLES:
    # Run all tests
    $0

    # Run with verbose output
    $0 --verbose
EOF
}

main() {
    local verbose=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                verbose=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    echo "=============================================="
    echo "  Redaction Layer Tests"
    echo "=============================================="
    echo ""

    setup

    # Run tests
    log_info "=== Prerequisites ==="
    test_redaction_script_exists || true
    test_policy_file_exists || true
    test_fixtures_exist || true

    echo ""
    log_info "=== Sanitizer Execution ==="
    test_sanitizer_runs || true
    test_sanitizer_produces_output || true

    echo ""
    log_info "=== Verification ==="
    test_verify_only_passes || true
    test_verify_only_fails_on_raw_input || true

    echo ""
    log_info "=== Mode Tests ==="
    test_full_mode_passthrough || true

    echo ""
    log_info "=== Markdown Content Assertions ==="
    test_markdown_assertions

    echo ""
    log_info "=== HTML Rendering ==="
    test_html_rendering || true
    test_html_assertions

    # Summary
    echo ""
    echo "=============================================="
    echo "  Test Summary"
    echo "=============================================="
    echo ""
    echo "  Tests Run:    ${TESTS_RUN}"
    echo "  Tests Passed: ${TESTS_PASSED}"
    echo "  Tests Failed: ${TESTS_FAILED}"
    echo ""

    if [[ ${TESTS_FAILED} -gt 0 ]]; then
        echo "  STATUS: FAILED"
        echo ""
        log_error "Redaction layer tests failed. Do not publish to Pages."
        exit 1
    else
        echo "  STATUS: PASSED"
        echo ""
        log_info "All redaction layer tests passed."
        exit 0
    fi
}

main "$@"
