#!/usr/bin/env bash
set -euo pipefail

IMAGE_REFERENCE="$1"
SBOM_PATH="${2:-}"

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign is required to sign images" >&2
  exit 1
fi

COSIGN_EXPERIMENTAL=${COSIGN_EXPERIMENTAL:-1}

if [[ -n "$SBOM_PATH" && -f "$SBOM_PATH" ]]; then
  cosign attach sbom --sbom "$SBOM_PATH" "$IMAGE_REFERENCE"
fi

cosign sign "$IMAGE_REFERENCE"
