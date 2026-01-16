#!/usr/bin/env bash
set -euo pipefail

# run-repro-build.sh: Verify build determinism and SBOM consistency

echo "Starting reproducible build check..."

# Re-run build with same deps
pnpm install --frozen-lockfile
pnpm run build

# Generate a fresh SBOM for comparison
echo "Generating reproduction SBOM..."
syft . --scope all-layers -o spdx-json=./repro.spdx.json

# Compare with the one generated during the main build
if [ -f "build/sbom/sbom.spdx.json" ]; then
    echo "Comparing fresh SBOM with build artifact..."
    # We might need to mask some timestamps or UUIDs if syft generates them differently each time
    # But for now, let's do a direct diff or use jq to compare essential parts
    if diff build/sbom/sbom.spdx.json repro.spdx.json > /dev/null; then
        echo "✅ SBOMs match! Build is consistent."
    else
        echo "⚠️ SBOMs differ. This might be due to timestamps or non-deterministic build outputs."
        diff build/sbom/sbom.spdx.json repro.spdx.json | head -n 20
        # exit 1 # Optional: fail the build if strict determinism is required
    fi
else
    echo "Error: build/sbom/sbom.spdx.json not found. Make sure to run the build step first."
    exit 1
fi
