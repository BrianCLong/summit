#!/usr/bin/env bash
set -euo pipefail

IMAGE_REF="${1:-}"
OUT_DIR="${2:-security-artifacts}"

if [[ -z "$IMAGE_REF" ]]; then
  echo "Usage: $0 <image-ref> [output-dir]" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

if ! command -v syft >/dev/null 2>&1; then
  echo "syft is required but not found on PATH" >&2
  exit 1
fi

SBOM_PATH="$OUT_DIR/sbom.cdx.json"
HASH_PATH="$SBOM_PATH.sha256"

syft "$IMAGE_REF" -o cyclonedx-json > "$SBOM_PATH"
sha256sum "$SBOM_PATH" > "$HASH_PATH"

echo "SBOM generated at $SBOM_PATH"
echo "Hash recorded at $HASH_PATH"
