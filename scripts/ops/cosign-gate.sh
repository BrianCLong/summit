#!/bin/bash
set -euo pipefail

# scripts/ops/cosign-gate.sh
# CD gate that enforces Cosign signature verification before rollout

IMAGE_WITH_DIGEST="$1"

echo "🔒 Enforcing Cosign signature verification for: ${IMAGE_WITH_DIGEST}"

# Check if cosign is available
if ! command -v cosign >/dev/null 2>&1; then
    echo "❌ ERROR: cosign is required but not installed"
    echo "Install cosign: https://docs.sigstore.dev/cosign/installation/"
    exit 1
fi

# Strict verification - must pass for deployment to continue
echo "Verifying image signature..."
if cosign verify "${IMAGE_WITH_DIGEST}" \
    --certificate-identity-regexp ".*@.*" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    --output text; then
    echo "✅ Cosign signature verification PASSED"
    echo "Image is signed and can proceed to deployment"
    exit 0
else
    echo "❌ ERROR: Cosign signature verification FAILED"
    echo "This image cannot be deployed without a valid signature"
    echo "Ensure the image was built and signed through the official CI/CD pipeline"
    exit 1
fi