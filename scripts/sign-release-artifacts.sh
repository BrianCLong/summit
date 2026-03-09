#!/bin/bash
# scripts/sign-release-artifacts.sh
# Signs all release artifacts for GA release

set -e

echo "🔐 Starting Release Artifact Signing Process..."

# Configuration
ARTIFACT_DIR=${1:-"./release-artifacts"}
OUTPUT_DIR=${2:-"./signed-artifacts"} 
SIGNATURE_DIR=${3:-"$OUTPUT_DIR/signatures"}
REGISTRY=${4:-"ghcr.io/brianclong"}
REPO_NAME=${5:-"summit-platform"}
TAG_NAME=${6:-$(cat ./GA_TAG_OUTPUT 2>/dev/null || echo "latest")}
USE_COSIGN=${7:-true}
USE_SIGSTORE=${8:-true}

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "⚙️  Configuration:"
echo "   Artifact Directory: $ARTIFACT_DIR"
echo "   Output Directory: $OUTPUT_DIR"
echo "   Signature Directory: $SIGNATURE_DIR"
echo "   Registry: $REGISTRY"
echo "   Repository: $REPO_NAME"
echo "   Tag: $TAG_NAME"

# Create output directories
mkdir -p "$OUTPUT_DIR" "$SIGNATURE_DIR"

# Validate required tools
if [ "$USE_COSIGN" = true ]; then
    if ! command -v cosign &> /dev/null; then
        echo "⚠️  cosign not found. Installing cosign..."
        if command -v brew &> /dev/null; then
            brew install cosign
        elif command -v apt-get &> /dev/null; then
            # Ubuntu/Debian installation
            wget -q -O - https://packages.sigstore.dev/cosign/gpg.key | gpg --dearmor | sudo tee /usr/share/keyrings/cosign-archive-keyring.gpg > /dev/null
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/cosign-archive-keyring.gpg] https://packages.sigstore.dev/cosign/deb/ stable main" | sudo tee /etc/apt/sources.list.d/cosign.list > /dev/null
            sudo apt-get update && sudo apt-get install cosign
        else
            echo "❌ cosign is required but cannot be automatically installed"
            echo "   Install from: https://docs.sigstore.dev/cosign/installation"
            exit 1
        fi
    fi
fi

# Sign container image if it exists
IMAGE_EXISTS=false
if command -v docker &> /dev/null && [ -n "$TAG_NAME" ]; then
    IMAGE_NAME="$REGISTRY/$REPO_NAME:$TAG_NAME"
    
    # Check if image exists locally
    if docker images "$REGISTRY/$REPO_NAME" | grep -q "$TAG_NAME"; then
        IMAGE_EXISTS=true
        echo "📦 Signing container image: $IMAGE_NAME"
        
        if [ "$USE_COSIGN" = true ]; then
            # Sign the container image
            if [ -n "$COSIGN_PWD" ]; then
                # Use password from environment
                cosign sign --key env://COSIGN_PWD "$IMAGE_NAME"
            else
                # Use keyless signing if no key provided
                echo "🔐 Using keyless signing with Fulcio and Rekor..."
                cosign sign --yes "$IMAGE_NAME"
            fi
            
            # Verify the signature
            echo "🔍 Verifying signature for: $IMAGE_NAME"
            if [ -n "$COSIGN_PWD" ]; then
                cosign verify --key env://COSIGN_PWD "$IMAGE_NAME" | grep -q "verified" || {
                    echo "❌ Signature verification failed for $IMAGE_NAME"
                    exit 1
                }
            else
                cosign verify "$IMAGE_NAME" | grep -q "verified" || {
                    echo "❌ Signature verification failed for $IMAGE_NAME"
                    exit 1
                }
            fi
            
            echo "✅ Container image signed and verified: $IMAGE_NAME"
        else
            echo "⚠️  Cosign signing disabled"
        fi
    else
        echo "📋 Container image not found locally: $IMAGE_NAME"
        echo "   This is expected if building image separately"
    fi
else
    echo "⚠️  Docker not found or TAG_NAME not provided - skipping container signing"
fi

# Sign artifacts in the artifact directory
SIGNATURE_COUNT=0

