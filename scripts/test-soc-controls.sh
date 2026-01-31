#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-./soc-compliance-reports}"

mkdir -p "${OUT_DIR}"

echo "==> Running SOC control verification suites…"

# SOC control verification tests
if [ -f "server/tests/soc-controls/soc-controls.test.ts" ]; then
  pnpm --filter intelgraph-server test:unit -- --runTestsByPath \
    tests/soc-controls/soc-controls.test.ts \
    --reporters=default \
    --reporters=jest-junit \
    --outputFile="${OUT_DIR}/server-soc-controls.xml"
fi

# SOC2ComplianceService tests
if [ -f "server/src/services/__tests__/SOC2ComplianceService.test.ts" ]; then
  pnpm --filter intelgraph-server test:unit -- --runTestsByPath \
    src/services/__tests__/SOC2ComplianceService.test.ts \
    --reporters=default \
    --reporters=jest-junit \
    --outputFile="${OUT_DIR}/soc2-compliance-service.xml"
fi

echo "==> SOC control verification complete. Reports in ${OUT_DIR}"
