#!/bin/bash
# Modern Artifact Signing & Attestation Script
# Uses Sigstore/Cosign for transparency and integrity

set -euo pipefail

echo "🔐 Starting Artifact Signing & Attestation Process..."

# Configuration
IMAGE_OR_BLOB=${1:-""}
SBOM_PATH=${2:-""}
TYPE=${3:-"image"} # image or blob
USE_KEYLESS=${USE_KEYLESS:-"true"}
COSIGN_PRIVATE_KEY=${COSIGN_PRIVATE_KEY:-""}
COSIGN_PUBLIC_KEY=${COSIGN_PUBLIC_KEY:-""}

if [ -z "$IMAGE_OR_BLOB" ]; then
  echo "❌ Error: No image or blob specified."
  echo "Usage: $0 <image-ref|blob-path> [sbom-path] [type: image|blob]"
  exit 1
fi

# Check for cosign
if ! command -v cosign &> /dev/null; then
  echo "❌ Error: cosign is not installed."
  exit 1
fi

# Determine signing mode
if [ "$USE_KEYLESS" = "true" ]; then
  echo "🌐 Using Keyless Signing (Sigstore/OIDC)..."
  SIGN_FLAGS="--yes"
else
  if [ -z "$COSIGN_PRIVATE_KEY" ]; then
    echo "❌ Error: COSIGN_PRIVATE_KEY is not set for key-based signing."
    exit 1
  fi
  echo "🔑 Using Key-based Signing..."
  SIGN_FLAGS="--key env://COSIGN_PRIVATE_KEY"
fi

# Signing
if [ "$TYPE" = "image" ]; then
  echo "📦 Signing container image: $IMAGE_OR_BLOB"
  cosign sign $SIGN_FLAGS "$IMAGE_OR_BLOB"

  if [ -n "$SBOM_PATH" ] && [ -f "$SBOM_PATH" ]; then
    echo "📋 Attaching SBOM as referrer: $SBOM_PATH"
    cosign attach sbom --sbom "$SBOM_PATH" "$IMAGE_OR_BLOB"

    echo "📜 Creating SBOM attestation..."
    cosign attest $SIGN_FLAGS --predicate "$SBOM_PATH" --type spdx "$IMAGE_OR_BLOB"
  fi

  echo "🔍 Verifying signature..."
  if [ "$USE_KEYLESS" = "true" ]; then
    # In production, you should constrain identity to your repo:
    # e.g., --certificate-identity https://github.com/BrianCLong/summit/.github/workflows/supply-chain-attest.yml@refs/heads/main
    cosign verify "$IMAGE_OR_BLOB" --certificate-identity-regexp ".*" --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
  else
    if [ -n "$COSIGN_PUBLIC_KEY" ]; then
      cosign verify --key "$COSIGN_PUBLIC_KEY" "$IMAGE_OR_BLOB"
    else
      echo "⚠️ Skipping verification: COSIGN_PUBLIC_KEY not provided."
    fi
  fi

elif [ "$TYPE" = "blob" ]; then
  echo "📄 Signing blob: $IMAGE_OR_BLOB"
  BUNDLE_PATH="${IMAGE_OR_BLOB}.bundle.json"
  cosign sign-blob $SIGN_FLAGS --bundle "$BUNDLE_PATH" "$IMAGE_OR_BLOB"

  echo "🔍 Verifying blob signature..."
  if [ "$USE_KEYLESS" = "true" ]; then
    cosign verify-blob --bundle "$BUNDLE_PATH" --certificate-identity-regexp ".*" --certificate-oidc-issuer "https://token.actions.githubusercontent.com" "$IMAGE_OR_BLOB"
  else
    if [ -n "$COSIGN_PUBLIC_KEY" ]; then
      cosign verify-blob --key "$COSIGN_PUBLIC_KEY" --bundle "$BUNDLE_PATH" "$IMAGE_OR_BLOB"
    else
      echo "⚠️ Skipping verification: COSIGN_PUBLIC_KEY not provided."
    fi
  fi
fi

echo "✅ Signing and Attestation Complete!"
