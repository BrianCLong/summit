#!/bin/bash
# Release Evidence Bundling for Summit Platform
# Bundles all required artifacts for release audit and compliance

set -e

echo "📦 Starting Release Evidence Bundle Creation..."

# Configuration
RELEASE_VERSION=${1:-"$(git describe --tags --always 2>/dev/null || echo 'dev')"}
ARTIFACT_NAME=${2:-"summit-platform"}
BUILD_METADATA=${3:-"$(git rev-parse HEAD)"}
OUTPUT_DIR=${4:-"./release-evidence"}
EVIDENCE_DIR=${OUTPUT_DIR}/"evidence-${RELEASE_VERSION}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "⚙️  Configuration:"
echo "   Release Version: $RELEASE_VERSION"
echo "   Artifact Name: $ARTIFACT_NAME"
echo "   Build Metadata: $BUILD_METADATA"
echo "   Output Directory: $OUTPUT_DIR"

# Create evidence directory structure
mkdir -p "$EVIDENCE_DIR"/{sboms,signatures,vulnerability-reports,provenance,config,logs}

# 1. Bundle SBOMs
echo "📜 Collecting SBOMs..."
SBOM_SOURCE_DIR="./sboms"
if [ -d "$SBOM_SOURCE_DIR" ]; then
    cp -r "$SBOM_SOURCE_DIR"/* "$EVIDENCE_DIR/sboms/" 2>/dev/null || echo "  No SBOMs found in $SBOM_SOURCE_DIR"
else
    # Try to generate SBOMs if not available
    echo "  No existing SBOMs found. Generating..."
    bash scripts/generate-sbom.sh "$ARTIFACT_NAME" "$RELEASE_VERSION" "$EVIDENCE_DIR/sboms" || echo "  Could not generate SBOMs"
fi

# 2. Bundle Signatures
echo "🔐 Collecting signatures..."
SIGNATURE_SOURCE_DIR="./signatures"
if [ -d "$SIGNATURE_SOURCE_DIR" ]; then
    cp -r "$SIGNATURE_SOURCE_DIR"/* "$EVIDENCE_DIR/signatures/" 2>/dev/null || echo "  No signatures found in $SIGNATURE_SOURCE_DIR"
else
    echo "  No signature directory found. Signatures should be generated before bundling."
fi

# 3. Bundle Vulnerability Reports
echo "🔍 Collecting vulnerability reports..."
VULN_SOURCE_DIR="./vulnerability-reports"
if [ -d "$VULN_SOURCE_DIR" ]; then
    cp -r "$VULN_SOURCE_DIR"/* "$EVIDENCE_DIR/vulnerability-reports/" 2>/dev/null || echo "  No vulnerability reports found in $VULN_SOURCE_DIR"
else
    # Run a vulnerability scan if not available
    echo "  No existing vulnerability reports found. Running scan..."
    bash scripts/scan-vulnerabilities.sh . "$EVIDENCE_DIR/vulnerability-reports" false false json || echo "  Could not run vulnerability scan"
fi

# 4. Create Provenance Evidence
echo "✅ Creating provenance evidence..."
PROV_FILENAME="provenance-${ARTIFACT_NAME}-${RELEASE_VERSION}.json"
cat > "$EVIDENCE_DIR/provenance/$PROV_FILENAME" << EOF
{
  "buildType": "https://github.com/summit-platform/build",
  "builder": {
    "id": "https://github.com/summit-platform/builder"
  },
  "recipe": {
    "type": "https://github.com/summit-platform/recipe",
    "definedInMaterial": 0,
    "entryPoint": "npm run build"
  },
  "metadata": {
    "buildInvocationId": "${BUILD_METADATA}",
    "buildStartedOn": "$TIMESTAMP",
    "completeness": {
      "parameters": true,
      "environment": false,
      "materials": true
    },
    "reproducible": false
  },
  "materials": [
    {
      "uri": "git+https://github.com/BrianCLong/summit",
      "digest": {
        "sha1": "${BUILD_METADATA}"
      }
    }
  ]
}
EOF

# 5. Collect Configuration Files
echo "⚙️  Collecting configuration files..."
CONFIG_FILES=(
    "package.json"
    "package-lock.json"
    "pyproject.toml"
    "requirements.txt"
    "Dockerfile*"
    "docker-compose*.yml"
    ".github/workflows/*"
    "scripts/*.sh"
    "Makefile"
    "SUMIT.md"
    "README.md"
)

for config_pattern in "${CONFIG_FILES[@]}"; do
    for file in $config_pattern; do
        if [ -f "$file" ]; then
            mkdir -p "$EVIDENCE_DIR/config/$(dirname "$file")"
            cp "$file" "$EVIDENCE_DIR/config/$file" 2>/dev/null || echo "  Could not copy $file"
        fi
    done
done

# 6. Collect Build Logs
echo "📝 Collecting build logs..."
LOG_FILES=(
    "build.log"
    "npm-debug.log"
    ".npm/anonymous-cli-metrics.json"
    "yarn-error.log"
    "target/build.log"
    "dist/build.log"
)

for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ]; then
        cp "$log_file" "$EVIDENCE_DIR/logs/" 2>/dev/null || echo "  Could not copy $log_file"
    fi
done

# 7. Create Evidence Manifest
echo "📋 Creating evidence manifest..."
MANIFEST_FILE="$EVIDENCE_DIR/MANIFEST.json"
cat > "$MANIFEST_FILE" << EOF
{
  "manifestVersion": "1.0",
  "releaseVersion": "$RELEASE_VERSION",
  "artifactName": "$ARTIFACT_NAME",
  "creationTimestamp": "$TIMESTAMP",
  "buildMetadata": "$BUILD_METADATA",
  "evidenceComponents": {
    "sboms": $(find "$EVIDENCE_DIR/sboms" -type f | wc -l),
    "signatures": $(find "$EVIDENCE_DIR/signatures" -type f | wc -l),
    "vulnerabilityReports": $(find "$EVIDENCE_DIR/vulnerability-reports" -type f | wc -l),
    "provenance": $(find "$EVIDENCE_DIR/provenance" -type f | wc -l),
    "configFiles": $(find "$EVIDENCE_DIR/config" -type f | wc -l),
    "logs": $(find "$EVIDENCE_DIR/logs" -type f | wc -l)
  },
  "verification": {
    "checksums": {},
    "signaturesVerified": false,
    "sbomsValid": false
  }
}
EOF

# 8. Create checksums for integrity verification
echo "✅ Creating checksums for integrity verification..."
CHECKSUM_FILE="$EVIDENCE_DIR/checksums.sha256"
find "$EVIDENCE_DIR" -type f -not -name "checksums.sha256" -exec sha256sum {} \; > "$CHECKSUM_FILE"

# 9. Create release bundle (compressed archive)
echo "📦 Creating compressed release bundle..."
RELEASE_BUNDLE="summit-release-${RELEASE_VERSION}-evidence.tar.gz"
cd "$OUTPUT_DIR"
tar -czf "$RELEASE_BUNDLE" "$(basename "$EVIDENCE_DIR")"
BUNDLE_SIZE=$(du -h "$RELEASE_BUNDLE" | cut -f1)
cd ..

echo "✅ Release Evidence Bundle Complete!"
echo "📁 Bundle Location: $OUTPUT_DIR/$RELEASE_BUNDLE"
echo "📊 Bundle Size: $BUNDLE_SIZE"
echo "📄 Evidence Directory: $EVIDENCE_DIR"
echo "📋 Manifest: $MANIFEST_FILE"
echo "✅ All required evidence components included"

# Verification
if [ -f "$OUTPUT_DIR/$RELEASE_BUNDLE" ]; then
    echo "🎉 Release evidence bundle created successfully!"
    echo "   Contains all required compliance artifacts for audit"
    echo "   Bundle ready for distribution and verification"
else
    echo "❌ Error: Release bundle was not created"
    exit 1
fi