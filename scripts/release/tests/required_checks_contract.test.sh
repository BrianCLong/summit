#!/usr/bin/env bash
# required_checks_contract.test.sh
# Tests for required checks contract validation.
#
# Run: ./scripts/release/tests/required_checks_contract.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

CONTRACT_FILE="${REPO_ROOT}/docs/release/REQUIRED_CHECKS_CONTRACT.md"
POLICY_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.yml"
WORKFLOWS_DIR="${REPO_ROOT}/.github/workflows"
RELEASE_SCRIPTS="${REPO_ROOT}/scripts/release"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

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

assert_no_diff() {
    local expected="$1"
    local actual="$2"
    local message="$3"

    ((++TESTS_RUN)) || true
    if diff -u <(echo "$expected") <(echo "$actual") >/dev/null; then
        log_pass "$message"
    else
        log_fail "$message"
        diff -u <(echo "$expected") <(echo "$actual") || true
    fi
}

extract_contract_checks() {
    awk '
        /<!-- CONTRACT:START -->/ {in_contract=1; next}
        /<!-- CONTRACT:END -->/ {in_contract=0}
        in_contract && /^  - / {
            line=$0
            sub(/^  - /, "", line)
            gsub(/"/, "", line)
            gsub(/\r/, "", line)
            print line
        }
    ' "$CONTRACT_FILE"
}

extract_workflow_contexts() {
    local file
    find "$WORKFLOWS_DIR" -maxdepth 1 -type f -name "*.yml" -print0 | while IFS= read -r -d '' file; do
        awk '
            function trim_name(value) {
                gsub(/^["'\'']|["'\'']$/, "", value)
                sub(/[[:space:]]+#.*/, "", value)
                return value
            }
            function flush_job() {
                if (job_id != "") {
                    name = job_name != "" ? job_name : job_id
                    name = trim_name(name)
                    if (workflow != "" && name != "") {
                        print workflow " / " name
                    }
                }
                job_id = ""
                job_name = ""
            }
            /^[^[:space:]]/ {
                if ($1 == "name:") {
                    workflow = substr($0, index($0, $2))
                    workflow = trim_name(workflow)
                }
            }
            /^jobs:/ { in_jobs = 1; next }
            in_jobs && /^[^ ]/ { in_jobs = 0; flush_job(); next }
            in_jobs && /^  [A-Za-z0-9_.-]+:/ {
                flush_job()
                job_id = $1
                sub(/:$/, "", job_id)
                next
            }
            in_jobs && /^    name:/ {
                job_name = substr($0, index($0, $2))
                job_name = trim_name(job_name)
            }
            END { flush_job() }
        ' "$file"
    done
}

test_contract_sorted() {
    log_test "Contract list is sorted (deterministic ordering)"
    local contract_raw
    contract_raw=$(extract_contract_checks)
    local contract_sorted
    contract_sorted=$(echo "$contract_raw" | sort)
    assert_no_diff "$contract_sorted" "$contract_raw" "Contract list is sorted"
}

test_contract_matches_policy() {
    log_test "Contract list matches policy always_required list"
    local contract_sorted
    contract_sorted=$(extract_contract_checks | sort)
    local policy_sorted
    policy_sorted=$("${RELEASE_SCRIPTS}/extract_required_checks_from_policy.sh" \
        --policy "$POLICY_FILE" | jq -r '.always_required[]' | sort)
    assert_no_diff "$contract_sorted" "$policy_sorted" "Contract list matches policy"
}

test_contract_checks_in_workflows() {
    log_test "Contract checks exist in workflow job contexts"
    local contract_sorted
    contract_sorted=$(extract_contract_checks | sort)
    local workflow_contexts
    workflow_contexts=$(extract_workflow_contexts | sort -u)

    local missing=()
    while IFS= read -r check; do
        [[ -z "$check" ]] && continue
        if ! echo "$workflow_contexts" | grep -Fxq "$check"; then
            missing+=("$check")
        fi
    done <<< "$contract_sorted"

    ((++TESTS_RUN)) || true
    if [[ ${#missing[@]} -eq 0 ]]; then
        log_pass "All contract checks exist in workflows"
    else
        log_fail "Missing contract checks in workflows: ${missing[*]}"
    fi
}

main() {
    echo "=========================================="
    echo "Required Checks Contract Tests"
    echo "=========================================="
    echo ""

    test_contract_sorted
    test_contract_matches_policy
    test_contract_checks_in_workflows

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
