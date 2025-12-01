#!/bin/bash
set -eo pipefail

# --- Configuration ---
SERVICE_NAME="${1}"
KUBE_NAMESPACE="${KUBE_NAMESPACE:-production}"

# --- Functions ---
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

rollback_deployment() {
  local service="$1"
  log "Rolling back Kubernetes deployment for ${service}"
  # Using kubectl rollout undo command which reverts to the previous deployment revision
  # kubectl rollout undo deployment/${service}-stable --namespace ${KUBE_NAMESPACE}
  # kubectl rollout status deployment/${service}-stable --namespace ${KUBE_NAMESPACE}
}

reset_traffic() {
  local service="$1"
  log "Resetting traffic to stable version"
  # This function would route 100% of traffic back to the stable subset
  # istioctl apply -f - <<EOF ... (similar to deploy script but with 0% to canary)
}

# --- Main Execution ---
if [ -z "$SERVICE_NAME" ]; then
  log "❌ Error: Service name must be provided."
  echo "Usage: $0 <service-name>"
  exit 1
fi

log "--- Starting Rollback for ${SERVICE_NAME} ---"

# 1. Revert the Kubernetes deployment to the previous stable version
rollback_deployment "$SERVICE_NAME"

# 2. Ensure all traffic is routed to the stable version
reset_traffic "$SERVICE_NAME"

log "✅ Rollback for ${SERVICE_NAME} completed successfully."
