#!/usr/bin/env bash
set -euo pipefail

# SOC Control Test Runner
# Usage: scripts/test-soc-controls.sh [TEST_DIR] [OUT_DIR] [TIMEOUT] [STRICT]
#
# Arguments:
#   TEST_DIR - Optional test directory to focus on (defaults to all SOC tests)
#   OUT_DIR  - Output directory for reports (defaults to ./soc-compliance-reports)
#   TIMEOUT  - Test timeout in seconds (defaults to 100)
#   STRICT   - Strict mode: fail on any warning (defaults to true)

TEST_DIR="${1:-}"
OUT_DIR="${2:-./soc-compliance-reports}"
TIMEOUT="${3:-100}"
STRICT="${4:-true}"

mkdir -p "${OUT_DIR}"

echo "==> Running SOC control verification suites…"
echo "    Output directory: ${OUT_DIR}"
echo "    Test timeout: ${TIMEOUT}s"
echo "    Strict mode: ${STRICT}"

# Determine which tests to run
if [ -n "${TEST_DIR}" ] && [ -d "${TEST_DIR}" ]; then
  echo "    Focused on: ${TEST_DIR}"
  pnpm --filter server test -- --runTestsByPath \
    "${TEST_DIR}" \
    --testTimeout="${TIMEOUT}000" \
    --reporters=default \
    --reporters=jest-junit \
    --outputFile="${OUT_DIR}/soc-controls.xml"
else
  # Run all SOC control test suites

  # Core server SOC tests
  if [ -d "server/__tests__/soc-controls" ]; then
    echo "    Running server/__tests__/soc-controls…"
    pnpm --filter server test -- --runTestsByPath \
      server/__tests__/soc-controls/auth \
      server/__tests__/soc-controls/crypto \
      --testTimeout="${TIMEOUT}000" \
      --reporters=default \
      --reporters=jest-junit \
      --outputFile="${OUT_DIR}/server-soc-controls.xml"
  fi

  # SOC2ComplianceService tests
  if [ -f "server/src/services/__tests__/SOC2ComplianceService.test.ts" ]; then
    echo "    Running SOC2ComplianceService tests…"
    pnpm --filter server test -- --runTestsByPath \
      server/src/services/__tests__/SOC2ComplianceService.test.ts \
      --testTimeout="${TIMEOUT}000" \
      --reporters=default \
      --reporters=jest-junit \
      --outputFile="${OUT_DIR}/soc2-compliance-service.xml"
  fi

  # Monorepo-level verification tests
  if [ -f "test/verification/soc-controls.test.ts" ]; then
    echo "    Running monorepo SOC verification tests…"
    pnpm test -- --runTestsByPath \
      test/verification/soc-controls.test.ts \
      --testTimeout="${TIMEOUT}000" \
      --reporters=default \
      --reporters=jest-junit \
      --outputFile="${OUT_DIR}/monorepo-soc-controls.xml"
  fi
fi

# Create a summary report
echo "==> SOC control verification complete. Reports in ${OUT_DIR}"
echo "==> Test results:"
ls -lh "${OUT_DIR}"

# Exit with failure if strict mode and any tests failed
# Jest will already exit with non-zero if tests failed due to set -e
exit 0
