#!/bin/bash
set -e

# Configuration
export BASE_URL=${BASE_URL:-http://localhost:3000}
export GOLDEN_PATH_E2E_ENABLED=${GOLDEN_PATH_E2E_ENABLED:-0}
export GOLDEN_PATH_JOURNEY=${GOLDEN_PATH_JOURNEY:-basic}
export EVIDENCE_DIR=${EVIDENCE_DIR:-artifacts/evidence/goldenpath-frontend}
export EVIDENCE_RUN_ID=${GITHUB_RUN_ID:-$(date +%s)}

echo "Running Golden Path E2E Tests..."
echo "BASE_URL: $BASE_URL"
echo "ENABLED: $GOLDEN_PATH_E2E_ENABLED"
echo "JOURNEY: $GOLDEN_PATH_JOURNEY"

if [ "$GOLDEN_PATH_E2E_ENABLED" != "1" ]; then
  echo "Golden Path E2E is disabled. Skipping."
  exit 0
fi

# Start frontend (background)
./scripts/ci/start_consolidated_frontend.sh

# Run tests
echo "Running Playwright..."
# Install deps if not cached
if [ ! -d "e2e/golden-path/node_modules" ]; then
    echo "Installing E2E dependencies..."
    cd e2e/golden-path && npm install && cd ../..
fi

# Run playwright from e2e/golden-path directory
cd e2e/golden-path
START_TIME=$(date +%s%3N)
# Capture exit code but don't exit immediately so we can write evidence
set +e
npx playwright test
EXIT_CODE=$?
set -e
END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))

cd ../..

# Emit Evidence
echo "Emitting Evidence..."
export E2E_STATUS=$([ $EXIT_CODE -eq 0 ] && echo "pass" || echo "fail")
export E2E_DURATION_MS=$DURATION
export E2E_RETRIES=0
node scripts/ci/evidence_write.mjs

# Run Policy Gate (Redaction Scan)
echo "Running Redaction Scan..."
./scripts/ci/redaction_scan.sh

if [ $EXIT_CODE -ne 0 ]; then
    echo "Tests failed!"
    exit $EXIT_CODE
fi
echo "Tests passed!"
