#!/bin/bash
set -e

# Configuration
export EVIDENCE_DIR=${EVIDENCE_DIR:-artifacts/evidence/goldenpath-frontend/ci}
export EVIDENCE_RUN_ID=${GITHUB_RUN_ID:-local}
export GOLDEN_PATH_E2E_ENABLED=${GOLDEN_PATH_E2E_ENABLED:-0}

echo "Starting Golden Path E2E Run (Enabled: $GOLDEN_PATH_E2E_ENABLED)"

if [ "$GOLDEN_PATH_E2E_ENABLED" != "1" ]; then
  echo "Golden Path E2E is disabled. Skipping."
  exit 0
fi

# 1. Start Frontend
echo "Starting frontend..."
source scripts/ci/start_consolidated_frontend.sh

# 2. Run Tests
echo "Running Playwright tests..."
cd e2e/golden-path
# npm install is handled by CI step usually, but safe to run
npm install

EXIT_CODE=0
npx playwright test || EXIT_CODE=$?

cd ../..

# 3. Generate Evidence
echo "Generating evidence..."
export E2E_STATUS=$([ $EXIT_CODE -eq 0 ] && echo "success" || echo "failure")
export E2E_DURATION_MS=0 # TODO: Parse from report
export E2E_RETRIES=0
node scripts/ci/evidence_write.mjs

# 4. Enforce Policy (Optional here, or in separate step)
# scripts/ci/redaction_scan.sh

exit $EXIT_CODE
