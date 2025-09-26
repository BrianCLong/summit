#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
TARGETS=(
  "${ROOT_DIR}/deploy/helm/intelgraph"
  "${ROOT_DIR}/ops/security/vault"
)

if ! command -v trivy >/dev/null 2>&1; then
  echo "trivy is not installed. Install via https://aquasecurity.github.io/trivy/v0.50/getting-started/" >&2
  exit 1
fi

for target in "${TARGETS[@]}"; do
  echo "\n🔍 scanning ${target}" >&2
  trivy config --misconfig-scanners kubernetes --severity HIGH,CRITICAL "${target}"
done
