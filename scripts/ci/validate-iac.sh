#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT}/artifacts/iac-validate"
mkdir -p "${OUT_DIR}"

STAMP="${OUT_DIR}/stamp.json"
REPORT="${OUT_DIR}/report.json"
DETAILS="${OUT_DIR}/details.txt"

IAC_DIR="${ROOT}/iac"
TF_DIR="${ROOT}/iac/terraform"

ts_utc() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

write_json() {
  # args: file, json
  local f="$1"
  local j="$2"
  tmp="${f}.tmp"
  printf "%s\n" "${j}" > "${tmp}"
  mv "${tmp}" "${f}"
}

echo "[iac-validate] start $(ts_utc)" | tee "${DETAILS}"

if [ ! -d "${IAC_DIR}" ]; then
  echo "[iac-validate] iac/ not present; skipping" | tee -a "${DETAILS}"
  write_json "${REPORT}" '{"iac_present":false,"terraform_present":false,"fmt":"skipped","validate":"skipped","semantic":"skipped","drift":"skipped"}'
  write_json "${STAMP}" '{"ok":true,"skipped":true,"reason":"iac_dir_missing"}'
  exit 0
fi

TERRAFORM_PRESENT=false
if [ -d "${TF_DIR}" ]; then
  TERRAFORM_PRESENT=true
fi

FMT_STATUS="skipped"
VALIDATE_STATUS="skipped"
SEMANTIC_STATUS="started"
DRIFT_STATUS="started"
OK=true

# Semantic validation always runs if iac/ exists
node "${ROOT}/scripts/iac/validate-schema.mjs" \
  --iac-dir "${IAC_DIR}" \
  --out "${OUT_DIR}/semantic.json" \
  2>>"${DETAILS}" || { OK=false; SEMANTIC_STATUS="failed"; }

if [ "${SEMANTIC_STATUS}" = "started" ]; then
  SEMANTIC_STATUS="passed"
fi

# Drift detection (deterministic) – looks for env tfvars parity and module presence
bash "${ROOT}/scripts/iac/drift-detect.sh" \
  --iac-dir "${IAC_DIR}" \
  --out "${OUT_DIR}/drift.json" \
  2>>"${DETAILS}" || { OK=false; DRIFT_STATUS="failed"; }

if [ "${DRIFT_STATUS}" = "started" ]; then
  DRIFT_STATUS="passed"
fi

if [ "${TERRAFORM_PRESENT}" = "true" ]; then
  echo "[iac-validate] terraform fmt/validate in ${TF_DIR}" | tee -a "${DETAILS}"
  (
    cd "${TF_DIR}"
    terraform fmt -check -recursive
  ) && FMT_STATUS="passed" || { OK=false; FMT_STATUS="failed"; }

  (
    cd "${TF_DIR}"
    terraform init -backend=false -input=false >/dev/null
    terraform validate -no-color
  ) && VALIDATE_STATUS="passed" || { OK=false; VALIDATE_STATUS="failed"; }
else
  echo "[iac-validate] iac/terraform not present; terraform checks skipped" | tee -a "${DETAILS}"
fi

# Deterministic report (no timestamps inside report.json)
write_json "${REPORT}" "$(cat <<JSON
{
  "iac_present": true,
  "terraform_present": ${TERRAFORM_PRESENT},
  "fmt": "${FMT_STATUS}",
  "validate": "${VALIDATE_STATUS}",
  "semantic": "${SEMANTIC_STATUS}",
  "drift": "${DRIFT_STATUS}"
}
JSON
)"

# Stamp is allowed to contain time, sha, runner info (audit, not determinism-critical)
SHA="${GITHUB_SHA:-unknown}"
RUN_ID="${GITHUB_RUN_ID:-unknown}"
write_json "${STAMP}" "$(cat <<JSON
{
  "ok": ${OK},
  "skipped": false,
  "sha": "${SHA}",
  "run_id": "${RUN_ID}",
  "completed_at_utc": "$(ts_utc)"
}
JSON
)"

echo "[iac-validate] done ok=${OK}" | tee -a "${DETAILS}"
if [ "${OK}" != "true" ]; then
  exit 1
fi
