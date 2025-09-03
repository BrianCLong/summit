#!/usr/bin/env bash
# preflight-image.sh — verify an image ref exists, can be pulled, and print the immutable digest to pin
# Usage: ./preflight-image.sh ghcr.io/OWNER/REPO:TAG   [--login-ghcr]
#        ./preflight-image.sh ghcr.io/OWNER/REPO@sha256:DEADBEEF   [--login-ghcr]

set -euo pipefail

if [[ "${1:-}" == "" ]]; then
  echo "Usage: $0 <image-ref> [--login-ghcr]"
  exit 2
fi

IMAGE_REF="$1"
LOGIN_GHCR="${2:-}"

# Optional login for GHCR if you need to pull private images
if [[ "$LOGIN_GHCR" == "--login-ghcr" ]]; then
  : "${GHCR_TOKEN:?Set GHCR_TOKEN=github_pat_xxx or GH_TOKEN to login to GHCR}"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin 1>/dev/null
fi

echo "==> Checking manifest exists for: $IMAGE_REF"
if command -v skopeo >/dev/null 2>&1; then
  # skopeo works for both tags and digests
  skopeo inspect --raw "docker://$IMAGE_REF" 1>/dev/null
else
  # Fallback: docker manifest inspect supports tags and digests
  docker manifest inspect "$IMAGE_REF" 1>/dev/null
fi
echo "✔ Manifest found"

echo "==> Pulling image (to confirm accessibility)"
docker pull "$IMAGE_REF" 1>/dev/null
echo "✔ Pull succeeded"

echo "==> Resolving and printing image digest for pinning"
# docker inspect gives RepoDigests only when locally available; pick first
DIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE_REF" | awk -F'@' '{print $2}')"
if [[ -z "$DIGEST" ]]; then
  echo "Could not resolve digest from docker inspect; trying crane if available..." >&2
  if command -v crane >/dev/null 2>&1; then
    # crane digest returns sha256:... for both tag and digest refs
    DIGEST="$(crane digest "$IMAGE_REF")"
  fi
fi

if [[ -z "$DIGEST" ]]; then
  echo "ERROR: Unable to resolve digest automatically." >&2
  exit 1
fi

PINNED="${IMAGE_REF%%@*}"
PINNED="${PINNED%%:*}"
PINNED="$PINNED@$DIGEST"

echo "==> Pinned reference:"
echo "$PINNED"
