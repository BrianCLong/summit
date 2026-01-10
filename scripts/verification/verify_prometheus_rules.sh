#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PROMTOOL_VERSION="2.54.1"
PROMTOOL_IMAGE="prom/prometheus:v${PROMTOOL_VERSION}"
PROMTOOL_ARCHIVE_URL="https://github.com/prometheus/prometheus/releases/download/v${PROMTOOL_VERSION}/prometheus-${PROMTOOL_VERSION}.linux-amd64.tar.gz"
PROMTOOL_TMPDIR=""
PROMTOOL_CMD=()
RULE_FILES=(
  "monitoring/alert_rules.yml"
  "monitoring/alerts.yaml"
  "monitoring/alerts-production.yml"
  "monitoring/alerts-federal.yaml"
  "monitoring/summit-alerts.yml"
  "monitoring/canary-budget-alerts.yml"
  "monitoring/alerts/production-alerts.yaml"
  "monitoring/alerts/maestro-rules.yaml"
  "monitoring/prometheus/alerts-conductor.yml"
  "monitoring/prometheus/burn-alerts.rules.yml"
  "monitoring/prometheus/error-budget-rules.yml"
  "monitoring/prometheus/maestro-alerts.yaml"
  "monitoring/rules/slo_rules.yml"
)

function fail() {
  echo "[verify_prometheus_rules] $1" >&2
  exit 1
}

function ensure_files_exist() {
  for relative in "${RULE_FILES[@]}"; do
    if [[ ! -f "$ROOT_DIR/$relative" ]]; then
      fail "Expected rule file '$relative' was not found."
    fi
  done
}

function cleanup() {
  if [[ -n "${PROMTOOL_TMPDIR}" && -d "${PROMTOOL_TMPDIR}" ]]; then
    rm -rf "${PROMTOOL_TMPDIR}"
  fi
}

function select_promtool() {
  if command -v promtool >/dev/null 2>&1; then
    PROMTOOL_CMD=("promtool")
  elif command -v docker >/dev/null 2>&1; then
    PROMTOOL_CMD=(
      "docker" "run" "--rm"
      "-v" "${ROOT_DIR}:/workspace"
      "-w" "/workspace"
      "${PROMTOOL_IMAGE}"
      "promtool"
    )
  elif command -v podman >/dev/null 2>&1; then
    PROMTOOL_CMD=(
      "podman" "run" "--rm"
      "-v" "${ROOT_DIR}:/workspace"
      "-w" "/workspace"
      "${PROMTOOL_IMAGE}"
      "promtool"
    )
  elif command -v curl >/dev/null 2>&1; then
    PROMTOOL_TMPDIR=$(mktemp -d)
    echo "[verify_prometheus_rules] Downloading promtool ${PROMTOOL_VERSION} to ${PROMTOOL_TMPDIR}" >&2
    curl -sSL "${PROMTOOL_ARCHIVE_URL}" -o "${PROMTOOL_TMPDIR}/promtool.tar.gz" || fail "Unable to download promtool from ${PROMTOOL_ARCHIVE_URL}"
    tar -xzf "${PROMTOOL_TMPDIR}/promtool.tar.gz" -C "${PROMTOOL_TMPDIR}" || fail "Failed to extract promtool archive"
    local promtool_path="${PROMTOOL_TMPDIR}/prometheus-${PROMTOOL_VERSION}.linux-amd64/promtool"
    if [[ ! -x "$promtool_path" ]]; then
      fail "Downloaded promtool binary not found at ${promtool_path}"
    fi
    PROMTOOL_CMD=("${promtool_path}")
  else
    fail "promtool is not installed and docker is unavailable; cannot validate Prometheus rules."
  fi
}

function validate_rule_file() {
  local file="$1"

  echo "[verify_prometheus_rules] Checking ${file}"
  set +e
  "${PROMTOOL_CMD[@]}" check rules "${file}"
  local status=$?
  set -e

  if [[ $status -ne 0 ]]; then
    fail "promtool reported errors for ${file}. See output above for details."
  fi
}

ensure_files_exist
select_promtool
trap cleanup EXIT

for relative in "${RULE_FILES[@]}"; do
  validate_rule_file "$relative"
done

echo "[verify_prometheus_rules] All Prometheus rule files passed validation."
