#!/bin/bash
set -euo pipefail

# Summit Assurance Evidence Pack Builder
# Packages SBOM, Provenance, and Vuln status into a verifiable tgz

OUTPUT_DIR="dist/assurance"
PACK_NAME="evidence-pack.tgz"
mkdir -p "$OUTPUT_DIR"

echo "Building evidence pack..."

# Create index.json
python3 scripts/assurance/index_builder.py "$OUTPUT_DIR"

# Package everything
tar -czf "$OUTPUT_DIR/$PACK_NAME" \
  -C "$OUTPUT_DIR" \
  sbom/ \
  provenance/ \
  vuln/ \
  index.json

echo "Evidence pack built: $OUTPUT_DIR/$PACK_NAME"
