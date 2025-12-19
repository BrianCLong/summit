#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <target> <output_prefix>" >&2
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

TARGET=$1
OUTPUT_PREFIX=$2

JSON_OUT="${OUTPUT_PREFIX}.json"
SARIF_OUT="${OUTPUT_PREFIX}.sarif"

if ! command -v grype >/dev/null 2>&1; then
  echo "grype is required on PATH" >&2
  exit 1
fi

echo "Scanning ${TARGET} with grype" >&2
grype "${TARGET}" -o json > "${JSON_OUT}"
grype "${TARGET}" -o sarif > "${SARIF_OUT}"

echo "Grype reports written to ${JSON_OUT} and ${SARIF_OUT}" >&2
