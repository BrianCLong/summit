#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${NAMESPACE:-intelgraph-secure}
CHART_DIR="$(cd "$(dirname "$0")/../helm" && pwd)"
TMP_RENDER="$(mktemp)"
trap 'rm -f "$TMP_RENDER"' EXIT

if ! command -v helm >/dev/null 2>&1; then
  echo "[error] helm is required to render the chart" >&2
  exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "[error] ripgrep (rg) is required for validation checks" >&2
  exit 1
fi

echo "[info] Rendering chart to ${TMP_RENDER}"
helm template "$CHART_DIR" --namespace "$NAMESPACE" > "$TMP_RENDER"

assert_contains() {
  local pattern="$1"
  local message="$2"
  if rg --quiet "$pattern" "$TMP_RENDER"; then
    echo "[pass] ${message}"
  else
    echo "[fail] ${message}" >&2
    exit 1
  fi
}

assert_absent() {
  local pattern="$1"
  local message="$2"
  if rg --quiet "$pattern" "$TMP_RENDER"; then
    echo "[fail] ${message}" >&2
    exit 1
  else
    echo "[pass] ${message}"
  fi
}

assert_contains "pod-security.kubernetes.io/enforce: restricted" "Namespace enforces Pod Security restricted level"
assert_contains "imagePullSecrets:" "Workloads include imagePullSecrets for private registry access"
assert_contains "kind: ServiceAccount\nmetadata:\n  name: gateway" "Gateway service account rendered"
assert_contains "kind: ServiceAccount\nmetadata:\n  name: ui" "UI service account rendered"
assert_contains "kind: ServiceAccount\nmetadata:\n  name: external-secrets" "External-secrets service account rendered"
assert_contains "kind: Role\nmetadata:\n  name: ops-admin" "Ops admin Role present"
assert_contains "kind: Role\nmetadata:\n  name: ci-deployer" "CI deployer Role present"
assert_contains "kind: PeerAuthentication" "PeerAuthentication present"
assert_contains "mode: STRICT" "mTLS set to STRICT"
assert_contains "ISTIO_MUTUAL" "DestinationRules enforce ISTIO_MUTUAL"
assert_contains "cert-manager.io/(cluster-issuer|issuer)" "cert-manager issuer annotations present on ingress"
assert_absent "^kind: Secret" "No Kubernetes Secret objects rendered by the chart"
assert_contains "audit.summit.dev/retention-days" "Audit ConfigMap publishes retention metadata"

echo "[info] Validation complete for namespace ${NAMESPACE}"
