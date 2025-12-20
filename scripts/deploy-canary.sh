#!/bin/bash
set -eo pipefail

# --- Configuration ---
# These variables would typically be sourced from a CI/CD environment
SERVICE_NAME="${1:-my-app}"
NEW_VERSION="${2:-v1.1.0}"
KUBE_NAMESPACE="${KUBE_NAMESPACE:-production}"
HEALTH_CHECK_URL="${3:-http://localhost:3000/health}"

TRAFFIC_STEPS=(10 25 50 100) # Traffic percentages for gradual rollout

# --- Functions ---
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

update_traffic_rules() {
  local service="$1"
  local version="$2"
  local percentage="$3"
  log "Updating traffic routing: ${service}@${version} -> ${percentage}%"
  # Example with a service mesh like Istio:
  # istioctl apply -f - <<EOF
  # apiVersion: networking.istio.io/v1alpha3
  # kind: VirtualService
  # metadata:
  #   name: ${service}
  # spec:
  #   hosts:
  #   - "${service}"
  #   http:
  #   - route:
  #     - destination:
  #         host: ${service}
  #         subset: "v-stable"
  #       weight: $((100 - percentage))
  #     - destination:
  #         host: ${service}
  #         subset: "v-canary"
  #       weight: ${percentage}
  # EOF
}

deploy_canary() {
  local service="$1"
  local version="$2"
  log "Deploying new canary version: ${service}:${version}"
  # Example with kubectl:
  # kubectl set image deployment/${service}-canary --namespace ${KUBE_NAMESPACE} ${service}=${service}:${version}
  # kubectl rollout status deployment/${service}-canary --namespace ${KUBE_NAMESPACE}
}

promote_canary() {
    local service="$1"
    local version="$2"
    log "Promoting canary version ${version} to stable"
    # kubectl set image deployment/${service}-stable --namespace ${KUBE_NAMESPACE} ${service}=${service}:${version}
    # rollout status deployment/${service}-stable --namespace ${KUBE_NAMESPACE}
    update_traffic_rules "$service" "$version" 0 # Shift all traffic away from canary
    log "Promotion complete."
}


# --- Main Execution ---
log "Starting canary deployment for ${SERVICE_NAME}, version ${NEW_VERSION}"

# 1. Deploy the canary version with 0% traffic
deploy_canary "$SERVICE_NAME" "$NEW_VERSION"

# 2. Gradual traffic shifting and health validation
for step in "${TRAFFIC_STEPS[@]}"; do
  log "--- Shifting traffic to ${step}% ---"
  update_traffic_rules "$SERVICE_NAME" "$NEW_VERSION" "$step"

  log "Waiting 30s for metrics to stabilize..."
  sleep 30

  log "Running health check..."
  if ! ./scripts/canary-health-check.sh "${HEALTH_CHECK_URL}"; then
    log "❌ Health check failed. Rolling back..."
    ./scripts/rollback.sh "$SERVICE_NAME"
    exit 1
  fi
  log "✅ Health check passed."
done

# 3. Promote the canary to be the new stable version
log "🎉 Canary deployment successful."
promote_canary "$SERVICE_NAME" "$NEW_VERSION"
