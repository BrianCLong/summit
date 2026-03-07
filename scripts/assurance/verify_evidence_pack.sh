#!/bin/bash
set -euo pipefail

# Summit Assurance Evidence Pack Verifier
# Validates pack integrity and schema compliance

PACK_PATH=${1:?"Usage: $0 <pack-path>"}
TEMP_DIR=$(mktemp -d)

trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Verifying evidence pack: $PACK_PATH"

# Unpack
tar -xzf "$PACK_PATH" -C "$TEMP_DIR"

# Check index.json existence
if [ ! -f "$TEMP_DIR/index.json" ]; then
  echo "Error: index.json missing from pack"
  exit 1
fi

# Validate index against schema
node scripts/assurance/validate_schema.js "$TEMP_DIR/index.json"

# Check required KINDs
for kind in sbom provenance vuln; do
  if ! grep -q "\"kind\": \"$kind\"" "$TEMP_DIR/index.json"; then
    echo "Warning: Evidence kind '$kind' not found in index"
  fi
done

echo "Verification SUCCESS"
