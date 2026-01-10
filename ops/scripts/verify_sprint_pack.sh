#!/usr/bin/env bash
set -euo pipefail

node scripts/check-boundaries.cjs

pnpm --filter intelgraph-server test -- --runTestsByPath \
  tests/middleware/auth.test.ts \
  src/services/__tests__/AuthService.test.ts \
  src/repos/__tests__/ProductIncrementRepo.test.ts \
  src/repos/__tests__/EntityRepo.test.ts \
  src/repos/__tests__/RelationshipRepo.test.ts \
  src/services/strategic-framework/__tests__/StrategicFramework.test.ts \
  tests/governance-acceptance.test.ts \
  src/analytics/anomalies/__tests__/AnomalyDetector.comprehensive.test.ts \
  src/publishing/__tests__/proof-carrying-publishing.test.ts

if [[ -n "${AUDIT_TEST_PATHS:-}" ]]; then
  read -r -a audit_paths <<< "${AUDIT_TEST_PATHS}"
  pnpm --filter intelgraph-server test -- --runTestsByPath "${audit_paths[@]}"
else
  echo "AUDIT_TEST_PATHS not set; skipping audit log tests."
fi

rg -n "AKIA[0-9A-Z]{16}" -S server/src

pnpm --filter intelgraph-server test

make smoke
