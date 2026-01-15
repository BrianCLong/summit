#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-./soc-compliance-reports}"

mkdir -p "${OUT_DIR}"

echo "==> Running SOC control verification suites…"

# Core server SOC tests
if [ -d "server/tests/soc-controls" ]; then
  pnpm --filter intelgraph-server test -- \
    tests/soc-controls/auth \
    tests/soc-controls/crypto \
    --reporters=default \
    --reporters=jest-junit \
    --outputFile="${OUT_DIR}/server-soc-controls.xml"
fi

# SOC2ComplianceService tests
if [ -f "server/src/services/__tests__/SOC2ComplianceService.test.ts" ]; then
  pnpm --filter intelgraph-server test -- --runTestsByPath \
    src/services/__tests__/SOC2ComplianceService.test.ts \
    --reporters=default \
    --reporters=jest-junit \
    --outputFile="${OUT_DIR}/soc2-compliance-service.xml"
fi

# Monorepo-level verification tests
if [ -f "test/verification/soc-controls.test.ts" ]; then
  pnpm test -- --runTestsByPath \
    test/verification/soc-controls.test.ts \
    --reporters=default \
    --reporters=jest-junit \
    --outputFile="${OUT_DIR}/monorepo-soc-controls.xml"
fi

echo "==> SOC control verification complete. Reports in ${OUT_DIR}"
