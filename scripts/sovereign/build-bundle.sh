#!/bin/bash
set -eo pipefail

echo "Building Sovereign Deployment Artifact Bundle..."
RELEASE_VERSION=${1:-"v1.0.0"}
BUNDLE_DIR="build/sovereign-bundle-$RELEASE_VERSION"
mkdir -p "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR/images"
mkdir -p "$BUNDLE_DIR/sbom"
mkdir -p "$BUNDLE_DIR/signatures"
mkdir -p "$BUNDLE_DIR/policies"
mkdir -p "$BUNDLE_DIR/manifests"

echo "1. Exporting OCI Images (Mock)"
touch "$BUNDLE_DIR/images/summit-server.tar"
touch "$BUNDLE_DIR/images/summit-client.tar"

echo "2. Generating SBOMs (Mock)"
cat > "$BUNDLE_DIR/sbom/summit-server-sbom.cdx.json" << 'SBOM'
{ "bomFormat": "CycloneDX", "specVersion": "1.4", "version": 1 }
SBOM
cat > "$BUNDLE_DIR/sbom/summit-client-sbom.cdx.json" << 'SBOM'
{ "bomFormat": "CycloneDX", "specVersion": "1.4", "version": 1 }
SBOM

echo "3. Exporting Default Policies"
cp -r docs/governance/ "$BUNDLE_DIR/policies/" 2>/dev/null || echo "Governance dir missing, skipping"

echo "4. Generating Checksums"
cd "build"
find "sovereign-bundle-$RELEASE_VERSION" -type f -exec sha256sum {} \; > "sovereign-bundle-$RELEASE_VERSION.sha256"

echo "5. Creating Archive"
tar -czf "sovereign-bundle-$RELEASE_VERSION.tar.gz" "sovereign-bundle-$RELEASE_VERSION" "sovereign-bundle-$RELEASE_VERSION.sha256"

echo "Bundle created at build/sovereign-bundle-$RELEASE_VERSION.tar.gz"
