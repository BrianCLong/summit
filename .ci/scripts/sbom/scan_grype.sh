#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <target> <report_json> <report_sarif>" >&2
  exit 1
}

if [[ $# -lt 3 ]]; then
  usage
fi

TARGET="$1"
REPORT_JSON="$2"
REPORT_SARIF="$3"

mkdir -p "$(dirname "${REPORT_JSON}")" "$(dirname "${REPORT_SARIF}")"

if ! command -v grype >/dev/null 2>&1; then
  echo "grype is required but not installed" >&2
  exit 1
fi

echo "[scan] running grype on ${TARGET}" >&2
grype "${TARGET}" -o json > "${REPORT_JSON}"
grype "${TARGET}" -o sarif > "${REPORT_SARIF}"

echo "[scan] grype reports ready: ${REPORT_JSON}, ${REPORT_SARIF}" >&2
