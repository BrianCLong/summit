#!/bin/bash
set -e

# Summit Determinism Gate for Extortion Artifacts
# Ensures that running the generator twice produces identical results.

PACKAGE_DIR="packages/extortion"
ARTIFACT_FILE="artifacts/extortion/extortion_report.json"
TEMP_FILE="/tmp/extortion_report_second_run.json"

echo "Running first generation..."
pnpm --filter @intelgraph/extortion generate

echo "Running second generation..."
# We use a temporary file to compare
pnpm --filter @intelgraph/extortion generate > /dev/null
# Note: the CLI writes to packages/extortion/artifacts/extortion/extortion_report.json
# To truly check determinism, we can copy it and run again.

cp "$PACKAGE_DIR/$ARTIFACT_FILE" "$TEMP_FILE"
pnpm --filter @intelgraph/extortion generate > /dev/null

if diff "$PACKAGE_DIR/$ARTIFACT_FILE" "$TEMP_FILE" > /dev/null; then
  echo "SUCCESS: Artifact generation is deterministic."
  rm "$TEMP_FILE"
  exit 0
else
  echo "FAIL: Artifact generation is NOT deterministic!"
  diff "$PACKAGE_DIR/$ARTIFACT_FILE" "$TEMP_FILE"
  rm "$TEMP_FILE"
  exit 1
fi
