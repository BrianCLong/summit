#!/bin/bash
# CI Gate: Sigstore Toolchain Version Enforcement
# Enforces minimum cosign/rekor versions and emits evidence artifacts.

set -euo pipefail

MIN_COSIGN_VERSION="3.0.2"
MIN_REKOR_VERSION="1.5.0"

START_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
UTC_ID=$(date -u +"%Y%m%dT%H%M%SZ")
GIT_SHA=$(git rev-parse --short=12 HEAD 2>/dev/null || echo "unknown")
PIPELINE_ID=${CI_PIPELINE_ID:-${GITHUB_RUN_ID:-local}}
EVIDENCE_ID="EV-${GIT_SHA}-${PIPELINE_ID}-${UTC_ID}"
REPORT_DIR="evidence/${EVIDENCE_ID}"

STATUS="pass"
FAIL_REASON=""
COSIGN_VERSION=""
REKOR_VERSION=""
REKOR_SOURCE=""

mkdir -p "$REPORT_DIR"

normalize_version() {
  echo "$1" | sed -E 's/^v//' | awk -F+ '{print $1}'
}

version_ge() {
  local version_a
  local version_b
  version_a=$(normalize_version "$1")
  version_b=$(normalize_version "$2")
  if [[ -z "$version_a" || -z "$version_b" ]]; then
    return 1
  fi
  [[ "$(printf '%s\n' "$version_b" "$version_a" | sort -V | head -n1)" == "$version_b" ]]
}

extract_version() {
  echo "$1" | grep -Eo 'v?[0-9]+\.[0-9]+\.[0-9]+' | head -n1
}

check_cosign() {
  if ! command -v cosign >/dev/null 2>&1; then
    STATUS="fail"
    FAIL_REASON="cosign_missing"
    return
  fi
  local output
  output=$(cosign version 2>/dev/null || true)
  COSIGN_VERSION=$(extract_version "$output")
  if ! version_ge "$COSIGN_VERSION" "$MIN_COSIGN_VERSION"; then
    STATUS="fail"
    FAIL_REASON="cosign_version_too_old"
  fi
}

check_rekor() {
  if command -v rekor-cli >/dev/null 2>&1; then
    REKOR_SOURCE="rekor-cli"
    REKOR_VERSION=$(extract_version "$(rekor-cli version 2>/dev/null || true)")
  elif [[ -n "${REKOR_URL:-}" ]] && command -v curl >/dev/null 2>&1; then
    REKOR_SOURCE="rekor-url"
    if command -v python3 >/dev/null 2>&1; then
      REKOR_VERSION=$(curl -s "${REKOR_URL%/}/api/v1/version" | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('gitVersion',''))" 2>/dev/null)
    else
      REKOR_VERSION=$(extract_version "$(curl -s "${REKOR_URL%/}/api/v1/version" | tr -d '\n')")
    fi
  else
    STATUS="fail"
    FAIL_REASON="rekor_version_unavailable"
    return
  fi

  if ! version_ge "$REKOR_VERSION" "$MIN_REKOR_VERSION"; then
    STATUS="fail"
    FAIL_REASON="rekor_version_too_old"
  fi
}

check_cosign
check_rekor

END_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

SCRIPT_PATH=$(readlink -f "$0" 2>/dev/null || echo "$0")
POLICY_HASH=""
if command -v sha256sum >/dev/null 2>&1; then
  POLICY_HASH=$(sha256sum "$SCRIPT_PATH" | awk '{print $1}')
fi

cat > "${REPORT_DIR}/report.json" <<EOF
{
  "evidence_id": "${EVIDENCE_ID}",
  "status": "${STATUS}",
  "failure_reason": "${FAIL_REASON}",
  "minimum_versions": {
    "cosign": "v${MIN_COSIGN_VERSION}",
    "rekor": "v${MIN_REKOR_VERSION}"
  },
  "observed_versions": {
    "cosign": "${COSIGN_VERSION}",
    "rekor": "${REKOR_VERSION}"
  },
  "rekor_source": "${REKOR_SOURCE}",
  "started_at": "${START_TS}",
  "completed_at": "${END_TS}"
}
EOF

cat > "${REPORT_DIR}/metrics.json" <<EOF
{
  "evidence_id": "${EVIDENCE_ID}",
  "started_at": "${START_TS}",
  "completed_at": "${END_TS}",
  "pipeline_id": "${PIPELINE_ID}"
}
EOF

cat > "${REPORT_DIR}/stamp.json" <<EOF
{
  "evidence_id": "${EVIDENCE_ID}",
  "git_sha": "${GIT_SHA}",
  "pipeline_id": "${PIPELINE_ID}",
  "utc": "${UTC_ID}",
  "policy_hash": "${POLICY_HASH}"
}
EOF

if [[ "$STATUS" == "pass" ]]; then
  echo "✅ Sigstore version gate passed. Evidence: ${REPORT_DIR}"
  exit 0
fi

echo "❌ Sigstore version gate failed (${FAIL_REASON}). Evidence: ${REPORT_DIR}"
exit 1
