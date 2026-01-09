#!/usr/bin/env bash
# hotfix_workflow_contract.test.sh
# Policy checks for hotfix-release workflow.

set -uo pipefail

WORKFLOW_FILE=".github/workflows/hotfix-release.yml"

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
  ((TESTS_PASSED++))
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((TESTS_FAILED++))
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="$3"
  ((TESTS_RUN++))
  if echo "$haystack" | rg -q --fixed-strings "$needle"; then
    log_pass "$message"
  else
    log_fail "$message"
  fi
}

assert_not_contains() {
  local haystack="$1"
  local needle="$2"
  local message="$3"
  ((TESTS_RUN++))
  if echo "$haystack" | rg -q --fixed-strings "$needle"; then
    log_fail "$message"
  else
    log_pass "$message"
  fi
}

if [[ ! -f "$WORKFLOW_FILE" ]]; then
  echo "Workflow file not found: $WORKFLOW_FILE" >&2
  exit 1
fi

WORKFLOW_CONTENT=$(cat "$WORKFLOW_FILE")

log_test "Hotfix workflow is dispatch-only"
assert_contains "$WORKFLOW_CONTENT" "workflow_dispatch" "workflow_dispatch trigger present"
assert_not_contains "$WORKFLOW_CONTENT" "push:" "no push trigger"
assert_not_contains "$WORKFLOW_CONTENT" "schedule:" "no schedule trigger"
assert_not_contains "$WORKFLOW_CONTENT" "workflow_call:" "no reusable trigger"

log_test "Hotfix workflow has no soft gates"
assert_not_contains "$WORKFLOW_CONTENT" "continue-on-error: true" "no continue-on-error"
assert_not_contains "$WORKFLOW_CONTENT" "|| true" "no soft-fail shell guards"

log_test "Hotfix workflow uses required checks mapping"
assert_contains "$WORKFLOW_CONTENT" "verify-green-for-tag.sh" "required checks verification used"

echo "-----------------------------------"
if [[ $TESTS_FAILED -gt 0 ]]; then
  echo "${RED}FAILED${NC}: ${TESTS_FAILED} of ${TESTS_RUN} tests failed"
  exit 1
fi

echo "${GREEN}PASSED${NC}: ${TESTS_PASSED} of ${TESTS_RUN} tests passed"
