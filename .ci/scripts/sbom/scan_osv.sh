#!/usr/bin/env bash
set -euo pipefail

TARGET=${1:-.}
SERVICE_NAME=${2:-workspace}
OUTPUT_DIR=${3:-artifacts/scans}

mkdir -p "${OUTPUT_DIR}"
JSON_PATH="${OUTPUT_DIR}/${SERVICE_NAME}-osv.json"
SARIF_PATH="${OUTPUT_DIR}/${SERVICE_NAME}-osv.sarif"

if ! command -v osv-scanner >/dev/null 2>&1; then
  echo "Installing osv-scanner..."
  OSV_VERSION="v1.7.4"
  curl -sSfL "https://github.com/google/osv-scanner/releases/download/${OSV_VERSION}/osv-scanner_${OSV_VERSION#v}_linux_amd64" -o /tmp/osv-scanner
  sudo install /tmp/osv-scanner /usr/local/bin/osv-scanner
fi

echo "Running osv-scanner for ${TARGET}";
osv-scanner --format json --output "${JSON_PATH}" --recursive "${TARGET}" || true
osv-scanner --format sarif --output "${SARIF_PATH}" --recursive "${TARGET}" || true

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "json=${JSON_PATH}" >> "${GITHUB_OUTPUT}"
  echo "sarif=${SARIF_PATH}" >> "${GITHUB_OUTPUT}"
fi

echo "${JSON_PATH}"
