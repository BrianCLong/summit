#!/bin/bash
set -euo pipefail

# Summit SBOM Generator
# Uses Syft to generate CycloneDX SBOMs for all build artifacts

OUTPUT_DIR=${1:-"compliance/sbom"}
mkdir -p "$OUTPUT_DIR"

echo "Generating SBOMs for Summit..."

# Check if Syft is available
if command -v syft &> /dev/null; then
  # Server SBOM
  if [ -f server/package.json ]; then
    echo "Generating Server SBOM..."
    syft dir:server -o cyclonedx-json > "$OUTPUT_DIR/server-sbom.json"
  fi

  # Client SBOM
  if [ -f client/package.json ]; then
    echo "Generating Client SBOM..."
    syft dir:client -o cyclonedx-json > "$OUTPUT_DIR/client-sbom.json"
  fi

  # Summit Web App SBOM
  if [ -f apps/web/package.json ]; then
      echo "Generating Web App SBOM..."
      syft dir:apps/web -o cyclonedx-json > "$OUTPUT_DIR/web-sbom.json"
  fi

  # PSC Runner SBOM (Rust)
  if [ -f rust/psc-runner/Cargo.toml ]; then
    echo "Generating PSC Runner SBOM..."
    syft dir:rust/psc-runner -o cyclonedx-json > "$OUTPUT_DIR/psc-runner-sbom.json"
  fi
else
  echo "Warning: Syft not found. Generating mock SBOMs for environment where Syft is unavailable."
  echo '{"bomFormat": "CycloneDX", "specVersion": "1.4", "note": "MOCK_SBOM"}' > "$OUTPUT_DIR/server-sbom.json"
  echo '{"bomFormat": "CycloneDX", "specVersion": "1.4", "note": "MOCK_SBOM"}' > "$OUTPUT_DIR/client-sbom.json"
fi

echo "SBOM generation complete. Artifacts in $OUTPUT_DIR"
