#!/usr/bin/env bash
# Summit Platform – Rollback Script
# Usage: ./scripts/rollback.sh <version> <environment> [--dry-run]
# Example: ./scripts/rollback.sh v4.1.14 production
#          ./scripts/rollback.sh v4.1.14 staging --dry-run
#
# Rollback strategy:
#   Kubernetes   → helm rollback (primary path; requires KUBECONFIG and helm)
#   Docker Compose → image tag pin + docker-compose up (fallback/local)
#   Config-only  → env var / secret re-point (no container churn needed)
#
# Exit codes:
#   0 - rollback completed and health verified
#   1 - validation failure (bad args)
#   2 - rollback mechanism failed
#   3 - post-rollback health check failed

set -euo pipefail

VERSION="${1:-}"
ENV="${2:-}"
DRY_RUN="${3:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_CHECK_SCRIPT="${SCRIPT_DIR}/health-check.sh"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

# ── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

log()  { echo -e "${GREEN}[ROLLBACK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Argument validation ──────────────────────────────────────────────────────
if [[ -z "$VERSION" || -z "$ENV" ]]; then
  err "Usage: $0 <version> <environment> [--dry-run]"
  err "  version     : semver tag starting with 'v' (e.g. v4.1.14)"
  err "  environment : staging | production"
  exit 1
fi

if [[ "$VERSION" != v* ]]; then
  err "Version must start with 'v' (e.g. v4.1.14), got: ${VERSION}"
  exit 1
fi

VALID_ENVS=("staging" "production" "dev")
if [[ ! " ${VALID_ENVS[*]} " =~ " ${ENV} " ]]; then
  err "Environment must be one of: ${VALID_ENVS[*]}, got: ${ENV}"
  exit 1
fi

IS_DRY_RUN=false
if [[ "${DRY_RUN}" == "--dry-run" ]]; then
  IS_DRY_RUN=true
  warn "DRY RUN MODE – no destructive actions will be taken"
fi

log "Rollback initiated: version=${VERSION}  env=${ENV}  dry_run=${IS_DRY_RUN}  ts=${TIMESTAMP}"

# ── Production gate ──────────────────────────────────────────────────────────
if [[ "$ENV" == "production" && "$IS_DRY_RUN" == "false" ]]; then
  warn "Production rollback requires explicit confirmation."
  read -rp "Type 'yes-rollback-production' to continue: " CONFIRM
  if [[ "$CONFIRM" != "yes-rollback-production" ]]; then
    err "Confirmation not received. Aborting."
    exit 1
  fi
fi

# ── Detect deployment mode ───────────────────────────────────────────────────
DEPLOY_MODE="${SUMMIT_DEPLOY_MODE:-auto}"

if [[ "$DEPLOY_MODE" == "auto" ]]; then
  if command -v helm &>/dev/null && helm list --namespace "${ENV}" &>/dev/null 2>&1; then
    DEPLOY_MODE="helm"
  elif command -v docker-compose &>/dev/null || command -v docker &>/dev/null; then
    DEPLOY_MODE="compose"
  else
    DEPLOY_MODE="manual"
  fi
fi

log "Detected deployment mode: ${DEPLOY_MODE}"

# ── Helm rollback ────────────────────────────────────────────────────────────
do_helm_rollback() {
  local release="${SUMMIT_HELM_RELEASE:-summit}"
  local namespace="${ENV}"

  log "Helm rollback: release=${release}  namespace=${namespace}  target-version=${VERSION}"

  # Find the revision that corresponds to VERSION in helm history
  local revision
  revision=$(helm history "${release}" --namespace "${namespace}" --max 20 -o json \
    2>/dev/null | jq -r --arg v "${VERSION}" \
    '[.[] | select(.description | test($v))] | last | .revision' 2>/dev/null || echo "")

  if [[ -z "$revision" || "$revision" == "null" ]]; then
    warn "Could not find revision for ${VERSION} in helm history. Falling back to previous revision (revision 0 = last)."
    revision=0
  fi

  log "Rolling back to helm revision: ${revision}"

  if [[ "$IS_DRY_RUN" == "true" ]]; then
    warn "[DRY RUN] Would execute: helm rollback ${release} ${revision} --namespace ${namespace} --wait --timeout 5m"
  else
    helm rollback "${release}" "${revision}" \
      --namespace "${namespace}" \
      --wait \
      --timeout 5m \
      || { err "helm rollback failed"; exit 2; }
    log "Helm rollback complete"
  fi
}

# ── Docker Compose rollback ──────────────────────────────────────────────────
do_compose_rollback() {
  local compose_file="docker-compose.yml"
  if [[ "$ENV" == "dev" ]]; then
    compose_file="docker-compose.dev.yml"
  fi

  log "Docker Compose rollback: image tag=${VERSION}  compose-file=${compose_file}"

  if [[ "$IS_DRY_RUN" == "true" ]]; then
    warn "[DRY RUN] Would set SUMMIT_IMAGE_TAG=${VERSION} and restart services"
  else
    export SUMMIT_IMAGE_TAG="${VERSION}"
    docker compose -f "${SCRIPT_DIR}/../${compose_file}" up -d --no-deps api gateway web \
      || { err "docker compose rollback failed"; exit 2; }
    log "Docker Compose rollback complete (image=${VERSION})"
  fi
}

# ── Execute rollback ─────────────────────────────────────────────────────────
case "$DEPLOY_MODE" in
  helm)    do_helm_rollback ;;
  compose) do_compose_rollback ;;
  manual)
    warn "No automation available. Manual rollback required:"
    warn "  1. Re-point load balancer / ingress to previous version"
    warn "  2. Or redeploy: helm upgrade --set image.tag=${VERSION} ..."
    warn "  3. Verify health after traffic switch"
    if [[ "$IS_DRY_RUN" == "false" ]]; then
      exit 2
    fi
    ;;
  *)
    err "Unknown SUMMIT_DEPLOY_MODE: ${DEPLOY_MODE}"
    exit 2
    ;;
