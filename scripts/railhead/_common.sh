#!/usr/bin/env bash

set -o pipefail

RAILHEAD_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAILHEAD_ROOT_DIR="$(cd "${RAILHEAD_SCRIPT_DIR}/../.." && pwd)"
RAILHEAD_ARTIFACT_ROOT="${RAILHEAD_ROOT_DIR}/artifacts/railhead"
RAILHEAD_LOG_ROOT="${RAILHEAD_ROOT_DIR}/logs/railhead"

mkdir -p "${RAILHEAD_ARTIFACT_ROOT}" "${RAILHEAD_LOG_ROOT}"

railhead::timestamp() {
  date -u +"%Y%m%dT%H%M%SZ"
}

railhead::resolve_path() {
  local base="$1"
  local target="$2"
  python3 - "$base" "$target" <<'PY'
import os
import sys
base, target = sys.argv[1:3]
print(os.path.relpath(os.path.realpath(target), os.path.realpath(base)))
PY
}

railhead::absolute_path() {
  local path="$1"
  python3 - "$path" <<'PY'
import os
import sys
print(os.path.realpath(sys.argv[1]))
PY
}

railhead::latest_run_dir() {
  local latest_path="${RAILHEAD_ARTIFACT_ROOT}/latest"
  if [[ -L "${latest_path}" || -d "${latest_path}" ]]; then
    railhead::absolute_path "${latest_path}"
    return 0
  fi

  local most_recent
  most_recent=$(find "${RAILHEAD_ARTIFACT_ROOT}" -maxdepth 1 -mindepth 1 -type d -printf '%f\n' 2>/dev/null | sort -r | head -n1)
  if [[ -n "${most_recent}" ]]; then
    railhead::absolute_path "${RAILHEAD_ARTIFACT_ROOT}/${most_recent}"
    return 0
  fi
  return 1
}

railhead::require_run_dir() {
  local run_dir
  if ! run_dir=$(railhead::latest_run_dir); then
    echo "No Railhead run found. Run bootstrap first." >&2
    exit 1
  fi
  echo "${run_dir}"
}

railhead::log_dir_for_run() {
  local run_dir="$1"
  local stamp
  stamp="$(basename "${run_dir}")"
  mkdir -p "${RAILHEAD_LOG_ROOT}/${stamp}"
  echo "${RAILHEAD_LOG_ROOT}/${stamp}"
}

railhead::log() {
  local log_file="$1"
  shift
  mkdir -p "$(dirname "${log_file}")"
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" | tee -a "${log_file}" >/dev/null
}

railhead::manifest_path() {
  local run_dir="$1"
  echo "${run_dir}/manifest.json"
}

railhead::add_to_manifest() {
  local run_dir="$1"
  local category="$2"
  local absolute_path="$3"
  local description="$4"
  local metadata="${5:-{}}"

  local manifest
  manifest="$(railhead::manifest_path "${run_dir}")"
  local rel
  rel=$(railhead::resolve_path "${RAILHEAD_ROOT_DIR}" "${absolute_path}")

  python3 "${RAILHEAD_SCRIPT_DIR}/update_manifest.py" add \
    --manifest "${manifest}" \
    --category "${category}" \
    --path "${rel}" \
    --description "${description}" \
    --metadata "${metadata}" >/dev/null
}
