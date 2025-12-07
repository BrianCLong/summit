#!/bin/bash
set -e

# SBOM Generation Script
# Requires: syft

OUTPUT_DIR=${1:-artifacts/sbom}
mkdir -p "$OUTPUT_DIR"

echo "Generating SBOMs..."

# Check if syft is installed
if ! command -v syft &> /dev/null; then
    echo "Syft not found. Installing..."
    mkdir -p .local/bin
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b .local/bin
    export PATH="$PWD/.local/bin:$PATH"
fi

# Generate SBOM for the repository (source)
echo "Generating Source SBOM..."
syft . -o cyclonedx-json="$OUTPUT_DIR/sbom-source.json"

# List generated files
ls -lh "$OUTPUT_DIR"
echo "✅ SBOMs generated in $OUTPUT_DIR"
