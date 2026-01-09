#!/usr/bin/env bash
# check_branch_protection_drift.test.sh
# Unit tests for branch protection drift detection
#
# Run: ./scripts/release/tests/check_branch_protection_drift.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_SCRIPTS="${SCRIPT_DIR}/.."
TEMP_DIR=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

setup() {
    TEMP_DIR=$(mktemp -d)
    mkdir -p "${TEMP_DIR}/bin" "${TEMP_DIR}/artifacts/release-train"
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

write_policy() {
    local policy_path="$1"
    cat > "${policy_path}" << 'POLICY'
version: "2.1.0"
branch_protection:
  branch: "main"
  enforce_admins: true
  require_pull_request_reviews: true
  require_code_owner_reviews: true
  required_approving_review_count: 1
  dismiss_stale_reviews: true
  require_conversation_resolution: true
  require_linear_history: true
  require_status_checks_strict: true
always_required:
  - name: "Check A"
    workflow: "check-a.yml"
    rationale: "Fixture"
POLICY
}

write_mock_gh_forbidden() {
    cat > "${TEMP_DIR}/bin/gh" << 'GH'
#!/usr/bin/env bash
if [[ "$1" == "api" ]]; then
  echo "HTTP 403: Resource not accessible by integration" >&2
  exit 1
fi
GH
    chmod +x "${TEMP_DIR}/bin/gh"
}

write_mock_gh_drift() {
    cat > "${TEMP_DIR}/bin/gh" << 'GH'
#!/usr/bin/env bash
if [[ "$1" == "api" ]]; then
  cat << 'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Check B"]
  },
  "enforce_admins": {"enabled": true},
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "required_conversation_resolution": {"enabled": true},
  "required_linear_history": {"enabled": true}
}
JSON
  exit 0
fi
GH
    chmod +x "${TEMP_DIR}/bin/gh"
}

test_strict_mode_fails_on_forbidden() {
    log_test "strict mode fails on forbidden API access"

    setup
    write_mock_gh_forbidden

    local policy_file="${TEMP_DIR}/policy.yml"
    write_policy "${policy_file}"

    local output
    set +e
    output=$(PATH="${TEMP_DIR}/bin:${PATH}" \
        "${RELEASE_SCRIPTS}/check_branch_protection_drift.sh" \
        --repo owner/repo \
        --branch main \
        --policy "${policy_file}" \
        --out-dir "${TEMP_DIR}/artifacts/release-train" \
        --strict 2>&1)
    local exit_code=$?
    set -e

    assert_exit_code 2 "${exit_code}" "Strict mode exits with API error"
    assert_output_contains "Cannot verify protections from fork PR" "${output}" \
        "Strict mode outputs fork guidance"

    teardown
}

test_strict_mode_fails_on_drift() {
    log_test "strict mode fails on drift"

    setup
    write_mock_gh_drift

    local policy_file="${TEMP_DIR}/policy.yml"
    write_policy "${policy_file}"

    local output
    set +e
    output=$(PATH="${TEMP_DIR}/bin:${PATH}" \
        "${RELEASE_SCRIPTS}/check_branch_protection_drift.sh" \
        --repo owner/repo \
        --branch main \
        --policy "${policy_file}" \
        --out-dir "${TEMP_DIR}/artifacts/release-train" \
        --strict 2>&1)
    local exit_code=$?
    set -e

    assert_exit_code 1 "${exit_code}" "Strict mode exits with drift error"

    local json_file="${TEMP_DIR}/artifacts/release-train/branch_protection_drift_report.json"
    ((++TESTS_RUN)) || true
    if [[ -f "${json_file}" ]] && jq -r '.missing_in_github[0]' "${json_file}" | grep -q "Check A"; then
        log_pass "JSON report captures missing check"
    else
        log_fail "JSON report missing expected drift details"
    fi

    teardown
}

main() {
    test_strict_mode_fails_on_forbidden
    test_strict_mode_fails_on_drift

    echo
    echo "Tests run: ${TESTS_RUN}"
    echo "Passed: ${TESTS_PASSED}"
    echo "Failed: ${TESTS_FAILED}"

    if [[ ${TESTS_FAILED} -gt 0 ]]; then
        exit 1
    fi
}

main
