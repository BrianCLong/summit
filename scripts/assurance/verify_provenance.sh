#!/bin/bash
set -euo pipefail

# Summit Provenance Verifier
# Validates artifacts against recorded digests in provenance

PROVENANCE_DIR=${1:-"dist/assurance/provenance"}
SBOM_FILE="dist/assurance/sbom/summit.spdx.json"
DIGEST_FILE="$PROVENANCE_DIR/digests.json"

echo "Verifying provenance..."

if [ ! -f "$DIGEST_FILE" ]; then
  echo "Error: Digest file not found at $DIGEST_FILE"
  exit 1
fi

if [ ! -f "$SBOM_FILE" ]; then
  echo "Error: SBOM file not found at $SBOM_FILE"
  exit 1
fi

# Verify SBOM digest
RECORDED_SHA=$(jq -r '.artifacts[] | select(.name=="summit.spdx.json") | .sha256' "$DIGEST_FILE")
ACTUAL_SHA=$(sha256sum "$SBOM_FILE" | awk '{print $1}')

if [ "$RECORDED_SHA" != "$ACTUAL_SHA" ]; then
  echo "Error: SBOM digest mismatch!"
  echo "Recorded: $RECORDED_SHA"
  echo "Actual:   $ACTUAL_SHA"
  exit 1
fi

echo "Provenance verification successful."
