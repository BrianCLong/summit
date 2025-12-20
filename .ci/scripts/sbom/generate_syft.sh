#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <source> <output>" >&2
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

SOURCE_PATH="$1"
OUTPUT_PATH="$2"

mkdir -p "$(dirname "${OUTPUT_PATH}")"

if ! command -v syft >/dev/null 2>&1; then
  echo "syft is required but not installed" >&2
  exit 1
fi

echo "[sbom] generating SPDX JSON for ${SOURCE_PATH} -> ${OUTPUT_PATH}" >&2
syft "${SOURCE_PATH}" -o spdx-json="${OUTPUT_PATH}" --source-name "${SOURCE_PATH}" --select-catalogers "package" --platform linux/amd64

echo "[sbom] completed: ${OUTPUT_PATH}" >&2
