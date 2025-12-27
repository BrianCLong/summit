#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"

mkdir -p policy/tests || true
if ls policy/*.rego >/dev/null 2>&1; then
  tar -czf maestro-policy-bundle.tgz policy/*.rego policy/tests/*.rego
else
  echo "no policy/*.rego files" >&2
  tar -czf maestro-policy-bundle.tgz --files-from /dev/null
fi
if command -v cosign >/dev/null 2>&1; then
  cosign sign-blob --yes maestro-policy-bundle.tgz > maestro-policy-bundle.sig
  echo "Signed maestro-policy-bundle.tgz"
else
  echo "cosign not found; skipping signature (CI should sign)" >&2
fi

echo "Copying bundle to bundle-server..."
cp maestro-policy-bundle.tgz ../bundle-server/bundles/
