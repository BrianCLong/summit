#!/usr/bin/env bash
# launch-maestro.sh — stage -> verify -> prod with digest pinning + rollbacks
# Requirements: docker, kubectl, helm, (optional) kubectl-argo-rollouts plugin, cosign
set -euo pipefail

# ========= EDIT ME (minimally) =========
IMAGE="${IMAGE:-ghcr.io/brianclong/maestro-control-plane:latest}"  # your canonical image:tag
CHART_DIR="${CHART_DIR:-./charts/maestro}"                         # helm chart path
ROLLOUT_FILE_STAGING="${ROLLOUT_FILE_STAGING:-k8s/maestro-rollout.yaml}"  # Argo Rollout for staging
ROLLOUT_FILE_PROD="${ROLLOUT_FILE_PROD:-k8s/maestro-rollout.yaml}"        # Argo Rollout for prod
SVC_FILE="${SVC_FILE:-deploy/argo/services.yaml}"                   # stable/canary services
STAGING_NS="${STAGING_NS:-intelgraph-staging}"
PROD_NS="${PROD_NS:-intelgraph-prod}"
ROLLOUT_NAME="${ROLLOUT_NAME:-maestro-server-rollout}"
CONTAINER_NAME="${CONTAINER_NAME:-maestro-server}"
SERVICE_PORT="${SERVICE_PORT:-80}"
TARGET_PORT="${TARGET_PORT:-4000}"                                  # unify ports to 4000
AUTO_PROMOTE="${AUTO_PROMOTE:-0}"                                   # 1 = auto promote, 0 = interactive gate

# Optional integrations (only if you have them configured already):
GRAFANA_URL="${GRAFANA_URL:-}"         # e.g. https://grafana.example.com
GRAFANA_API_TOKEN="${GRAFANA_API_TOKEN:-}"  # if you want to run the SLO script
PGURL="${PGURL:-}"                     # if you want to run DR restore check
PAGERDUTY_ROUTING_KEY="${PAGERDUTY_ROUTING_KEY:-}"  # ensure Alertmanager secret is set in cluster
# ======================================

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "\033[1;34m[INFO]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ OK ]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[ERR ]\033[0m %s\n" "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { err "Missing: $1"; exit 2; }; }
pause_gate() {
  if [[ "$AUTO_PROMOTE" == "1" ]]; then return; fi
  read -r -p "Proceed? [y/N] " ans; [[ "${ans:-}" =~ ^[Yy]$ ]] || { err "Aborted."; exit 9; }
}

need docker
need kubectl
need helm

if ! kubectl api-resources | grep -q Rollout; then
  warn "Argo Rollouts CRDs not found; installing stable CRDs cluster-wide…"
  kubectl apply -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
fi

if ! command -v kubectl-argo-rollouts >/dev/null 2>&1 && ! kubectl argo rollouts version >/dev/null 2>&1; then
  warn "kubectl-argo-rollouts plugin not found. We'll use kubectl patch fallback."
fi

bold "1) Preflight: manifest, pull, and digest pin"
if [[ -x ./maestro-preflight.sh ]]; then
  ./maestro-preflight.sh "$IMAGE" || { err "Preflight failed"; exit 3; }
fi

info "Pulling $IMAGE to resolve digest…"
docker pull "$IMAGE" >/dev/null
DIGEST_REF="$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE")"
if [[ -z "${DIGEST_REF:-}" || "$DIGEST_REF" == "<no value>" ]]; then
  err "Could not resolve RepoDigest from local docker; ensure image is public or GHCR auth is configured."
  exit 4
fi
REPO="${DIGEST_REF%@*}"     # ghcr.io/…/maestro-control-plane
DIGEST="${DIGEST_REF#*@}"   # sha256:…

ok "Resolved digest: $DIGEST_REF"
info "Repository: $REPO"
info "Digest:     $DIGEST"

TAG="${IMAGE#*:}"
[[ "$TAG" == "$IMAGE" ]] && TAG="latest"

bold "2) Create/ensure namespaces"
kubectl get ns "$STAGING_NS" >/dev/null 2>&1 || kubectl create ns "$STAGING_NS"
kubectl get ns "$PROD_NS"    >/dev/null 2>&1 || kubectl create ns "$PROD_NS"

bold "3) Apply (if present) staging secrets/config and services"
kubectl -n "$STAGING_NS" apply -f k8s/maestro-staging-secrets.yaml 2>/dev/null || true
kubectl -n "$STAGING_NS" apply -f k8s/maestro-staging-configmap.yaml 2>/dev/null || true
kubectl -n "$STAGING_NS" apply -f "$SVC_FILE"

bold "4) Helm install/upgrade to staging (base values; we pin digest via Rollout next)"
helm upgrade --install maestro "$CHART_DIR" \
  --namespace "$STAGING_NS" \
  --set image.repository="$REPO" \
  --set image.tag="$TAG" \
  --set service.port="$SERVICE_PORT" \
  --set service.targetPort="$TARGET_PORT"

bold "5) Apply the Argo Rollout for staging"
kubectl -n "$STAGING_NS" apply -f "$ROLLOUT_FILE_STAGING"

