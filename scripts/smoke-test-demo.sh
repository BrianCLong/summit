#!/usr/bin/env bash
set -e

echo "Running Switchboard Demo Smoke Test..."

# Run demo and capture output
OUTPUT=$(pnpm demo:switchboard)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ Demo command failed with exit code $EXIT_CODE"
  exit 1
fi

if [[ "$OUTPUT" != *"Switchboard Quickstart Demo"* ]]; then
  echo "❌ Output missing 'Switchboard Quickstart Demo'"
  exit 1
fi

if [[ "$OUTPUT" != *"VALID ✅"* ]]; then
  echo "❌ Output missing 'VALID ✅'"
  exit 1
fi

echo "✅ Smoke test passed!"
