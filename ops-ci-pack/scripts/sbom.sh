#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p artifacts
if ! command -v syft >/dev/null; then
  echo "syft not installed; skipping"; exit 0
fi
syft packages dir:. -o spdx-json > artifacts/sbom.spdx.json
echo "SBOM at artifacts/sbom.spdx.json"
