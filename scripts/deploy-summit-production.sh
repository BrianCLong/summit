#!/bin/bash
set -euo pipefail

# Summit Production Deployment Script
# Deploys Summit to production using charts/summit with prod values.

# Configuration (override via env)
NAMESPACE="${NAMESPACE:-summit-prod}"
KUBECTL_CONTEXT="${KUBECTL_CONTEXT:-prod-cluster}"
HELM_RELEASE_NAME="${HELM_RELEASE_NAME:-summit}"
CHART_PATH="${CHART_PATH:-charts/summit}"
VALUES_FILE="${VALUES_FILE:-charts/summit/values.prod.yaml}"
TIMEOUT="${TIMEOUT:-600s}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

error_exit() {
  log_error "$1"
  exit 1
}

usage() {
  cat <<EOF
Usage: $0 <deploy|dry-run|status|rollback>

Env overrides:
  NAMESPACE           (default: summit-prod)
  KUBECTL_CONTEXT     (default: prod-cluster)
  HELM_RELEASE_NAME   (default: summit)
  CHART_PATH          (default: charts/summit)
  VALUES_FILE         (default: charts/summit/values.prod.yaml)
  TIMEOUT             (default: 600s)
  IMAGE_TAG           (optional: overrides image.tag)
EOF
}

check_prerequisites() {
  log_info "Checking prerequisites..."
  command -v kubectl >/dev/null 2>&1 || error_exit "kubectl is not installed or not in PATH"
  command -v helm >/dev/null 2>&1 || error_exit "helm is not installed or not in PATH"

  if ! kubectl cluster-info --context="${KUBECTL_CONTEXT}" >/dev/null 2>&1; then
    error_exit "Cannot connect to Kubernetes cluster (context: ${KUBECTL_CONTEXT})"
  fi

  CURRENT_CONTEXT="$(kubectl config current-context)"
  if [[ "${CURRENT_CONTEXT}" != *"prod"* && "${CURRENT_CONTEXT}" != *"production"* ]]; then
    log_warning "Current context '${CURRENT_CONTEXT}' does not look like production"
  fi

  log_success "Prerequisites check passed"
}

validate_config() {
  log_info "Validating chart and values..."

  [[ -d "${CHART_PATH}" ]] || error_exit "Helm chart not found at ${CHART_PATH}"
  [[ -f "${VALUES_FILE}" ]] || error_exit "Values file not found at ${VALUES_FILE}"

  helm lint "${CHART_PATH}" || error_exit "Helm chart validation failed"

  local extra_args=()
  if [[ -n "${IMAGE_TAG:-}" ]]; then
    extra_args+=(--set "image.tag=${IMAGE_TAG}")
  fi

  log_info "Validating manifests with dry-run..."
  helm template "${HELM_RELEASE_NAME}" "${CHART_PATH}" \
    -f "${VALUES_FILE}" \
    --namespace "${NAMESPACE}" \
    "${extra_args[@]}" | kubectl apply --dry-run=client -f - >/dev/null

  log_success "Configuration validation passed"
}

ensure_namespace() {
  log_info "Ensuring namespace '${NAMESPACE}' exists..."
  kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  kubectl label namespace "${NAMESPACE}" \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite >/dev/null
  log_success "Namespace '${NAMESPACE}' ready"
}

deploy() {
  local extra_args=()
  if [[ -n "${IMAGE_TAG:-}" ]]; then
    extra_args+=(--set "image.tag=${IMAGE_TAG}")
  fi

  log_info "Deploying release '${HELM_RELEASE_NAME}' to namespace '${NAMESPACE}'..."
  helm upgrade --install "${HELM_RELEASE_NAME}" "${CHART_PATH}" \
    -f "${VALUES_FILE}" \
    --namespace "${NAMESPACE}" \
    --timeout "${TIMEOUT}" \
    --wait \
    "${extra_args[@]}"

  log_success "Deployment completed"
  kubectl rollout status deployment/${HELM_RELEASE_NAME} -n "${NAMESPACE}" --timeout="${TIMEOUT}" || true
}

status() {
  log_info "Status for release '${HELM_RELEASE_NAME}'..."
  helm status "${HELM_RELEASE_NAME}" -n "${NAMESPACE}" || true
  kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/instance="${HELM_RELEASE_NAME}" || true
}

rollback() {
  local revision="${1:-1}"
  log_warning "Rolling back release '${HELM_RELEASE_NAME}' to revision ${revision}..."
  helm rollback "${HELM_RELEASE_NAME}" "${revision}" -n "${NAMESPACE}"
  kubectl rollout status deployment/${HELM_RELEASE_NAME} -n "${NAMESPACE}" --timeout="${TIMEOUT}" || true
  log_success "Rollback completed"
}

main() {
  local action="${1:-}"
  case "${action}" in
    deploy)
      check_prerequisites
      validate_config
      ensure_namespace
      deploy
      ;;
    dry-run)
      check_prerequisites
      validate_config
      ;;
    status)
      status
      ;;
    rollback)
      rollback "${2:-1}"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
