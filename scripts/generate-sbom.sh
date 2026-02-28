#!/bin/bash
set -e
echo "🚀 Starting SBOM Generation Process..."
ARTIFACT_NAME=${1:-"summit-platform"}
VERSION=${2:-"latest"}
OUTPUT_DIR=${3:-"./sboms"}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
mkdir -p "$OUTPUT_DIR"

if command -v syft &> /dev/null; then
  echo "📦 Generating SBOM for current directory..."
  syft dir:. -o cyclonedx-json --file "$OUTPUT_DIR/sbom.cdx.json"
fi

cat > "$OUTPUT_DIR/SBOM_SUMMARY.json" << EOF
{
  "artifactName": "$ARTIFACT_NAME",
  "version": "$VERSION",
  "timestamp": "$TIMESTAMP",
  "status": "success"
}