bold "6) Pin the digest on staging Rollout"
if kubectl argo rollouts version >/dev/null 2>&1 || command -v kubectl-argo-rollouts >/dev/null 2>&1; then
  kubectl argo rollouts set image "$ROLLOUT_NAME" -n "$STAGING_NS" \
    "$CONTAINER_NAME=$REPO@$DIGEST"
else
  # Fallback: patch the rollout template container image
  kubectl -n "$STAGING_NS" patch rollout "$ROLLOUT_NAME" --type='json' \
    -p="[ { \"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/image\", \"value\": \"$REPO@$DIGEST\" } ]"
fi

bold "7) Watch staging rollout until Healthy"
if kubectl argo rollouts version >/dev/null 2>&1 || command -v kubectl-argo-rollouts >/dev/null 2>&1; then
  kubectl argo rollouts get rollout "$ROLLOUT_NAME" -n "$STAGING_NS" --watch
else
  kubectl -n "$STAGING_NS" rollout status rollout/"$ROLLOUT_NAME"
fi

bold "8) Smoke checks (staging)"
# Cluster-local check
kubectl -n "$STAGING_NS" run curl-smoke --rm -i --restart=Never --image=curlimages/curl:8.8.0 -- \
  curl -fsS http://$(kubectl -n "$STAGING_NS" get svc maestro-stable -o jsonpath='{.spec.clusterIP}'):$TARGET_PORT/health | sed -e 's/^/[staging]/'
ok "Staging health endpoint responded"

# Optional SLO gate (Grafana API)
if [[ -n "${GRAFANA_URL}" && -n "${GRAFANA_API_TOKEN}" && -x scripts/ops/check-grafana-slo.sh ]]; then
  info "Running Grafana SLO verification (staging)…"
  GRAFANA_URL="$GRAFANA_URL" GRAFANA_API_TOKEN="$GRAFANA_API_TOKEN" scripts/ops/check-grafana-slo.sh
fi

# Optional DR sanity
if [[ -n "${PGURL}" && -x scripts/dr/restore_check.sh ]]; then
  info "Running DR restore check against ${PGURL%%:*}" "(staging)…"
  PGURL="$PGURL" scripts/dr/restore_check.sh
fi

bold "9) Manual QA gate before promotion"
pause_gate

bold "10) Prepare prod services and base helm in prod"
kubectl -n "$PROD_NS" apply -f "$SVC_FILE" || true
helm upgrade --install maestro "$CHART_DIR" \
  --namespace "$PROD_NS" \
  --set image.repository="$REPO" \
  --set image.tag="$TAG" \
  --set service.port="$SERVICE_PORT" \
  --set service.targetPort="$TARGET_PORT"

bold "11) Apply the Argo Rollout for prod"
kubectl -n "$PROD_NS" apply -f "$ROLLOUT_FILE_PROD"

bold "12) Pin the digest on prod Rollout (canary 10% → analysis)"
if kubectl argo rollouts version >/dev/null 2>&1 || command -v kubectl-argo-rollouts >/dev/null 2>&1; then
  kubectl argo rollouts set image "$ROLLOUT_NAME" -n "$PROD_NS" \
    "$CONTAINER_NAME=$REPO@$DIGEST"
  kubectl argo rollouts get rollout "$ROLLOUT_NAME" -n "$PROD_NS" --watch
else
  kubectl -n "$PROD_NS" patch rollout "$ROLLOUT_NAME" --type='json' \
    -p="[ { \"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/image\", \"value\": \"$REPO@$DIGEST\" } ]"
  kubectl -n "$PROD_NS" rollout status rollout/"$ROLLOUT_NAME"
fi

bold "13) Production smoke checks"
kubectl -n "$PROD_NS" run curl-smoke --rm -i --restart=Never --image=curlimages/curl:8.8.0 -- \
  curl -fsS http://$(kubectl -n "$PROD_NS" get svc maestro-stable -o jsonpath='{.spec.clusterIP}'):$TARGET_PORT/health | sed -e 's/^/[prod]/'
ok "Prod health endpoint responded"

# Optional prod SLO gate
if [[ -n "${GRAFANA_URL}" && -n "${GRAFANA_API_TOKEN}" && -x scripts/ops/check-grafana-slo.sh ]]; then
  info "Running Grafana SLO verification (prod)…"
  GRAFANA_URL="$GRAFANA_URL" GRAFANA_API_TOKEN="$GRAFANA_API_TOKEN" scripts/ops/check-grafana-slo.sh
fi

bold "14) Promote canary → 100% (prod)"
pause_gate
if kubectl argo rollouts version >/dev/null 2>&1 || command -v kubectl-argo-rollouts >/dev/null 2>&1; then
  kubectl argo rollouts promote "$ROLLOUT_NAME" -n "$PROD_NS"
  kubectl argo rollouts get rollout "$ROLLOUT_NAME" -n "$PROD_NS" --watch
else
  warn "No argo plugin; ensure your rollout strategy auto-progresses or patch steps manually."
fi

ok "Staging + Prod are up on $REPO@$DIGEST"

bold "Rollback tips:"
echo "  kubectl argo rollouts undo $ROLLOUT_NAME -n $PROD_NS --to-revision <N>"
echo "  kubectl argo rollouts promote $ROLLOUT_NAME -n $PROD_NS --rollback"
