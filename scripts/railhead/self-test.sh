#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

LOG_DIR="${RAILHEAD_LOG_ROOT}/self-test"
LOG_FILE="${LOG_DIR}/self-test.log"
mkdir -p "${LOG_DIR}"
: >"${LOG_FILE}"

ok() {
  railhead::log "${LOG_FILE}" "✅ $*"
}

fail() {
  railhead::log "${LOG_FILE}" "❌ $*"
  echo "Self-test failed: $*" >&2
  exit 1
}

check_command() {
  local cmd="$1"
  if command -v "${cmd}" >/dev/null 2>&1; then
    ok "${cmd} available"
  else
    fail "${cmd} not found in PATH"
  fi
}

check_command git
check_command docker
check_command jq
check_command yq
check_command python3

railhead::log "${LOG_FILE}" "ℹ️  Detected workspace at ${RAILHEAD_ROOT_DIR}"
railhead::log "${LOG_FILE}" "ℹ️  Artifact root: ${RAILHEAD_ARTIFACT_ROOT}"
railhead::log "${LOG_FILE}" "ℹ️  Log root: ${RAILHEAD_LOG_ROOT}"

missing_vars=()
for var in GITHUB_TOKEN AWS_PROFILE AZURE_SUBSCRIPTION_ID GCP_PROJECT; do
  if [[ -z "${!var:-}" ]]; then
    missing_vars+=("${var}")
  fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  railhead::log "${LOG_FILE}" "⚠️  Optional credentials missing: ${missing_vars[*]}"
else
  railhead::log "${LOG_FILE}" "✅ Optional credentials detected"
fi

echo "Railhead self-test completed. See ${LOG_FILE}."
