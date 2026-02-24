#!/bin/bash
set -euo pipefail

# Summit SBOM Generator Wrapper
# Ensures deterministic output for OMB M-26-05 compliance

OUTPUT_DIR=${1:-"dist/assurance/sbom"}
mkdir -p "$OUTPUT_DIR"

echo "Generating deterministic SBOM..."

# Use Node.js generator
node scripts/assurance/generate_sbom.js "$OUTPUT_DIR/summit.spdx.json"

echo "SBOM generation complete: $OUTPUT_DIR/summit.spdx.json"
