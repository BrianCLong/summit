#!/bin/bash
set -euo pipefail

# generate_evidence_bundle.sh
# Collects all compliance, test, and build artifacts into a structured Evidence Bundle.

EVIDENCE_DIR=${1:-"evidence/ga"}
mkdir -p "$EVIDENCE_DIR/sbom"
mkdir -p "$EVIDENCE_DIR/test-results"
mkdir -p "$EVIDENCE_DIR/provenance"

echo "Collecting Evidence Bundle into $EVIDENCE_DIR..."

# 1. Collect SBOMs
if [ -d "compliance/sbom" ]; then
    cp compliance/sbom/*.json "$EVIDENCE_DIR/sbom/"
else
    echo "Warning: No SBOMs found in compliance/sbom"
fi

# 2. Collect Test Results (Mock locations based on typical CI output)
# In real workflow, these would be collected from previous steps
if [ -f "junit.xml" ]; then
    cp junit.xml "$EVIDENCE_DIR/test-results/"
fi
if [ -f "coverage/coverage-summary.json" ]; then
    cp coverage/coverage-summary.json "$EVIDENCE_DIR/test-results/"
fi

# 3. Generate Build Manifest
echo "Generating Manifest..."
cat > "$EVIDENCE_DIR/provenance/build-manifest.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "${GITHUB_SHA:-$(git rev-parse HEAD)}",
  "ref": "${GITHUB_REF:-$(git branch --show-current)}",
  "builder": "Summit-GA-Automation"
}
EOF

# 4. List Collected Artifacts
echo "Evidence Collected:"
ls -R "$EVIDENCE_DIR"
