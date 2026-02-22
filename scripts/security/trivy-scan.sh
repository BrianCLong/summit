#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <target> <output-file>" >&2
  echo "Target can be an image name or fs:<path>" >&2
  exit 64
fi

TARGET="$1"
OUTPUT_PATH="$2"
OUTPUT_DIR="$(dirname "${OUTPUT_PATH}")"
OUTPUT_FILE="$(basename "${OUTPUT_PATH}")"
mkdir -p "${OUTPUT_DIR}"
ABS_OUTPUT_DIR="$(cd "${OUTPUT_DIR}" && pwd)"
: > "${ABS_OUTPUT_DIR}/${OUTPUT_FILE}"

TRIVY_IMAGE="aquasec/trivy:0.50.0"

echo "[trivy] Pulling scanner image ${TRIVY_IMAGE}..."
docker pull "${TRIVY_IMAGE}" >/dev/null

if [[ "$TARGET" == fs:* ]]; then
    SCAN_TYPE="fs"
    SCAN_TARGET="${TARGET#fs:}"
    # Mount current directory as /src
    REPO_ROOT="$(pwd)"

    docker run --rm \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v "${REPO_ROOT}:/src" \
      -v "${ABS_OUTPUT_DIR}:/workspace" \
      "${TRIVY_IMAGE}" \
      fs "/src/${SCAN_TARGET}" \
      --scanners vuln,
config \
      --format json \
      --output "/workspace/${OUTPUT_FILE}" \
      --severity CRITICAL,HIGH \
      --ignore-unfixed \
      --exit-code 0
else
    SCAN_TYPE="image"
    docker run --rm \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v "${ABS_OUTPUT_DIR}:/workspace" \
      "${TRIVY_IMAGE}" \
      image "$TARGET" \
      --scanners vuln \
      --format json \
      --output "/workspace/${OUTPUT_FILE}" \
      --severity CRITICAL,HIGH \
      --ignore-unfixed \
      --exit-code 0
fi

echo "[trivy] Scan complete. Report written to ${OUTPUT_PATH}."
