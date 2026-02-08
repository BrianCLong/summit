#!/bin/bash
# package-evidence.sh: Bundles source and projection state into auditable artifacts.

set -e

PROJECTION_NAME=${1:-"orders-v1"}
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
OUTPUT_DIR="evidence/projections/${PROJECTION_NAME}/${COMMIT_SHA}"

echo "Generating evidence bundle for ${PROJECTION_NAME} at commit ${COMMIT_SHA}..."

mkdir -p "${OUTPUT_DIR}"

# Portability: Check for sha256sum or shasum
if command -v sha256sum >/dev/null 2>&1; then
  HASH=$(echo -n "${COMMIT_SHA}@projection:${PROJECTION_NAME}" | sha256sum | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
  HASH=$(echo -n "${COMMIT_SHA}@projection:${PROJECTION_NAME}" | shasum -a 256 | awk '{print $1}')
else
  echo "Warning: Neither sha256sum nor shasum found. Using 'unknown-hash'."
  HASH="unknown-hash"
fi

# Create evidence manifest
cat <<EOF > "${OUTPUT_DIR}/manifest.json"
{
  "projection": "${PROJECTION_NAME}",
  "source_commit": "${COMMIT_SHA}",
  "evidence_id": "sha256:${HASH}",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "type": "projection-provenance"
}
EOF

echo "Evidence bundle generated at ${OUTPUT_DIR}/manifest.json"
