#!/bin/bash
# scripts/compliance/generate_sbom.sh
set -e

echo "Generating SBOM for IntelGraph Sprint 24..."
mkdir -p artifacts/sbom

# Mock SBOM generation for MVP
echo "{ \"bomFormat\": \"CycloneDX\", \"specVersion\": \"1.4\", \"components\": [] }" > artifacts/sbom/bom.json

echo "SBOM generated successfully at artifacts/sbom/bom.json"
