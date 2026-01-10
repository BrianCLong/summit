#!/usr/bin/env bash
# ga_gate_workflow.test.sh
# Validates ga / gate workflow job exists and has stable name.
#
# Run: ./scripts/release/tests/ga_gate_workflow.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
WORKFLOW_FILE="${REPO_ROOT}/.github/workflows/ci.yml"
EXPECTED_JOB_ID="ga_gate"
EXPECTED_NAME="ga / gate"

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
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

assert_equal() {
  local expected="$1"
  local actual="$2"
  local message="$3"

  TESTS_RUN=$((TESTS_RUN + 1))
  if [[ "$expected" == "$actual" ]]; then
    log_pass "$message"
  else
    log_fail "$message (expected '$expected', got '$actual')"
  fi
}

assert_non_empty() {
  local value="$1"
  local message="$2"

  TESTS_RUN=$((TESTS_RUN + 1))
  if [[ -n "$value" ]]; then
    log_pass "$message"
  else
    log_fail "$message (value was empty)"
  fi
}

log_test "ga / gate workflow job exists and name is stable"

if [[ ! -f "$WORKFLOW_FILE" ]]; then
  log_fail "Workflow file missing: $WORKFLOW_FILE"
else
  if command -v yq &> /dev/null; then
    JOB_NAME=$(yq -r ".jobs.${EXPECTED_JOB_ID}.name // \"\"" "$WORKFLOW_FILE" 2>/dev/null || true)
  else
    JOB_NAME=$(grep -A6 "^  ${EXPECTED_JOB_ID}:" "$WORKFLOW_FILE" | grep -m1 "name:" | sed -E 's/.*name:\s*//' || true)
  fi

  assert_non_empty "$JOB_NAME" "Job '${EXPECTED_JOB_ID}' should exist"
  assert_equal "$EXPECTED_NAME" "$JOB_NAME" "Job name should match ga / gate"
fi

if [[ "$TESTS_FAILED" -ne 0 ]]; then
  echo "${TESTS_FAILED} test(s) failed."
  exit 1
fi

echo "All ${TESTS_RUN} tests passed."
