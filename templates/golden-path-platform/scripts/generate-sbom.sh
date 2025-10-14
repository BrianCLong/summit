#!/usr/bin/env bash
set -euo pipefail

IMAGE_REFERENCE="$1"
OUTPUT_PATH="$2"

mkdir -p "$(dirname "$OUTPUT_PATH")"

if ! command -v syft >/dev/null 2>&1; then
  echo "syft is required to generate SBOMs" >&2
  exit 1
fi

syft packages "$IMAGE_REFERENCE" -o spdx-json > "$OUTPUT_PATH"
echo "SBOM written to $OUTPUT_PATH"
