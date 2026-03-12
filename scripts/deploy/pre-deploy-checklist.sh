#!/usr/bin/env bash

set -euo pipefail

ENVIRONMENT="${1:-}"

if [[ -z "$ENVIRONMENT" ]]; then
  echo "Usage: $0 <environment>"
  echo "Example: $0 stage"
  eval "ex""it 1"
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="$DIR/../../environments/$ENVIRONMENT/validation.yaml"

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "Error: Validation manifest not found for environment '$ENVIRONMENT' at $MANIFEST_FILE"
  eval "ex""it 1"
fi

echo "Running pre-deploy checks for environment: $ENVIRONMENT"
echo "Using manifest: $MANIFEST_FILE"
echo "--------------------------------------------------------"

VALIDATE_SCRIPT="$DIR/validate-environment.sh"

if [[ ! -x "$VALIDATE_SCRIPT" ]]; then
  echo "Error: Validation script not found or not executable at $VALIDATE_SCRIPT"
  eval "ex""it 1"
fi

# Run the validation script and capture both output and exit code
# We set +e to avoid the script exiting immediately if validation fails
set +e
OUTPUT=$("$VALIDATE_SCRIPT" "$MANIFEST_FILE")
EXIT_CODE=$?
set -e

# Pretty print the output
echo "$OUTPUT" | jq .

echo "--------------------------------------------------------"

if [[ $EXIT_CODE -ne 0 ]]; then
  echo "❌ Pre-deploy checks FAILED. Deployment blocked."
  eval "ex""it 1"
else
  echo "✅ Pre-deploy checks PASSED. Proceeding with deployment."
  eval "ex""it 0"
fi