if [ -d "$ARTIFACT_DIR" ]; then
    echo "📄 Signing binary artifacts in: $ARTIFACT_DIR"
    
    # Find all binary/artifact files
    find "$ARTIFACT_DIR" -type f \( -executable -o -name "*.tar.gz" -o -name "*.zip" -o -name "*.exe" -o -name "*.deb" -o -name "*.rpm" -o -name "*.jar" -o -name "*.war" -o -name "*.aar" -o -name "*.apk" -o -name "*.ipa" \) | while read -r artifact; do
        artifact_name=$(basename "$artifact")
        signature_file="$SIGNATURE_DIR/${artifact_name}.sig"
        cert_file="$SIGNATURE_DIR/${artifact_name}.crt"
        
        echo "   Signing: $artifact_name"
        
        if [ "$USE_COSIGN" = true ]; then
            # Sign the artifact using cosign
            if [ -n "$COSIGN_PWD" ]; then
                cosign sign-blob --key env://COSIGN_PWD --output-signature "$signature_file" --output-certificate "$cert_file" "$artifact"
            else
                # Keyless signing
                cosign sign-blob --output-signature "$signature_file" --output-certificate "$cert_file" --yes "$artifact"
            fi
            
            # Verify the signature
            if [ -n "$COSIGN_PWD" ]; then
                cosign verify-blob --key env://COSIGN_PWD --signature "$signature_file" --certificate "$cert_file" "$artifact"
            else
                cosign verify-blob --signature "$signature_file" --certificate "$cert_file" --yes "$artifact"
            fi
            
            SIGNATURE_COUNT=$((SIGNATURE_COUNT + 1))
            echo "      ✅ Signed: $artifact_name"
        else
            echo "      ⚠️  Signing tool not available for: $artifact_name"
        fi
    done
else
    echo "⚠️  Artifact directory does not exist: $ARTIFACT_DIR"
fi

# Sign SBOM files if they exist
SBOM_DIR="./sboms"
if [ -d "$SBOM_DIR" ]; then
    echo "📜 Signing SBOM files..."
    find "$SBOM_DIR" -name "*.json" -o -name "*.cdx.json" -o -name "*.spdx.json" | while read -r sbom_file; do
        sbom_name=$(basename "$sbom_file")
        signature_file="$SIGNATURE_DIR/sbom-${sbom_name}.sig"
        
        echo "   Signing SBOM: $sbom_name"
        
        if [ "$USE_COSIGN" = true ]; then
            if [ -n "$COSIGN_PWD" ]; then
                cosign sign-blob --key env://COSIGN_PWD --output-signature "$signature_file" --output-certificate "$SIGNATURE_DIR/sbom-${sbom_name}.crt" "$sbom_file"
            else
                cosign sign-blob --output-signature "$signature_file" --output-certificate "$SIGNATURE_DIR/sbom-${sbom_name}.crt" --yes "$sbom_file"
            fi
            
            SIGNATURE_COUNT=$((SIGNATURE_COUNT + 1))
            echo "      ✅ Signed SBOM: $sbom_name"
        fi
    done
fi

# Create signing report
REPORT_FILE="$OUTPUT_DIR/signing-report-$TIMESTAMP.json"
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "artifactDirectory": "$ARTIFACT_DIR",
  "outputDirectory": "$OUTPUT_DIR",
  "signatureDirectory": "$SIGNATURE_DIR",
  "registry": "$REGISTRY",
  "repository": "$REPO_NAME",
  "tag": "$TAG_NAME",
  "imageExists": $IMAGE_EXISTS,
  "signaturesCreated": $SIGNATURE_COUNT,
  "cosignUsed": $USE_COSIGN,
  "sigstoreUsed": $USE_SIGSTORE,
  "environment": {
    "cosignAvailable": $(command -v cosign >/dev/null 2>&1 && echo "true" || echo "false"),
    "dockerAvailable": $(command -v docker >/dev/null 2>&1 && echo "true" || echo "false")
  },
  "signedArtifacts": []
}
EOF

# List signed artifacts in the report
if [ $SIGNATURE_COUNT -gt 0 ]; then
    SIGNED_FILES=$(find "$SIGNATURE_DIR" -name "*.sig" -exec basename {} \; | sed 's/\.sig$//' | jq -R . | jq -s .)
    jq --argjson files "$SIGNED_FILES" '.signedArtifacts = $files' "$REPORT_FILE" > "$REPORT_FILE.tmp" && mv "$REPORT_FILE.tmp" "$REPORT_FILE"
fi

echo "📊 Signing report: $REPORT_FILE"

# Verification summary
echo ""
echo "📋 SIGNING SUMMARY:"
echo "   Container Image Signed: $IMAGE_EXISTS"
echo "   Binary Artifacts Signed: $SIGNATURE_COUNT"
echo "   SBOM Files Signed: $(find $SBOM_DIR -name "*.json" 2>/dev/null | wc -l || echo 0) (if present)"
echo "   Total Signatures Created: $SIGNATURE_COUNT"
echo ""

if [ $SIGNATURE_COUNT -gt 0 ] || [ "$IMAGE_EXISTS" = true ]; then
    echo "✅ Artifact signing completed successfully!"
    echo "   Output directory: $OUTPUT_DIR"
    echo "   Signatures stored in: $SIGNATURE_DIR"
else
    echo "⚠️  No artifacts were signed"
    echo "   Check that artifacts exist in: $ARTIFACT_DIR"
fi

echo ""
echo "🔒 Remember to verify signatures before release:"
echo "   cosign verify --certificate-identity-regexp='.*' --certificate-oidc-issuer-regexp='.*' $REGISTRY/$REPO_NAME:$TAG_NAME"