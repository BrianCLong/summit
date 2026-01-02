#!/bin/bash
# Artifact Signing Script for Summit Platform
# Uses cosign to sign all build artifacts

set -e

echo "🔐 Starting Artifact Signing Process..."

# Configuration
IMAGE_NAME=${1:-"summit-platform"}
IMAGE_TAG=${2:-"$(git describe --tags --always)"}
REGISTRY=${3:-"ghcr.io/brianclong"}
KEY_PATH=${4:-"${HOME}/.cosign/summit-key.key"}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Validate required tools
if ! command -v cosign &> /dev/null; then
    echo "❌ cosign is required but not installed."
    echo "Please install cosign from https://github.com/sigstore/cosign"
    exit 1
fi

# Sign container image
echo "📦 Signing container image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

if [ -n "$COSIGN_PWD" ]; then
    # Use password from environment if available
    echo "🔐 Using environment-provided password for signing key"
    cosign sign --key env://COSIGN_PWD "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
elif [ -f "$KEY_PATH" ]; then
    # Use local key file
    echo "🔐 Using local signing key: $KEY_PATH"
    cosign sign --key "$KEY_PATH" "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    # Use keyless signing with fulcio
    echo "🔐 Using keyless signing with Fulcio and Rekor"
    cosign sign --yes "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
fi

# Sign additional artifacts in dist directory if they exist
if [ -d "dist" ]; then
    echo "📦 Signing additional artifacts in dist/ directory..."
    for artifact in dist/*; do
        if [ -f "$artifact" ]; then
            artifact_name=$(basename "$artifact")
            echo "  - Signing $artifact_name..."
            
            # Create signature file for the artifact
            if [ -n "$COSIGN_PWD" ]; then
                cosign sign-blob --key env://COSIGN_PWD --output-signature "dist/${artifact_name}.sig" "$artifact"
            elif [ -f "$KEY_PATH" ]; then
                cosign sign-blob --key "$KEY_PATH" --output-signature "dist/${artifact_name}.sig" "$artifact"
            else
                cosign sign-blob --output-signature "dist/${artifact_name}.sig" --yes "$artifact"
            fi
        fi
    done
fi

# Verify signatures were created
echo "🔍 Verifying signatures..."

# Verify container image signature
if [ -n "$COSIGN_PWD" ]; then
    cosign verify --key env://COSIGN_PWD "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" || {
        echo "❌ Container image verification failed"
        exit 1
    }
elif [ -f "$KEY_PATH" ]; then
    cosign verify --key "$KEY_PATH" "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" || {
        echo "❌ Container image verification failed"
        exit 1
    }
else
    cosign verify "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" || {
        echo "❌ Container image verification failed"
        exit 1
    }
fi

# Verify additional artifact signatures if they exist
if [ -d "dist" ]; then
    for sig_file in dist/*.sig; do
        if [ -f "$sig_file" ]; then
            artifact_name=$(basename "$sig_file" .sig)
            if [ -f "dist/$artifact_name" ]; then
                echo "  - Verifying signature for $artifact_name..."
                
                if [ -n "$COSIGN_PWD" ]; then
                    cosign verify-blob --key env://COSIGN_PWD --signature "$sig_file" "dist/$artifact_name" || {
                        echo "❌ Artifact $artifact_name verification failed"
                        exit 1
                    }
                elif [ -f "$KEY_PATH" ]; then
                    cosign verify-blob --key "$KEY_PATH" --signature "$sig_file" "dist/$artifact_name" || {
                        echo "❌ Artifact $artifact_name verification failed"
                        exit 1
                    }
                else
                    cosign verify-blob --signature "$sig_file" "dist/$artifact_name" --certificate-identity-regexp=".*" --certificate-oidc-issuer-regexp=".*" || {
                        echo "❌ Artifact $artifact_name verification failed (keyless)"
                        exit 1
                    }
                fi
            fi
        fi
    done
fi

echo "✅ Artifact Signing Complete!"
echo "   Image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
echo "   Timestamp: $TIMESTAMP"
echo "   All artifacts have been signed and verified."