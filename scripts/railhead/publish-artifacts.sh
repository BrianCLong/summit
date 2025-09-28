#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

usage() {
  cat <<USAGE
Usage: $0 --dest <s3://bucket/path> [--compress]

Packages the latest Railhead artifact bundle and optionally pushes to S3.
USAGE
}

DEST=""
COMPRESS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dest)
      DEST="$2"
      shift 2
      ;;
    --compress)
      COMPRESS=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${DEST}" ]]; then
  echo "--dest is required" >&2
  usage
  exit 1
fi

RUN_DIR="$(railhead::require_run_dir)"
LOG_DIR="$(railhead::log_dir_for_run "${RUN_DIR}")"
LOG_FILE="${LOG_DIR}/publish.log"

BUNDLE_PATH="${RUN_DIR}.tar.gz"
if ${COMPRESS}; then
  tar -czf "${BUNDLE_PATH}" -C "${RUN_DIR}/.." "$(basename "${RUN_DIR}")"
  railhead::log "${LOG_FILE}" "Created bundle ${BUNDLE_PATH}"
else
  BUNDLE_PATH="${RUN_DIR}"
fi

if command -v aws >/dev/null 2>&1; then
  if [[ ${COMPRESS} == true ]]; then
    aws s3 cp "${BUNDLE_PATH}" "${DEST}"
  else
    aws s3 sync "${RUN_DIR}" "${DEST}"
  fi
  railhead::log "${LOG_FILE}" "Published artifacts to ${DEST}"
else
  railhead::log "${LOG_FILE}" "aws CLI not available; copy ${BUNDLE_PATH} to ${DEST} manually"
fi

railhead::log "${LOG_FILE}" "Publish step complete"
