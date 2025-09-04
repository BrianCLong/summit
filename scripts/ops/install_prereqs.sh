#!/usr/bin/env bash
set -euo pipefail

# Installs Argo Rollouts CRDs and OPA Gatekeeper in the cluster.
# Usage: ./scripts/ops/install_prereqs.sh

echo "🧰 Installing prerequisites (Argo Rollouts, Gatekeeper)…"

kubectl get ns argo-rollouts >/dev/null 2>&1 || kubectl create ns argo-rollouts

echo "➡️  Argo Rollouts"
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
kubectl -n argo-rollouts rollout status deploy/argo-rollouts --timeout=180s || true

echo "➡️  Gatekeeper"
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
kubectl -n gatekeeper-system rollout status deploy/gatekeeper-controller-manager --timeout=180s || true

echo "✅ Prerequisites installed"

