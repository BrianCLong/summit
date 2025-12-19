#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"

mkdir -p policy/tests || true

# Build bundle
if ls policy/*.rego >/dev/null 2>&1; then
  tar -czf maestro-policy-bundle.tgz policy/*.rego policy/tests/*.rego
else
  echo "no policy/*.rego files" >&2
  tar -czf maestro-policy-bundle.tgz --files-from /dev/null
fi

# Compile to Wasm (if OPA is installed)
if command -v opa >/dev/null 2>&1; then
  echo "Compiling policies to Wasm..."
  opa build -t wasm -e 'policy/main' -o policy.wasm policy/*.rego
else
  echo "opa not found; skipping Wasm compilation" >&2
fi

# Sign artifacts (if Cosign is installed)
if command -v cosign >/dev/null 2>&1; then
  cosign sign-blob --yes maestro-policy-bundle.tgz > maestro-policy-bundle.sig
  if [ -f policy.wasm ]; then
    cosign sign-blob --yes policy.wasm > policy.wasm.sig
  fi
  echo "Signed artifacts"
else
  echo "cosign not found; skipping signature (CI should sign)" >&2
fi
