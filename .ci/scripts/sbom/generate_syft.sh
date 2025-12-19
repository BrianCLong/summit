#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <source> <service_name> <sha> [output_dir]" >&2
  exit 1
}

if [[ $# -lt 3 ]]; then
  usage
fi

SOURCE=$1
SERVICE_NAME=$2
COMMIT_SHA=$3
OUTPUT_DIR=${4:-artifacts/sbom}

mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/${SERVICE_NAME}-${COMMIT_SHA}.spdx.json"

if ! command -v syft >/dev/null 2>&1; then
  echo "syft is required on PATH" >&2
  exit 1
fi

echo "Generating SBOM for ${SOURCE} -> ${OUTPUT_FILE}" >&2
syft "${SOURCE}" -o spdx-json --file "${OUTPUT_FILE}"

echo "SBOM written to ${OUTPUT_FILE}"
