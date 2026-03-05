#!/bin/bash
# SBOM Generation Script for Summit Platform
# Generates SBOMs for all artifacts and stores alongside binaries

set -e

echo "🚀 Starting SBOM Generation Process..."

# Configuration
ARTIFACT_NAME=${1:-"summit-platform"}
VERSION=${2:-$(git describe --tags --always)}
OUTPUT_DIR=${3:-"./sboms"}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# SBOM Standards (Modern defaults)
CYCLONEDX_VERSION=${CYCLONEDX_VERSION:-"1.7"}
SPDX_VERSION=${SPDX_VERSION:-"3.0.1"}

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Generate SBOM for container images
if [ -f "Dockerfile" ] || [ -f "Dockerfile.*" ]; then
  echo "📦 Generating SBOMs for container images..."
  
  # Build and scan container image using syft
  if command -v syft &> /dev/null; then
    # For each Dockerfile, generate SBOM
    for dockerfile in Dockerfile*; do
      if [ -f "$dockerfile" ]; then
        service_name=$(basename "$dockerfile" | sed 's/Dockerfile//g' | sed 's/^\.//')
        if [ -z "$service_name" ]; then
          service_name="main"
        fi
        
        echo "  - Processing $service_name from $dockerfile..."
        
        # Generate CycloneDX format (Targeting $CYCLONEDX_VERSION)
        # Note: syft uses -o cyclonedx-json. Explicit versioning might require additional flags or tool-specific config.
        syft scan dir:. -o "cyclonedx-json@$CYCLONEDX_VERSION="$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.cdx.json" 2>/dev/null || \
        syft scan dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.cdx.json"
        
        # Generate SPDX format (Targeting $SPDX_VERSION)
        syft scan dir:. -o "spdx-json@$SPDX_VERSION="$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.spdx.json" 2>/dev/null || \
        syft scan dir:. -o spdx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.spdx.json"
        
        # Generate syft table format for human consumption
        syft scan dir:. -o table="$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.syft.txt"
      fi
    done
  else
    echo "⚠️  syft not found. Skipping container SBOM generation."
  fi
fi

# Generate SBOM for npm packages
if [ -f "package.json" ]; then
  echo "📦 Generating SBOM for npm packages..."
  
  # Generate CycloneDX from package-lock.json if it exists
  if [ -f "package-lock.json" ]; then
    if command -v cyclonedx-npm &> /dev/null; then
      cyclonedx-npm --output-file "$OUTPUT_DIR/${ARTIFACT_NAME}-npm-${VERSION}.cdx.json" --output-format JSON
    else
      echo "⚠️  cyclonedx-npm not found. Install it to generate npm SBOM."
    fi
  fi
  
  # Alternative: Use syft for npm
  if command -v syft &> /dev/null; then
    syft scan dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-npm-${VERSION}-alt.cdx.json"
  fi
fi

# Generate SBOM for Python packages
if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
  echo "🐍 Generating SBOM for Python packages..."
  
  if command -v syft &> /dev/null; then
    syft scan dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-python-${VERSION}.cdx.json"
  fi
  
  # If cdx-vex-gen is available, enhance with vulnerability info
  if command -v grype &> /dev/null; then
    grype dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-python-vulns-${VERSION}.cdx.json"
  fi
fi

# Generate SBOM for Maven/Gradle projects
if [ -f "pom.xml" ] || [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
  echo "☕ Generating SBOM for Java packages..."
  
  if command -v syft &> /dev/null; then
    syft scan dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-java-${VERSION}.cdx.json"
  fi
fi

# Create summary file
# We use a temporary file to hold the array items, so we don't accidentally
# modify the summary file while reading from the directory.
# Ensure output dir exists first
mkdir -p "$OUTPUT_DIR"
# Replace slashes in VERSION just in case it's a branch name or file path
SAFE_VERSION=$(echo "$VERSION" | tr '/' '-')
SUMMARY_FILE="$OUTPUT_DIR/SBOM_SUMMARY-${SAFE_VERSION}.json"
TEMP_FILE="$OUTPUT_DIR/temp_sbom_items.txt"

> "$TEMP_FILE"
for sbom in "$OUTPUT_DIR"/*.json; do
  if [ -f "$sbom" ] && [ "$sbom" != "$SUMMARY_FILE" ]; then
    sbom_name=$(basename "$sbom")
    echo "    {\"name\": \"$sbom_name\", \"type\": \"$(echo "$sbom_name" | cut -d'-' -f2 | cut -d'.' -f1)\"}," >> "$TEMP_FILE"
  fi
done

# Remove trailing comma from temp file
sed -i '$ s/,$//' "$TEMP_FILE" 2>/dev/null || true

cat > "$SUMMARY_FILE" << EOF
{
  "artifactName": "$ARTIFACT_NAME",
  "version": "$VERSION",
  "timestamp": "$TIMESTAMP",
  "generatedSboms": [
EOF

cat "$TEMP_FILE" >> "$SUMMARY_FILE"

cat >> "$SUMMARY_FILE" << EOF
  ],
  "totalSboms": $(ls "$OUTPUT_DIR"/*.json 2>/dev/null | grep -v "$SUMMARY_FILE" | grep -c "cdx\|spdx" || echo 0)
}
EOF

rm -f "$TEMP_FILE"

echo "✅ SBOM Generation Complete!"
echo "📁 Generated SBOMs stored in: $OUTPUT_DIR"
echo "📋 Summary available at: $SUMMARY_FILE"

# Verification
if [ -d "$OUTPUT_DIR" ] && [ "$(ls -1q "$OUTPUT_DIR"/*.json | wc -l)" -gt 0 ]; then
  echo "🎉 SBOM generation successful!"
  ls -la "$OUTPUT_DIR"/*.json
else
  echo "❌ Error: No SBOMs were generated"
  exit 1
fi