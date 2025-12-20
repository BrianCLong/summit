#!/bin/bash
set -euo pipefail

GOLDEN_PATH="observability/golden_paths.yaml"

if [ ! -f "$GOLDEN_PATH" ]; then
  echo "Error: $GOLDEN_PATH not found."
  exit 1
fi

echo "Verifying Golden Paths configuration..."
# Simple validation: Check if 'paths' and 'criticality' are present
if grep -q "paths:" "$GOLDEN_PATH" && grep -q "criticality:" "$GOLDEN_PATH"; then
  echo "Golden Paths configuration looks valid."
  # In a real environment, this would curl the endpoints defined in the YAML
  # For now, we verified the configuration exists.
else
  echo "Error: Invalid Golden Paths configuration."
  exit 1
fi
