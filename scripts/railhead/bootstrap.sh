#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

usage() {
  cat <<USAGE
Usage: $0 --config <path-to-inputs.yaml>

Initialises a Railhead run by preparing artifact and log directories.
USAGE
}

CONFIG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
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

if [[ -z "${CONFIG}" ]]; then
  echo "--config is required" >&2
  usage
  exit 1
fi

if [[ ! -f "${CONFIG}" ]]; then
  echo "Config file not found: ${CONFIG}" >&2
  exit 1
fi

RUN_ID="$(railhead::timestamp)"
RUN_DIR="${RAILHEAD_ARTIFACT_ROOT}/${RUN_ID}"
LOG_DIR="${RAILHEAD_LOG_ROOT}/${RUN_ID}"

mkdir -p "${RUN_DIR}/"{config,discovery,security,governance,evidence-index,ci}
mkdir -p "${LOG_DIR}"

cp "${CONFIG}" "${RUN_DIR}/config/inputs.yaml"
if command -v yq >/dev/null 2>&1; then
  yq -o=json '.' "${CONFIG}" > "${RUN_DIR}/config/inputs.json"
fi

cat <<CSV > "${RUN_DIR}/evidence-index/index.csv"
artifact,path,owner,status
CSV

railhead::add_to_manifest "${RUN_DIR}" "evidence" "${RUN_DIR}/evidence-index/index.csv" "Evidence index placeholder"

ln -sfn "${RUN_DIR}" "${RAILHEAD_ARTIFACT_ROOT}/latest"
ln -sfn "${LOG_DIR}" "${RAILHEAD_LOG_ROOT}/latest"

python3 "${SCRIPT_DIR}/update_manifest.py" init \
  --manifest "${RUN_DIR}/manifest.json" \
  --run-id "${RUN_ID}" \
  --config "$(railhead::resolve_path "${RAILHEAD_ROOT_DIR}" "${RUN_DIR}/config/inputs.yaml")"

LOG_FILE="${LOG_DIR}/bootstrap.log"
railhead::log "${LOG_FILE}" "Bootstrap complete for run ${RUN_ID}."
railhead::log "${LOG_FILE}" "Config copied to ${RUN_DIR}/config/inputs.yaml"

cat <<SUMMARY
Railhead bootstrap ready.
Run ID: ${RUN_ID}
Artifacts: ${RUN_DIR}
Logs: ${LOG_DIR}
SUMMARY
