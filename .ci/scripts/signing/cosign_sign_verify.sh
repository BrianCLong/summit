#!/usr/bin/env bash
set -euo pipefail

ARTIFACT=${1:?"Artifact path required"}
OUTPUT_DIR=${2:-artifacts/signatures}
ATTESTATION=${3:-}
COSIGN_BIN=${COSIGN_BIN:-cosign}

mkdir -p "${OUTPUT_DIR}"
SIG_PATH="${OUTPUT_DIR}/$(basename "${ARTIFACT}").sig"
LOG_PATH="${OUTPUT_DIR}/$(basename "${ARTIFACT}").cosign.log"

export COSIGN_EXPERIMENTAL=${COSIGN_EXPERIMENTAL:-1}

if ! command -v "${COSIGN_BIN}" >/dev/null 2>&1; then
  echo "Installing cosign..."
  curl -sSfL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 -o /tmp/cosign
  sudo install /tmp/cosign /usr/local/bin/cosign
fi

echo "Signing ${ARTIFACT} with cosign"
"${COSIGN_BIN}" sign-blob --yes "${ARTIFACT}" --output-signature "${SIG_PATH}" 2>&1 | tee "${LOG_PATH}"
"${COSIGN_BIN}" verify-blob --signature "${SIG_PATH}" "${ARTIFACT}"

ATTEST_SIG=""
if [ -n "${ATTESTATION}" ] && [ -f "${ATTESTATION}" ]; then
  ATTEST_SIG="${OUTPUT_DIR}/$(basename "${ATTESTATION}").sig"
  echo "Signing attestation ${ATTESTATION}"
  "${COSIGN_BIN}" sign-blob --yes "${ATTESTATION}" --output-signature "${ATTEST_SIG}" 2>&1 | tee -a "${LOG_PATH}"
  "${COSIGN_BIN}" verify-blob --signature "${ATTEST_SIG}" "${ATTESTATION}"
fi

TLOG_INDEX=$(grep -oE 'tlog entry created with index: [0-9]+' "${LOG_PATH}" | awk '{print $NF}' | tail -n 1)

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "signature=${SIG_PATH}" >> "${GITHUB_OUTPUT}"
  echo "attestation_signature=${ATTEST_SIG}" >> "${GITHUB_OUTPUT}"
  echo "tlog_index=${TLOG_INDEX}" >> "${GITHUB_OUTPUT}"
  echo "log=${LOG_PATH}" >> "${GITHUB_OUTPUT}"
fi

echo "${SIG_PATH}"
