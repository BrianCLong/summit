#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

usage() {
  cat <<USAGE
Usage: $0 --org <org> --cadence <daily|weekly|monthly>

Generates a GitHub workflow dispatch schedule for recurring Railhead runs.
USAGE
}

ORG=""
CADENCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org)
      ORG="$2"
      shift 2
      ;;
    --cadence)
      CADENCE="$2"
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

if [[ -z "${ORG}" || -z "${CADENCE}" ]]; then
  echo "--org and --cadence are required" >&2
  usage
  exit 1
fi

case "${CADENCE}" in
  daily)
    CRON="0 6 * * *"
    ;;
  weekly)
    CRON="0 7 * * 1"
    ;;
  monthly)
    CRON="0 8 1 * *"
    ;;
  *)
    echo "Unsupported cadence: ${CADENCE}" >&2
    exit 1
    ;;
esac

RUN_DIR="$(railhead::require_run_dir)"
LOG_DIR="$(railhead::log_dir_for_run "${RUN_DIR}")"
LOG_FILE="${LOG_DIR}/scheduler.log"
CI_DIR="${RUN_DIR}/ci"
mkdir -p "${CI_DIR}"

WORKFLOW_FILE="${CI_DIR}/railhead-recurring.yml"
cat <<WORKFLOW > "${WORKFLOW_FILE}"
name: Railhead Recurring

on:
  schedule:
    - cron: "${CRON}"
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Kick Railhead Pack
        uses: peter-evans/workflow-dispatch@v2
        with:
          token: \${{ secrets.RAILHEAD_TOKEN }}
          repository: ${ORG}/\${{ github.event.inputs.repository || github.repository }}
          workflow: railhead-gates.yml
WORKFLOW

railhead::add_to_manifest "${RUN_DIR}" "ci" "${WORKFLOW_FILE}" "Recurring schedule workflow"
railhead::log "${LOG_FILE}" "Generated recurring schedule (${CADENCE})"
