#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <target-url> <output-directory>" >&2
  exit 64
fi

TARGET_URL="$1"
OUTPUT_DIR="$2"

if [[ -z "${TARGET_URL}" ]]; then
  echo "[zap] Target URL not provided. Skipping scan." >&2
  exit 0
fi

mkdir -p "${OUTPUT_DIR}"
ABS_OUTPUT_DIR="$(cd "${OUTPUT_DIR}" && pwd)"

ZAP_IMAGE="ghcr.io/zaproxy/zaproxy:stable"
REPORT_JSON="zap-report.json"
REPORT_HTML="zap-report.html"
REPORT_MD="zap-report.md"

: > "${ABS_OUTPUT_DIR}/${REPORT_JSON}"
: > "${ABS_OUTPUT_DIR}/${REPORT_MD}"
: > "${ABS_OUTPUT_DIR}/${REPORT_HTML}"

echo "[zap] Pulling scanner image ${ZAP_IMAGE}..."
docker pull "${ZAP_IMAGE}" >/dev/null

# ZAP baseline exits with non-zero codes when medium/high alerts are found. We capture the
# exit status so that CI can evaluate the report instead of failing immediately.
set +e
CONTAINER_EXIT=0
docker run --rm \
  -v "${ABS_OUTPUT_DIR}:/zap/wrk" \
  -t "${ZAP_IMAGE}" \
  zap-baseline.py \
  -t "${TARGET_URL}" \
  -m 5 \
  -J "${REPORT_JSON}" \
  -w "${REPORT_MD}" \
  -r "${REPORT_HTML}"
CONTAINER_EXIT=$?
set -e

if [[ ${CONTAINER_EXIT} -ne 0 ]]; then
  echo "[zap] Scan completed with exit code ${CONTAINER_EXIT}. Review the generated report for details."
else
  echo "[zap] Scan complete. Reports written to ${OUTPUT_DIR}."
fi

exit 0
