#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <sbom_path> <output_prefix>" >&2
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

SBOM=$1
OUTPUT_PREFIX=$2

JSON_OUT="${OUTPUT_PREFIX}.json"
SARIF_OUT="${OUTPUT_PREFIX}.sarif"

if ! command -v osv-scanner >/dev/null 2>&1; then
  echo "osv-scanner is required on PATH" >&2
  exit 1
fi

echo "Scanning ${SBOM} with osv-scanner" >&2
osv-scanner --format json --sbom "${SBOM}" > "${JSON_OUT}"
osv-scanner --format sarif --sbom "${SBOM}" > "${SARIF_OUT}"

echo "OSV scanner reports written to ${JSON_OUT} and ${SARIF_OUT}" >&2
