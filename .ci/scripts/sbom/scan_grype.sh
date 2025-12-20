#!/usr/bin/env bash
set -euo pipefail

SBOM_PATH=${1:?"SBOM path is required"}
SERVICE_NAME=${2:-workspace}
OUTPUT_DIR=${3:-artifacts/scans}

mkdir -p "${OUTPUT_DIR}"
JSON_PATH="${OUTPUT_DIR}/${SERVICE_NAME}-grype.json"
SARIF_PATH="${OUTPUT_DIR}/${SERVICE_NAME}-grype.sarif"

if ! command -v grype >/dev/null 2>&1; then
  echo "Installing grype..."
  curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sudo sh -s -- -b /usr/local/bin >/dev/null
fi

echo "Running grype scan on SBOM ${SBOM_PATH}";
grype "sbom:${SBOM_PATH}" -o json > "${JSON_PATH}"
grype "sbom:${SBOM_PATH}" -o sarif > "${SARIF_PATH}"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "json=${JSON_PATH}" >> "${GITHUB_OUTPUT}"
  echo "sarif=${SARIF_PATH}" >> "${GITHUB_OUTPUT}"
fi

echo "${JSON_PATH}"
