#!/bin/bash
set -e

# SBOM Generation Script
# Requires cdxgen to be installed (npm install -g @cyclonedx/cdxgen)
# If not present, fails (as per sprint plan "Must")

OUTPUT_DIR="artifacts/sbom"
mkdir -p $OUTPUT_DIR

echo "Generating SBOM for Server..."

if ! command -v cdxgen &> /dev/null; then
    echo "Error: cdxgen is not installed."
    # Fails on missing attestation as per Sprint 31 E5 Must requirement
    echo "CRITICAL: SBOM generation failed due to missing tool."
    exit 1
fi

cdxgen -t nodejs -o $OUTPUT_DIR/server-sbom.json server/
echo "SBOM generated at $OUTPUT_DIR/server-sbom.json"

# Check for high severity vulnerabilities (mock check if cdxgen doesn't do it directly without plugins)
# In real flow, we might use 'npm audit' or 'trivy'
# npm audit --audit-level=high --prefix server/

echo "SBOM generation complete."
