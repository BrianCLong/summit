#!/bin/bash
set -e

echo "Starting Comprehensive Test Suite..."

FAIL=0

echo "---------------------------------------------------"
echo "Running Server Tests (Unit & Integration)"
echo "---------------------------------------------------"
echo "Executing: pnpm --filter intelgraph-server run test:coverage"
# We use || FAIL=1 to capture failure but continue to next suite?
# Usually in CI we want to know everything that failed.
pnpm --filter intelgraph-server run test:coverage || FAIL=1

echo "---------------------------------------------------"
echo "Running Client Tests (Unit)"
echo "---------------------------------------------------"
echo "Executing: cd client && pnpm test:coverage"
(cd client && pnpm test:coverage) || FAIL=1

echo "---------------------------------------------------"
echo "Running Python Tests (Unit & Integration)"
echo "---------------------------------------------------"
# Ensure directory exists
mkdir -p coverage/python

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo "pytest not found, attempting to install..."
    pip install pytest pytest-cov
fi

echo "Executing: pytest --cov=. --cov-report=json:coverage/python/coverage.json"
# We exclude node_modules and other non-python dirs to be safe, though pytest.ini should handle it.
pytest --cov=. --cov-report=json:coverage/python/coverage.json || FAIL=1

echo "Converting Python coverage..."
python3 scripts/convert_python_coverage.py coverage/python/coverage.json coverage/python/coverage-summary.json || echo "Python coverage conversion failed"

echo "---------------------------------------------------"
echo "Running End-to-End Tests (Playwright)"
echo "---------------------------------------------------"
echo "Executing: npx playwright test"
npx playwright test || FAIL=1

echo "---------------------------------------------------"
echo "Aggregating Coverage"
echo "---------------------------------------------------"
node scripts/coverage-aggregate.js || FAIL=1

if [ $FAIL -ne 0 ]; then
    echo "❌ One or more test suites failed."
    exit 1
else
    echo "✅ All test suites passed and coverage thresholds met."
    exit 0
fi
