#!/bin/bash
set -e

# Output directory for SBOMs
OUTPUT_DIR="artifacts/sbom"
mkdir -p "$OUTPUT_DIR"

echo "Generating SBOM for Root..."
npx @cyclonedx/cdxgen . -o "$OUTPUT_DIR/sbom-root.json" --spec-version 1.5

echo "Generating SBOM for Server..."
cd server
npx @cyclonedx/cdxgen . -o "../$OUTPUT_DIR/sbom-server.json" --spec-version 1.5
cd ..

echo "Generating SBOM for Web..."
cd apps/web
npx @cyclonedx/cdxgen . -o "../../$OUTPUT_DIR/sbom-web.json" --spec-version 1.5
cd ../..

echo "SBOM generation complete. Artifacts stored in $OUTPUT_DIR"
