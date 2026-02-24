#!/usr/bin/env bash
set -e

# Ensure we are in connectors/gdelt_gkg
if [[ ! -f "package.json" ]]; then
    echo "Must run from connectors/gdelt_gkg directory"
    false
fi

# Generate fixture
echo "Generating fixture..."
../../node_modules/.bin/ts-node test/generate_fixture.ts

# Set env vars for local testing
export GDELT_LOCAL_INDEX="$(pwd)/test/fixtures/md5sums"
export GDELT_BASE_URL="file://$(pwd)/test/fixtures"

# Clean previous artifacts
rm -rf artifacts/evidence

# Run connector
echo "Running connector..."
node dist/index.js --date 20150218230000 --output artifacts/evidence

# Verify output
EXPECTED_DIR="artifacts/evidence/connectors-gdelt-gkg/gdelt-gkg-20150218230000"
if [ -d "$EXPECTED_DIR" ]; then
    echo "Output directory found: $EXPECTED_DIR"
else
    echo "Output directory NOT found: $EXPECTED_DIR"
    if [ -d "artifacts/evidence" ]; then
        find artifacts/evidence
    fi
    false
fi

if [ -f "$EXPECTED_DIR/report.json" ]; then
    echo "report.json found!"
else
    echo "report.json NOT found!"
    false
fi

if [ -f "$EXPECTED_DIR/metrics.json" ]; then
    echo "metrics.json found!"
else
    echo "metrics.json NOT found!"
    false
fi

if [ -f "$EXPECTED_DIR/stamp.json" ]; then
    echo "stamp.json found!"
else
    echo "stamp.json NOT found!"
    false
fi

echo "Determinism test PASSED."
