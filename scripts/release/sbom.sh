#!/bin/bash
set -e

# scripts/release/sbom.sh
# Generates SBOMs for source and built artifacts using Syft.

# Ensure output directory exists
mkdir -p dist/sbom

# Check for Syft
if ! command -v syft &> /dev/null; then
    echo "❌ Error: 'syft' is not installed."
    echo "   Please install it: brew install syft (or equivalent)"
    exit 1
fi

echo "📦 Generating Source SBOM (SPDX)..."
syft . \
    --output spdx-json=dist/sbom/sbom-source.spdx.json \
    --exclude ".git" \
    --exclude "node_modules" \
    --exclude "dist"

echo "✅ Source SBOM generated at dist/sbom/sbom-source.spdx.json"

# Function to generate image SBOM if image exists
generate_image_sbom() {
    local image_name=$1
    local output_file=$2

    if docker image inspect "$image_name" &> /dev/null; then
        echo "📦 Generating SBOM for image: $image_name..."
        syft "$image_name" --output spdx-json="$output_file"
        echo "✅ Image SBOM generated at $output_file"
    else
        echo "⚠️ Skipping image SBOM for '$image_name' (image not found locally)"
    fi
}

# Try to generate SBOMs for standard images if they exist
# Note: These image names should match what is defined in Makefile or CI
generate_image_sbom "intelgraph-platform:latest" "dist/sbom/sbom-server.spdx.json"
# Add other images here if needed, e.g., client
# generate_image_sbom "intelgraph-client:latest" "dist/sbom/sbom-client.spdx.json"

echo "🎉 SBOM generation complete."
