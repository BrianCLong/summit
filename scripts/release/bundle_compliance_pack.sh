#!/usr/bin/env bash
# bundle_compliance_pack.sh
#
# Creates a portable zip file containing all governance and regulatory
# artifacts for external auditors.

set -euo pipefail

OUTPUT_DIR="artifacts/release"
BUNDLE_NAME="summit-regulatory-pack-$(date +%Y%m%d).zip"
TEMP_DIR="artifacts/temp_compliance_pack"

echo "Creating Compliance Bundle..."

# Clean up
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy Governance Docs
echo "  Copying Governance Documentation..."
mkdir -p "$TEMP_DIR/governance"
cp -r docs/governance/* "$TEMP_DIR/governance/"
cp docs/models/* "$TEMP_DIR/governance/models/" 2>/dev/null || true

# Copy Compliance Artifacts
echo "  Copying Compliance Artifacts..."
mkdir -p "$TEMP_DIR/compliance"
cp -r compliance/* "$TEMP_DIR/compliance/"

# Copy Latest Evidence (if exists)
if [ -d "artifacts/evidence/governance" ]; then
    echo "  Copying Latest Evidence..."
    mkdir -p "$TEMP_DIR/evidence"
    cp -r artifacts/evidence/governance/* "$TEMP_DIR/evidence/"
fi

# Add Manifest
echo "Generated: $(date -u)" > "$TEMP_DIR/MANIFEST.txt"
echo "Commit: $(git rev-parse HEAD)" >> "$TEMP_DIR/MANIFEST.txt"

# Zip it up
echo "  Zipping..."
(cd "$TEMP_DIR" && zip -r "../../$OUTPUT_DIR/$BUNDLE_NAME" .)

echo "✅ Compliance Bundle Created: $OUTPUT_DIR/$BUNDLE_NAME"
