#!/bin/bash
set -euo pipefail

# Usage: GHCR_TOKEN=ghp_xxx ./preflight-image.sh ghcr.io/owner/repo:tag [--login-ghcr]

IMAGE_TO_CHECK="$1"
LOGIN_GHCR=""

if [[ "${2:-}" == "--login-ghcr" ]]; then
    LOGIN_GHCR="true"
fi

echo "--- Pre-flight Image Check for: ${IMAGE_TO_CHECK} ---"

# Handle GHCR login if requested
if [[ -n "${LOGIN_GHCR}" ]]; then
    if [[ -z "${GHCR_TOKEN:-}" ]]; then
        echo "Error: GHCR_TOKEN environment variable is required when using --login-ghcr"
        exit 1
    fi
    echo "Logging in to GitHub Container Registry..."
    echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GITHUB_USERNAME:-$(whoami)}" --password-stdin
fi

# Extract repository without tag/digest for pinning
IMAGE_REPO=$(echo "${IMAGE_TO_CHECK}" | sed 's/:[^@]*$//' | sed 's/@.*$//')

# 1. Check manifest and get digest
echo "Checking image manifest..."
MANIFEST_OUTPUT=$(docker manifest inspect "${IMAGE_TO_CHECK}" 2>&1)
if [ $? -ne 0 ]; then
    echo "Error: Could not inspect manifest for ${IMAGE_TO_CHECK}."
    echo "Output: ${MANIFEST_OUTPUT}"
    echo "Please ensure the image exists and you have appropriate Docker login/permissions."
    exit 1
fi

DIGEST=$(echo "${MANIFEST_OUTPUT}" | jq -r '.[0].Digest // .Digest')
if [ -z "${DIGEST}" ] || [ "${DIGEST}" == "null" ]; then
    echo "Error: Could not extract digest from manifest for ${IMAGE_TO_CHECK}."
    echo "Manifest Output: ${MANIFEST_OUTPUT}"
    exit 1
fi
echo "Image digest found: ${DIGEST}"

# 2. Verify pull access (using --dry-run if available, otherwise a small pull)
echo "Verifying pull access..."
if docker pull --dry-run "${IMAGE_TO_CHECK}" >/dev/null 2>&1; then
    echo "Pull access verified (dry-run successful)."
elif docker pull "${IMAGE_TO_CHECK}" --quiet --platform linux/amd64 >/dev/null 2>&1; then
    echo "Pull access verified (small pull successful)."
    docker rmi "${IMAGE_TO_CHECK}" >/dev/null 2>&1 || true # Clean up pulled image
else
    echo "Error: Failed to verify pull access for ${IMAGE_TO_CHECK}."
    echo "Please ensure your Docker environment is correctly configured for pulling this image (e.g., logged in to GHCR if private)."
    exit 1
fi

# 3. Verify Cosign signature if cosign is available
if command -v cosign >/dev/null 2>&1; then
    echo "Verifying Cosign signature..."
    PINNED_IMAGE="${IMAGE_REPO}@${DIGEST}"
    if cosign verify "${PINNED_IMAGE}" \
        --certificate-identity-regexp ".*" \
        --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
        >/dev/null 2>&1; then
        echo "✅ Cosign signature verified"
    else
        echo "⚠️  Cosign signature verification failed - proceeding but image may not be signed"
    fi
else
    echo "⚠️  Cosign not available - skipping signature verification"
fi

echo "--- Pre-flight Image Check PASSED ---"
echo "Pinned image: ${IMAGE_REPO}@${DIGEST}"
