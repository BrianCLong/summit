#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPA_VERSION="${OPA_VERSION:-0.67.1}"
OPA_BIN_DEFAULT="${ROOT_DIR}/bin/opa"

if command -v opa >/dev/null 2>&1; then
  OPA_BIN="$(command -v opa)"
elif [ -x "${OPA_BIN_DEFAULT}" ]; then
  OPA_BIN="${OPA_BIN_DEFAULT}"
else
  mkdir -p "$(dirname "${OPA_BIN_DEFAULT}")"
  curl -sL "https://openpolicyagent.org/downloads/v${OPA_VERSION}/opa_linux_amd64_static" -o "${OPA_BIN_DEFAULT}"
  chmod +x "${OPA_BIN_DEFAULT}"
  OPA_BIN="${OPA_BIN_DEFAULT}"
fi

cd "${ROOT_DIR}"
"${OPA_BIN}" test "${ROOT_DIR}/abac" "${ROOT_DIR}/simulation" "${ROOT_DIR}/tests/abac_test.rego" "${ROOT_DIR}/tests/simulation_test.rego" -v
