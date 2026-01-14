#!/usr/bin/env bash
# branch_protection_drift_workflow_validation.test.sh
# Validates ga / gate workflow validation in branch protection drift script.
#
# Run: ./scripts/release/tests/branch_protection_drift_workflow_validation.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
FIXTURE_WORKFLOW="${SCRIPT_DIR}/fixtures/ci_missing_ga_gate.yml"
OUT_DIR="$(mktemp -d)"

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

assert_file_exists() {
  local path="$1"
  local message="$2"

  TESTS_RUN=$((TESTS_RUN + 1))
  if [[ -f "$path" ]]; then
    log_pass "$message"
  else
    log_fail "$message (missing: $path)"
  fi
}

log_test "Branch protection drift script reports ga / gate workflow validation errors"

set +e
GA_GATE_WORKFLOW_FILE="$FIXTURE_WORKFLOW" \
  "${REPO_ROOT}/scripts/release/check_branch_protection_drift.sh" \
  --repo "example/example" \
  --branch "main" \
  --out-dir "$OUT_DIR" \
  > /dev/null 2>&1
exit_code=$?
set -e

assert_equal "0" "$exit_code" "Drift script should exit 0 in advisory mode"
assert_file_exists "$OUT_DIR/branch_protection_drift_report.json" "JSON report should be written"

workflow_valid=$(jq -r '.workflow_validation.valid' "$OUT_DIR/branch_protection_drift_report.json")
assert_equal "false" "$workflow_valid" "Workflow validation should fail when ga_gate is missing"

if [[ "$TESTS_FAILED" -ne 0 ]]; then
  echo "${TESTS_FAILED} test(s) failed."
  exit 1
fi

echo "All ${TESTS_RUN} tests passed."
