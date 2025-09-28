#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

usage() {
  cat <<USAGE
Usage: $0 [--repos] [--ci] [--env] [--observability]

Generates inventory artifacts for the current Railhead run.
USAGE
}

RUN_REPOS=false
RUN_CI=false
RUN_ENV=false
RUN_OBS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repos)
      RUN_REPOS=true
      shift
      ;;
    --ci)
      RUN_CI=true
      shift
      ;;
    --env)
      RUN_ENV=true
      shift
      ;;
    --observability)
      RUN_OBS=true
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

if ! $RUN_REPOS && ! $RUN_CI && ! $RUN_ENV && ! $RUN_OBS; then
  RUN_REPOS=true
  RUN_CI=true
  RUN_ENV=true
  RUN_OBS=true
fi

RUN_DIR="$(railhead::require_run_dir)"
LOG_DIR="$(railhead::log_dir_for_run "${RUN_DIR}")"
LOG_FILE="${LOG_DIR}/discovery.log"

DISCOVERY_DIR="${RUN_DIR}/discovery"
mkdir -p "${DISCOVERY_DIR}/observability"

railhead::log "${LOG_FILE}" "Starting discovery sweep in ${RUN_DIR}" 

if $RUN_REPOS; then
  GIT_ROOT="${RAILHEAD_ROOT_DIR}"
  REPO_NAME="$(basename "${GIT_ROOT}")"
  DEFAULT_BRANCH="$(git -C "${GIT_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
  LAST_COMMIT="$(git -C "${GIT_ROOT}" log -1 --format=%cI 2>/dev/null || echo unknown)"

  cat <<CSV > "${DISCOVERY_DIR}/repos.csv"
repository,default_branch,last_commit
${REPO_NAME},${DEFAULT_BRANCH},${LAST_COMMIT}
CSV
  railhead::add_to_manifest "${RUN_DIR}" "discovery" "${DISCOVERY_DIR}/repos.csv" "Repository inventory"
  railhead::log "${LOG_FILE}" "Generated repository inventory"
fi

if $RUN_CI; then
  RAILHEAD_ROOT="${RAILHEAD_ROOT_DIR}" DISCOVERY_OUT="${DISCOVERY_DIR}" python3 - <<'PY'
import hashlib
import json
import os
from pathlib import Path

root = Path(os.environ["RAILHEAD_ROOT"])
workflow_dir = root / '.github' / 'workflows'
workflows = []
if workflow_dir.exists():
    for path in sorted(workflow_dir.glob('*.yml')) + sorted(workflow_dir.glob('*.yaml')):
        data = path.read_bytes()
        workflows.append({
            'file': str(path.relative_to(root)),
            'size_bytes': len(data),
            'sha1': hashlib.sha1(data).hexdigest(),
        })

dest = Path(os.environ["DISCOVERY_OUT"]) / 'ci-workflows.json'
dest.write_text(json.dumps({'workflows': workflows}, indent=2) + '\n', encoding='utf-8')
PY
  railhead::add_to_manifest "${RUN_DIR}" "discovery" "${DISCOVERY_DIR}/ci-workflows.json" "CI workflow summary"
  railhead::log "${LOG_FILE}" "Documented CI workflows"
fi

if $RUN_ENV; then
  RAILHEAD_ROOT="${RAILHEAD_ROOT_DIR}" DISCOVERY_OUT="${DISCOVERY_DIR}" python3 - <<'PY'
import json
import os
from pathlib import Path

root = Path(os.environ["RAILHEAD_ROOT"])
terraform_root = root / 'terraform'
environments = []
if terraform_root.exists():
    for path in terraform_root.glob('**/main.tf'):
        env_name = path.parent.name
        environments.append({
            'name': env_name,
            'path': str(path.parent.relative_to(root)),
        })

dest = Path(os.environ["DISCOVERY_OUT"]) / 'environment-map.json'
dest.write_text(json.dumps({'environments': environments}, indent=2) + '\n', encoding='utf-8')
PY
  railhead::add_to_manifest "${RUN_DIR}" "discovery" "${DISCOVERY_DIR}/environment-map.json" "Infrastructure environment map"
  railhead::log "${LOG_FILE}" "Captured environment topology"
fi

if $RUN_OBS; then
  if [[ -f "${RUN_DIR}/config/inputs.yaml" && $(command -v yq) ]]; then
    yq -o=json '{prometheus: .observability.prometheus_endpoint // null, grafana: .observability.grafana_endpoint // null}' \
      "${RUN_DIR}/config/inputs.yaml" > "${DISCOVERY_DIR}/observability/endpoints.json"
  else
    cat <<JSON > "${DISCOVERY_DIR}/observability/endpoints.json"
{"prometheus": null, "grafana": null}
JSON
  fi
  railhead::add_to_manifest "${RUN_DIR}" "discovery" "${DISCOVERY_DIR}/observability/endpoints.json" "Observability endpoints"
  railhead::log "${LOG_FILE}" "Recorded observability inputs"
fi

railhead::log "${LOG_FILE}" "Discovery sweep finished"
