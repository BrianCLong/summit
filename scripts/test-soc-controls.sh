#!/usr/bin/env bash
set -euo pipefail

# SOC Control Verification Script
# Usage: bash scripts/test-soc-controls.sh <TEST_PATH> <OUT_DIR> <COVERAGE_THRESHOLD> <FAIL_ON_ERROR>
# Example: bash scripts/test-soc-controls.sh ./server/__tests__/soc-controls ./soc-compliance-reports 100 true

TEST_PATH="${1:-./server/__tests__/soc-controls}"
OUT_DIR="${2:-./soc-compliance-reports}"
COVERAGE_THRESHOLD="${3:-100}"
FAIL_ON_ERROR="${4:-true}"

# Resolve absolute path for output directory
# We assume the script is run from repo root or correct relative path.
# Using PWD to make it absolute for the inner pnpm command.
if [[ "$OUT_DIR" != /* ]]; then
  ABS_OUT_DIR="$(pwd)/${OUT_DIR}"
else
  ABS_OUT_DIR="${OUT_DIR}"
fi

mkdir -p "${ABS_OUT_DIR}"

echo "==> Running SOC control verification suites…"
echo "    Test Path: ${TEST_PATH}"
echo "    Output Dir: ${ABS_OUT_DIR}"
echo "    Coverage Threshold: ${COVERAGE_THRESHOLD}%"
echo "    Fail on Error: ${FAIL_ON_ERROR}"

# Adjust TEST_PATH to be relative to server/ package
# We strip 'server/' or './server/' from the start.
SERVER_TEST_PATH=$(echo "$TEST_PATH" | sed -E 's|^(\./)?server/||')

echo "    Target Internal Path: ${SERVER_TEST_PATH}"

# Configure Jest JUnit reporter
export JEST_JUNIT_OUTPUT_DIR="${ABS_OUT_DIR}"
export JEST_JUNIT_OUTPUT_NAME="soc-compliance-report.xml"

EXIT_CODE=0

# Run the tests
# We pass coverage threshold for all categories
pnpm --filter intelgraph-server test:unit -- \
  "${SERVER_TEST_PATH}" \
  --reporters=default \
  --reporters=jest-junit \
  --coverage \
  --coverageThreshold "{\"global\":{\"branches\":${COVERAGE_THRESHOLD},\"functions\":${COVERAGE_THRESHOLD},\"lines\":${COVERAGE_THRESHOLD},\"statements\":${COVERAGE_THRESHOLD}}}" \
  || EXIT_CODE=$?

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "==> Tests FAILED with exit code $EXIT_CODE"
  if [ "$FAIL_ON_ERROR" = "true" ]; then
    echo "==> Blocking merge due to failure."
    exit $EXIT_CODE
  else
    echo "==> continuing despite failure (FAIL_ON_ERROR != true)"
  fi
else
  echo "==> SOC verification PASSED"
fi

echo "==> Reports generated in ${ABS_OUT_DIR}"
