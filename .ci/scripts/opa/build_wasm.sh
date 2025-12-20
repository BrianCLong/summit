#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-policy}
OUTPUT=${2:-dist/opa/policy-bundle.tar.gz}
ENTRYPOINT=${ENTRYPOINT:-policy/authz/abac/decision}

echo "[opa] building wasm bundle from ${ROOT_DIR} -> ${OUTPUT} (entrypoint=${ENTRYPOINT})"
mkdir -p "$(dirname "$OUTPUT")"
opa build -t wasm -e "${ENTRYPOINT}" -o "${OUTPUT}" "${ROOT_DIR}"/authz "${ROOT_DIR}"/common "${ROOT_DIR}"/data
