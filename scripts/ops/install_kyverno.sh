#!/usr/bin/env bash
set -euo pipefail

# Install Kyverno admission controller and related components.
# Usage: ./scripts/ops/install_kyverno.sh [<version>]
# Default version tracks Kyverno main install manifest unless overridden.

VERSION="${1:-stable}"

echo "🔐 Installing Kyverno (version: ${VERSION})"

if [[ "${VERSION}" == "stable" ]]; then
  MANIFEST_URL="https://raw.githubusercontent.com/kyverno/kyverno/main/config/release/install.yaml"
else
  MANIFEST_URL="https://raw.githubusercontent.com/kyverno/kyverno/${VERSION}/config/release/install.yaml"
fi

kubectl apply -f "${MANIFEST_URL}"

echo "⏳ Waiting for Kyverno to be ready..."
kubectl -n kyverno rollout status deploy/kyverno-admission-controller --timeout=180s || true
kubectl -n kyverno get pods -o wide || true

echo "✅ Kyverno installed (or already present)"

