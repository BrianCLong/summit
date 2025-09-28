#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

usage() {
  cat <<USAGE
Usage: $0 [--org <org>] [--apply-gates <gate-file>] [--dry-run]

Prepares the Railhead GitHub Actions workflow bundle for distribution.
USAGE
}

ORG=""
GATE_FILE=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org)
      ORG="$2"
      shift 2
      ;;
    --apply-gates)
      GATE_FILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
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

RUN_DIR="$(railhead::require_run_dir)"
LOG_DIR="$(railhead::log_dir_for_run "${RUN_DIR}")"
LOG_FILE="${LOG_DIR}/ci-install.log"
CI_DIR="${RUN_DIR}/ci"
mkdir -p "${CI_DIR}"

railhead::log "${LOG_FILE}" "Preparing CI workflow bundle"

WORKFLOW_TEMPLATE="${RAILHEAD_ROOT_DIR}/templates/railhead-ci-workflow.yaml"
WORKFLOW_DEST="${CI_DIR}/railhead-gates.yml"

if [[ ! -f "${WORKFLOW_TEMPLATE}" ]]; then
  echo "Workflow template missing at ${WORKFLOW_TEMPLATE}" >&2
  exit 1
fi

cp "${WORKFLOW_TEMPLATE}" "${WORKFLOW_DEST}"
railhead::add_to_manifest "${RUN_DIR}" "ci" "${WORKFLOW_DEST}" "Railhead GitHub Actions workflow"

if [[ -n "${GATE_FILE}" ]]; then
  if [[ ! -f "${GATE_FILE}" ]]; then
    echo "Gate file not found: ${GATE_FILE}" >&2
    exit 1
  fi
  cp "${GATE_FILE}" "${CI_DIR}/gate-minimums.yaml"
  railhead::add_to_manifest "${RUN_DIR}" "ci" "${CI_DIR}/gate-minimums.yaml" "Gate threshold configuration"
fi

if [[ -n "${ORG}" ]]; then
  TARGET="${ORG}"
else
  TARGET="local checkout"
fi

if [[ -n "${GATE_FILE}" ]]; then
  GATE_SUMMARY="$(railhead::resolve_path "${RAILHEAD_ROOT_DIR}" "${CI_DIR}/gate-minimums.yaml")"
else
  GATE_SUMMARY="not provided"
fi

PLAN_FILE="${CI_DIR}/distribution-plan.md"
cat <<PLAN > "${PLAN_FILE}"
# Railhead CI Workflow Distribution Plan

- Target organisation: ${TARGET}
- Workflow file: $(railhead::resolve_path "${RAILHEAD_ROOT_DIR}" "${WORKFLOW_DEST}")
- Gate minimums: ${GATE_SUMMARY}
- Dry run: ${DRY_RUN}

Use
  gh workflow list --repo <repo>
to confirm deployment targets before applying.
PLAN
railhead::add_to_manifest "${RUN_DIR}" "ci" "${PLAN_FILE}" "CI distribution summary"

railhead::log "${LOG_FILE}" "Workflow bundle assembled"

if ! ${DRY_RUN}; then
  if command -v gh >/dev/null 2>&1 && [[ -n "${ORG}" ]]; then
    railhead::log "${LOG_FILE}" "gh CLI detected; use gh workflow import to push to repositories"
  else
    railhead::log "${LOG_FILE}" "Dry run disabled but gh CLI or org missing; manual distribution required"
  fi
else
  railhead::log "${LOG_FILE}" "Dry run requested; no remote changes applied"
fi
