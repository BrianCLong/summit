#!/bin/bash
set -e

# Configuration
STRICT=${SUMMIT_AGENT_TRACE_STRICT:-0}
REVISION=$(git rev-parse HEAD)
BASE_REF=${GITHUB_BASE_REF:-main}

echo "Running Agent Trace Required Gate..."
echo "Revision: $REVISION"
echo "Strict Mode: $STRICT"

# Get changed files (excluding .summit/ and other meta)
CHANGED_FILES=$(git diff --name-only origin/$BASE_REF...HEAD | grep -v "^\.summit/" | grep -v "^\.github/" || true)

if [ -z "$CHANGED_FILES" ]; then
  echo "No code changes detected. Skipping."
  exit 0
fi

echo "Detected changed files:"
echo "$CHANGED_FILES"

# Run summary and validation
# We use npx tsx to run the CLI
npx tsx packages/agent-trace/src/cli.ts summarize $REVISION

# Convert space-separated changed files to comma-separated for CLI
FILES_COMMA=$(echo "$CHANGED_FILES" | paste -sd "," -)

# Policy check
STRICT_FLAG=""
if [ "$STRICT" -eq 1 ]; then
  STRICT_FLAG="--strict"
fi

npx tsx packages/agent-trace/src/cli.ts check-policy $REVISION --changed-files "$FILES_COMMA" $STRICT_FLAG

echo "✅ Agent Trace Required Gate passed."
exit 0
