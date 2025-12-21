#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPA_BIN="${OPA_BIN:-$ROOT/bin/opa}"
OPA_VERSION="${OPA_VERSION:-v0.63.0}"
OPA_URL="${OPA_URL:-https://openpolicyagent.org/downloads/${OPA_VERSION}/opa_linux_amd64_static}"

mkdir -p "$(dirname "$OPA_BIN")"

if [ ! -x "$OPA_BIN" ]; then
  echo "Downloading opa binary (${OPA_VERSION})..."
  curl -sSL -o "$OPA_BIN" "$OPA_URL"
  chmod +x "$OPA_BIN"
fi

cd "$ROOT"
"$OPA_BIN" test -v policy/abac policy/tests/abac_test.rego policy/simulation
"$OPA_BIN" test -v policy/revops -d policy/revops/tests/fixtures/config.json
