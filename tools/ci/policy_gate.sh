#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"

if command -v opa >/dev/null 2>&1; then
  echo "Running OPA tests..."
  opa test -v policy || { echo "OPA tests failed" >&2; exit 1; }
else
  echo "opa not found; skipping local tests (CI should run this)" >&2
fi

if command -v cosign >/dev/null 2>&1; then
  echo "Verifying policy bundle signature..."
  test -f policy/maestro-policy-bundle.tgz || (cd policy && ./build.sh)
  cosign verify-blob --signature policy/maestro-policy-bundle.sig policy/maestro-policy-bundle.tgz
else
  echo "cosign not found; skipping signature verify (CI should run this)" >&2
fi

echo "Policy gate passed"
