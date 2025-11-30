#!/bin/bash
# Mock SBOM generation script
echo "Generating SBOM for intelgraph-server..."
mkdir -p artifacts
echo '{"bomFormat": "CycloneDX", "specVersion": "1.4", "components": []}' > artifacts/sbom.json
echo "SBOM generated at artifacts/sbom.json"

# Mock SLSA Provenance
echo "Generating SLSA Provenance..."
echo "{\"builder\": {\"id\": \"github-actions\"}, \"buildType\": \"npm\", \"materials\": [{\"uri\": \"git+https://github.com/BrianCLong/summit.git\", \"digest\": {\"sha1\": \"$GITHUB_SHA\"}}]}" > artifacts/provenance.json
echo "Provenance generated at artifacts/provenance.json"
