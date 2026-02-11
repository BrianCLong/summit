#!/bin/bash
set -e

# Deterministic packaging script

ARTIFACTS_DIR="artifacts"
BUILD_DIR="${ARTIFACTS_DIR}/build"
STAGING_DIR="${ARTIFACTS_DIR}/staging"
STAMP_DIR="${ARTIFACTS_DIR}/stamp"

mkdir -p "$BUILD_DIR" "$STAGING_DIR" "$STAMP_DIR"

# verify inputs
if [ ! -d "client/dist" ]; then
    echo "Warning: client/dist not found. Creating dummy for demo if missing."
    mkdir -p client/dist
    echo "dummy client" > client/dist/index.html
fi

if [ ! -d "server/dist" ]; then
    echo "Warning: server/dist not found. Creating dummy for demo if missing."
    mkdir -p server/dist
    echo "dummy server" > server/dist/index.js
fi

# Copy to staging
rm -rf "$STAGING_DIR"/*
mkdir -p "$STAGING_DIR/client" "$STAGING_DIR/server"

cp -r client/dist/* "$STAGING_DIR/client/"
cp -r server/dist/* "$STAGING_DIR/server/"

# Create stamp.json (volatile)
cat <<JSON > "${STAMP_DIR}/stamp.json"
{
  "build_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "runner": "${GITHUB_RUN_ID:-local}",
  "git_sha": "${GITHUB_SHA:-unknown}"
}
JSON

# Create deterministic tar
# Using GNU tar options
echo "Creating deterministic tarball..."

# Normalize timestamps in staging
find "$STAGING_DIR" -exec touch -t 202001010000 {} +

# Tar
# --sort=name : sort filenames
# --mtime : set modification time
# --owner=0 --group=0 --numeric-owner : root ownership
# --format=gnu : explicitly use gnu format
# -C "$STAGING_DIR" . : change to staging and archive everything

tar --sort=name \
    --mtime="2020-01-01 00:00Z" \
    --owner=0 --group=0 --numeric-owner \
    --format=gnu \
    -czf "${BUILD_DIR}/build.tgz" \
    -C "$STAGING_DIR" .

# Compute hash
sha256sum "${BUILD_DIR}/build.tgz"
echo "Pack complete: ${BUILD_DIR}/build.tgz"
