#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <manifest|sbom> <output_json> <output_sarif>" >&2
  exit 1
}

if [[ $# -lt 3 ]]; then
  usage
fi

TARGET="$1"
REPORT_JSON="$2"
REPORT_SARIF="$3"

mkdir -p "$(dirname "${REPORT_JSON}")" "$(dirname "${REPORT_SARIF}")"

if ! command -v osv-scanner >/dev/null 2>&1; then
  echo "osv-scanner is required but not installed" >&2
  exit 1
fi

echo "[scan] running osv-scanner for ${TARGET}" >&2
osv-scanner --format json --sbom "${TARGET}" > "${REPORT_JSON}"
osv-scanner --format sarif --sbom "${TARGET}" > "${REPORT_SARIF}"

echo "[scan] osv-scanner reports ready: ${REPORT_JSON}, ${REPORT_SARIF}" >&2
