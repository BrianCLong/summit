#!/usr/bin/env bash
set -euo pipefail

# Deterministic Environment
export TZ=UTC
export LANG=C
export LC_ALL=C
# SOURCE_DATE_EPOCH should be set by the caller (workflow)
if [[ -z "${SOURCE_DATE_EPOCH:-}" ]]; then
  echo "Error: SOURCE_DATE_EPOCH not set" >&2
  exit 1
fi
export USER="repro-user"

# Args
OUTPUT_TAR=${1:-"dist/evidence.tgz"}
TAG=${2:-"v0.0.0-repro"}

# Calculate ISO timestamp for release-bundle.mjs
# Use date -u -d @EPOCH (GNU) or -r EPOCH (BSD)
# In CI (Ubuntu), it acts as GNU.
ISO_DATE=$(date -u -d "@${SOURCE_DATE_EPOCH}" +"%Y-%m-%dT%H:%M:%SZ")

echo "Starting Reproducible Build..."
echo "  SOURCE_DATE_EPOCH: $SOURCE_DATE_EPOCH"
echo "  ISO_DATE: $ISO_DATE"
echo "  USER: $USER"

# Install deps (assuming pnpm is setup)
pnpm install --frozen-lockfile

# Run Release Bundle
# Note: we pass --now to control generated_at
echo "Running release-bundle.mjs..."
node scripts/release/release-bundle.mjs --tag "$TAG" --now "$ISO_DATE"

# Verify Output
BUNDLE_DIR="dist/release"
if [[ ! -d "$BUNDLE_DIR" ]]; then
  echo "Error: Build did not produce $BUNDLE_DIR" >&2
  exit 1
fi

# Package Deterministically
echo "Packaging artifact..."
mkdir -p "$(dirname "$OUTPUT_TAR")"

tar --sort=name     --mtime="@${SOURCE_DATE_EPOCH}"     --owner=0 --group=0 --numeric-owner     --format=gnu     -cf "$OUTPUT_TAR"     "$BUNDLE_DIR"

echo "Artifact packaged at $OUTPUT_TAR"
sha256sum "$OUTPUT_TAR"
