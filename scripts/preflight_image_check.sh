#!/bin/bash
set -euo pipefail

IMAGE_TO_CHECK="$1"

echo "--- Pre-flight Image Check for: ${IMAGE_TO_CHECK} ---"

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
elif docker pull "${IMAGE_TO_CHECK}" --quiet --platform linux/amd64 >/dev/null 2>&1; then # Attempt a small pull if dry-run not supported or to be more thorough
    echo "Pull access verified (small pull successful)."
    docker rmi "${IMAGE_TO_CHECK}" >/dev/null 2>&1 || true # Clean up pulled image
else
    echo "Error: Failed to verify pull access for ${IMAGE_TO_CHECK}."
    echo "Please ensure your Docker environment is correctly configured for pulling this image (e.g., logged in to GHCR if private)."
    exit 1
fi

echo "--- Pre-flight Image Check PASSED ---"
echo "You can pin this image by digest: ${IMAGE_TO_CHECK}@${DIGEST}"
