#!/bin/bash
set -e

# Reproducible Build Verification
# This script runs the full release build twice and compares the manifests
# to ensure byte-for-byte reproducibility of all GA artifacts.

echo "Starting reproducible build verification..."

# 1. First build
echo "Running first build..."
pnpm build:release > /dev/null
if [ ! -f dist/release/manifest.json ]; then
    echo "ERROR: manifest.json not found after first build."
    exit 1
fi
# Remove the timestamp for comparison and store the result
jq 'del(.build_timestamp)' dist/release/manifest.json > /tmp/manifest1.json
echo "First build complete."

# 2. Second build
echo "Running second build..."
pnpm build:release > /dev/null
if [ ! -f dist/release/manifest.json ]; then
    echo "ERROR: manifest.json not found after second build."
    exit 1
fi
# Remove the timestamp for comparison and store the result
jq 'del(.build_timestamp)' dist/release/manifest.json > /tmp/manifest2.json
echo "Second build complete."

# 3. Compare manifests
echo "Comparing build manifests (ignoring timestamp)..."
if diff -q /tmp/manifest1.json /tmp/manifest2.json; then
    echo "✅ SUCCESS: Builds are reproducible!"
    rm /tmp/manifest1.json /tmp/manifest2.json
    exit 0
else
    echo "❌ FAILURE: Builds are NOT reproducible."
    echo "Manifests differ (ignoring timestamp):"
    diff /tmp/manifest1.json /tmp/manifest2.json
    rm /tmp/manifest1.json /tmp/manifest2.json
    exit 1
fi
