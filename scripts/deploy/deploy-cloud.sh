#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT}/artifacts/deploy-cloud"
mkdir -p "${OUT_DIR}"

ENV_NAME="${DEPLOY_ENV:-dev}"
APPLY="${DEPLOY_APPLY:-false}"

TF_DIR="${ROOT}/iac/terraform"
ENV_VARS="${ROOT}/iac/env/${ENV_NAME}.tfvars"

ts_utc() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

write_atomic() {
  local f="$1"
  local c="$2"
  local tmp="${f}.tmp"
  printf "%s\n" "${c}" > "${tmp}"
  mv "${tmp}" "${f}"
}

DETAILS="${OUT_DIR}/details.txt"
REPORT="${OUT_DIR}/report.json"
STAMP="${OUT_DIR}/stamp.json"

echo "[deploy-cloud] start $(ts_utc) env=${ENV_NAME} apply=${APPLY}" | tee "${DETAILS}"

if [ ! -d "${TF_DIR}" ]; then
  echo "[deploy-cloud] ${TF_DIR} missing; skipping" | tee -a "${DETAILS}"
  write_atomic "${REPORT}" "$(cat <<JSON
{"ok":true,"skipped":true,"env":"${ENV_NAME}","apply":"${APPLY}","reason":"terraform_dir_missing"}
JSON
)"
  write_atomic "${STAMP}" "$(cat <<JSON
{"ok":true,"skipped":true,"env":"${ENV_NAME}","completed_at_utc":"$(ts_utc)"}
JSON
)"
  exit 0
fi

if [ ! -f "${ENV_VARS}" ]; then
  echo "[deploy-cloud] missing tfvars ${ENV_VARS}" | tee -a "${DETAILS}"
  write_atomic "${REPORT}" "$(cat <<JSON
{"ok":false,"skipped":false,"env":"${ENV_NAME}","apply":"${APPLY}","error":"missing_tfvars","tfvars":"iac/env/${ENV_NAME}.tfvars"}
JSON
)"
  write_atomic "${STAMP}" "$(cat <<JSON
{"ok":false,"skipped":false,"env":"${ENV_NAME}","completed_at_utc":"$(ts_utc)"}
JSON
)"
  exit 1
fi

cd "${TF_DIR}"

terraform init -input=false
terraform workspace select "${ENV_NAME}" >/dev/null 2>&1 || terraform workspace new "${ENV_NAME}" >/dev/null

echo "[deploy-cloud] running plan" | tee -a "${DETAILS}"
terraform plan -input=false -no-color -var-file="${ENV_VARS}" -out="${OUT_DIR}/tfplan" | tee -a "${DETAILS}"

if [ "${APPLY}" = "true" ]; then
  echo "[deploy-cloud] applying" | tee -a "${DETAILS}"
  terraform apply -input=false -no-color "${OUT_DIR}/tfplan" | tee -a "${DETAILS}"
fi

write_atomic "${REPORT}" "$(cat <<JSON
{"ok":true,"skipped":false,"env":"${ENV_NAME}","apply":"${APPLY}","note":"plan completed${APPLY/true/ + apply completed}"}
JSON
)"
write_atomic "${STAMP}" "$(cat <<JSON
{"ok":true,"skipped":false,"env":"${ENV_NAME}","completed_at_utc":"$(ts_utc)"}
JSON
)"
echo "[deploy-cloud] done" | tee -a "${DETAILS}"
