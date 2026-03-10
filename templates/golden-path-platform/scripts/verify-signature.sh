#!/usr/bin/env bash
set -euo pipefail

IMAGE_REFERENCE="$1"
PUBLIC_KEY="${COSIGN_PUBLIC_KEY:-}" # optional - keyless verification uses Fulcio root

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign is required to verify signatures" >&2
  exit 1
fi

if [[ -n "$PUBLIC_KEY" ]]; then
  cosign verify --use-signed-timestamps --key "$PUBLIC_KEY" "$IMAGE_REFERENCE" || { echo "::error::Supply chain verification failed! Missing or invalid signed timestamps."; false; }
else
  cosign verify --use-signed-timestamps "$IMAGE_REFERENCE" || { echo "::error::Supply chain verification failed! Missing or invalid signed timestamps."; false; }
fi
