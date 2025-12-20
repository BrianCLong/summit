#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME=${1:-workspace}
TARGET=${2:-.}
OUTPUT_DIR=${SBOM_DIR:-artifacts/sbom}
SHA=${GITHUB_SHA:-$(git rev-parse --short HEAD)}
OUTPUT_PATH="${OUTPUT_DIR}/${SERVICE_NAME}-${SHA}.spdx.json"

mkdir -p "${OUTPUT_DIR}"

if ! command -v syft >/dev/null 2>&1; then
  echo "Installing syft..."
  curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sudo sh -s -- -b /usr/local/bin >/dev/null
fi

echo "Generating SPDX SBOM for ${TARGET} -> ${OUTPUT_PATH}"
syft "${TARGET}" -o spdx-json > "${OUTPUT_PATH}"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "sbom_path=${OUTPUT_PATH}" >> "${GITHUB_OUTPUT}"
fi

echo "${OUTPUT_PATH}"
