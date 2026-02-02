#!/bin/bash
set -e

# Summit Never-Log Scanner for Extortion Artifacts
# Checks for common sensitive patterns in generated artifacts.

ARTIFACTS_DIR=${1:-"packages/extortion/artifacts/extortion"}

echo "Starting never-log scan on $ARTIFACTS_DIR..."

# Patterns to block
PATTERNS=(
  "[0-9]{3}-[0-9]{2}-[0-9]{4}" # SSN
  "nvapi-[a-zA-Z0-9]{32}"      # NVIDIA API keys (as seen in memory)
  "Bearer [a-zA-Z0-9\._\-]+"   # JWT/Tokens
  "password="                  # Hardcoded passwords
)

FOUND=0

for pattern in "${PATTERNS[@]}"; do
  if grep -rE "$pattern" "$ARTIFACTS_DIR"; then
    echo "FAIL: Forbidden pattern '$pattern' found in $ARTIFACTS_DIR"
    FOUND=1
  fi
done

if [ $FOUND -eq 1 ]; then
  exit 1
else
  echo "SUCCESS: No forbidden patterns found."
  exit 0
fi
