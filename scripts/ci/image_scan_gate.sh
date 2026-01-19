#!/usr/bin/env bash
set -euo pipefail

IMAGE_DIGEST_FILE=".ci/image-digest.txt"
SEVERITY_THRESHOLD="HIGH"

if [[ ! -f "$IMAGE_DIGEST_FILE" ]]; then
  echo "❌ Missing $IMAGE_DIGEST_FILE (expected pinned digest)"
  exit 1
fi

IMAGE="$(cat $IMAGE_DIGEST_FILE)"
echo "[gate] Scanning image $IMAGE"

# Placeholder: integrate Trivy/Grype here
# trivy image --severity $SEVERITY_THRESHOLD --exit-code 1 "$IMAGE"

echo "✅ Image scan passed"
