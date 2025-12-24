#!/bin/bash
# Generates a provenance manifest
set -e

OUTPUT="release/provenance.json"

echo "Generating Provenance Manifest..."

COMMIT_SHA=$(git rev-parse HEAD)
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Calculate hash of lockfile
LOCK_HASH=$(sha256sum pnpm-lock.yaml | awk '{print $1}')

cat > $OUTPUT <<EOF
{
  "build": {
    "commit": "$COMMIT_SHA",
    "date": "$BUILD_DATE",
    "builder": "GitHub Actions"
  },
  "dependencies": {
    "lockfile_hash": "$LOCK_HASH"
  }
}
EOF

echo "Provenance written to $OUTPUT"
