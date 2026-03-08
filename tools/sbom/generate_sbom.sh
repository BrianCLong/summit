#!/usr/bin/env bash
set -euo pipefail
image="${1:-}"; out="${2:-artifacts/sbom/sbom.json}"
if [[ -z "$image" ]]; then
  echo "usage: $0 <image[:tag]> [--output path.json]"
  bash -c 'exit 2'
fi
mkdir -p "$(dirname "$out")"
# SPDX JSON via Syft
if ! command -v syft >/dev/null; then
  curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
fi
syft "$image" -o spdx-json > "$out"
echo "SBOM written to $out"