esac

# ── Post-rollback health verification ────────────────────────────────────────
if [[ "$IS_DRY_RUN" == "false" ]]; then
  log "Waiting 10 s for services to stabilise..."
  sleep 10

  HEALTH_URL="${SUMMIT_HEALTH_URL:-http://localhost:4000}"

  log "Checking health at ${HEALTH_URL}/healthz"
  for attempt in 1 2 3 4 5; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_URL}/healthz" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]]; then
      log "Health check passed (attempt ${attempt})"
      break
    fi
    warn "Health check attempt ${attempt}/5 returned HTTP ${http_code}; retrying in 10 s..."
    sleep 10
    if [[ $attempt -eq 5 ]]; then
      err "Post-rollback health check FAILED after 5 attempts. Manual intervention required."
      err "  Check: ${HEALTH_URL}/health/detailed"
      err "  Logs:  kubectl logs -n ${ENV} -l app=summit --tail=100"
      exit 3
    fi
  done

  log "Checking readiness at ${HEALTH_URL}/health/ready"
  ready_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${HEALTH_URL}/health/ready" 2>/dev/null || echo "000")
  if [[ "$ready_code" != "200" ]]; then
    warn "Readiness probe returned HTTP ${ready_code} – services may still be warming up"
    warn "Monitor: ${HEALTH_URL}/health/detailed"
  fi
fi

log "✅ Rollback to ${VERSION} in ${ENV} complete (dry_run=${IS_DRY_RUN})"
log "Next steps:"
log "  1. Monitor error rate and latency for 10–15 min"
log "  2. Confirm /health/detailed shows all services healthy"
log "  3. Notify on-call channel with rollback summary"
log "  4. File incident report with root cause and rollback timeline"
