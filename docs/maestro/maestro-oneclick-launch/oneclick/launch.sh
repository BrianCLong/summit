#!/usr/bin/env bash
set -Eeuo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Maestro One-Click Launch
# - Resolves image digest (if tag given)
# - Rolls out to STAGE then PROD using Argo Rollouts
# - Runs witness after each environment and bundles evidence
# Requirements: docker (for digest), kubectl, kubectl-argo-rollouts, curl
# Configure via environment variables below.
# ──────────────────────────────────────────────────────────────────────────────

: "${STAGE_CONTEXT:?Set STAGE_CONTEXT (kubectl context for staging)}"
: "${PROD_CONTEXT:?Set PROD_CONTEXT (kubectl context for production)}"
: "${NAMESPACE:?Set NAMESPACE (k8s namespace)}"
: "${ROLLOUT:?Set ROLLOUT (Argo Rollouts name)}"
: "${IMAGE:?Set IMAGE (ghcr.io/...:tag or ...@sha256)}"
: "${CONTAINER_NAME:=server}"  # container in the Rollout to update

# Optional observability
: "${ALERTMANAGER_URL:=}"
: "${PROM_URL:=}"
: "${GRAFANA_URL:=}"
: "${GRAFANA_API_TOKEN:=}"
: "${APP_LABEL:=app=maestro}"

# Resolve digest if needed
resolve_digest() {
  local img="$1"
  if [[ "$img" == *@sha256:* ]]; then
    echo "$img"; return 0
  fi
  echo "🔐 Resolving digest for $img ..."
  if docker buildx imagetools inspect "$img" >/tmp/imagetools.out 2>/dev/null; then
    local dig="$(awk '/Digest:/{print $2; exit}' /tmp/imagetools.out)"
    [[ -n "$dig" ]] || { echo "❌ No digest from imagetools"; return 1; }
    local base="${img%%@*}"; base="${base%%:*}"
    echo "${base}@${dig}"; return 0
  fi
  # fallback: pull + inspect
  docker pull "$img" >/dev/null
  local line="$(docker image inspect --format '{{join .RepoDigests "\n"}}' "$img" | head -n1)"
  local dig="${line#*@}"; local base="${img%%@*}"; base="${base%%:*}"
  [[ -n "$dig" ]] || { echo "❌ Could not resolve digest"; return 1; }
  echo "${base}@${dig}"
}

promote_and_wait() {
  local ctx="$1"; local ns="$2"; local ro="$3"; local cont="$4"; local img="$5"
  echo "▶ Using context: $ctx"
  kubectl config use-context "$ctx" >/dev/null
  echo "▶ Setting image: $cont=$img"
  kubectl argo rollouts -n "$ns" set image "$ro" "$cont=$img"
  echo "▶ Promote (full) if analysis passes automatically"
  kubectl argo rollouts -n "$ns" promote "$ro" --full || true
  echo "▶ Waiting for rollout to be healthy..."
  kubectl argo rollouts -n "$ns" status "$ro"
}

run_witness() {
  local ctx="$1"; local envname="$2"
  kubectl config use-context "$ctx" >/dev/null
  STAMP_OVERRIDE="$(date -u +%Y%m%d-%H%M%SZ)-${envname}" \
  EVID_DIR_OVERRIDE="evidence-$(date -u +%Y%m%d-%H%M%SZ)-${envname}" \
  NAMESPACE="$NAMESPACE" ROLLOUT="$ROLLOUT" APP_LABEL="$APP_LABEL" \
  ALERTMANAGER_URL="$ALERTMANAGER_URL" PROM_URL="$PROM_URL" \
  GRAFANA_URL="$GRAFANA_URL" GRAFANA_API_TOKEN="$GRAFANA_API_TOKEN" \
  bash "$(dirname "$0")/witness/witness.sh"
}

DIGESTED="$(resolve_digest "$IMAGE")"
echo "✅ Using image: $DIGESTED"

# Stage
promote_and_wait "$STAGE_CONTEXT" "$NAMESPACE" "$ROLLOUT" "$CONTAINER_NAME" "$DIGESTED"
run_witness "$STAGE_CONTEXT" "stage"

# Prod
promote_and_wait "$PROD_CONTEXT" "$NAMESPACE" "$ROLLOUT" "$CONTAINER_NAME" "$DIGESTED"
run_witness "$PROD_CONTEXT" "prod"

# Bundle both evidence archives (if present)
ts="$(date -u +%Y%m%d-%H%M%SZ)"
out="oneclick-evidence-${ts}.tar"
echo "📦 Bundling evidence into $out"
tar -cf "$out" evidence-*-stage evidence-*-prod 2>/dev/null || true
echo "Done."
