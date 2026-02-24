#!/bin/bash
set -euo pipefail

# Summit Evidence Pack Verifier
# Validates the integrity and schema of an evidence pack tarball

PACK_FILE=${1:-"dist/assurance/evidence-pack.tgz"}
SCHEMA_FILE="schemas/assurance/evidence-pack.schema.json"
TMP_DIR=$(mktemp -d)

trap 'rm -rf "$TMP_DIR"' EXIT

echo "Verifying evidence pack: $PACK_FILE"

if [ ! -f "$PACK_FILE" ]; then
  echo "Error: Pack file not found."
  exit 1
fi

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Error: Schema file not found at $SCHEMA_FILE"
  exit 1
fi

# Extract
tar -xzf "$PACK_FILE" -C "$TMP_DIR"

# 1. Validate Index Schema using Node.js script
echo "Validating index schema..."
if node scripts/assurance/validate_schema.js "$SCHEMA_FILE" "$TMP_DIR/index.json"; then
  echo "✅ Index schema is valid."
else
  echo "❌ Index schema validation failed."
  exit 1
fi

# 2. Verify all items in index (Integrity Check)
echo "Checking file integrity..."
python3 -c "
import json, hashlib, os, sys
def get_sha256(filepath):
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            hasher.update(chunk)
    return hasher.hexdigest()

with open('$TMP_DIR/index.json', 'r') as f:
    index = json.load(f)

for item in index['items']:
    path = os.path.join('$TMP_DIR', item['path'])
    if not os.path.exists(path):
        print(f'Error: File missing: {item[\"path\"]}')
        sys.exit(1)
    actual_sha = get_sha256(path)
    if actual_sha != item['sha256']:
        print(f'Error: Hash mismatch for {item[\"path\"]}')
        sys.exit(1)
    print(f'Verified: {item[\"path\"]}')
"

echo "✅ Evidence pack verification successful."
