#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <image-name> <output-file>" >&2
  exit 64
fi

IMAGE_NAME="$1"
OUTPUT_PATH="$2"
OUTPUT_DIR="$(dirname "${OUTPUT_PATH}")"
OUTPUT_FILE="$(basename "${OUTPUT_PATH}")"
mkdir -p "${OUTPUT_DIR}"
ABS_OUTPUT_DIR="$(cd "${OUTPUT_DIR}" && pwd)"
: > "${ABS_OUTPUT_DIR}/${OUTPUT_FILE}"

TRIVY_IMAGE="aquasec/trivy:0.50.0"

echo "[trivy] Pulling scanner image ${TRIVY_IMAGE}..."
docker pull "${TRIVY_IMAGE}" >/dev/null

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "${ABS_OUTPUT_DIR}:/workspace" \
  "${TRIVY_IMAGE}" \
  image "${IMAGE_NAME}" \
  --scanners vuln \
  --format json \
  --output "/workspace/${OUTPUT_FILE}" \
  --severity CRITICAL,HIGH \
  --ignore-unfixed \
  --exit-code 0

echo "[trivy] Scan complete. Report written to ${OUTPUT_PATH}."
