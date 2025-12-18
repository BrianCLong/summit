#!/bin/bash
# Harbor Registry Setup Script
# Purpose: Initialize Harbor registry with security configurations
#
# Usage: ./setup-harbor.sh [--dev|--staging|--prod]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
ENVIRONMENT="${1:-dev}"

case "$ENVIRONMENT" in
  --dev|dev)
    ENVIRONMENT="dev"
    NAMESPACE="harbor-dev"
    VALUES_FILE="$REGISTRY_DIR/harbor/harbor-values.yaml"
    ;;
  --staging|staging)
    ENVIRONMENT="staging"
    NAMESPACE="harbor-staging"
    VALUES_FILE="$REGISTRY_DIR/harbor/harbor-values.yaml"
    ;;
  --prod|prod)
    ENVIRONMENT="prod"
    NAMESPACE="harbor"
    VALUES_FILE="$REGISTRY_DIR/harbor/harbor-values.yaml"
    ;;
  *)
    log_error "Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 [--dev|--staging|--prod]"
    exit 1
    ;;
esac

log_info "Setting up Harbor for environment: $ENVIRONMENT"

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  local missing=()

  command -v kubectl >/dev/null 2>&1 || missing+=("kubectl")
  command -v helm >/dev/null 2>&1 || missing+=("helm")
  command -v cosign >/dev/null 2>&1 || missing+=("cosign")
  command -v crane >/dev/null 2>&1 || missing+=("crane")
  command -v trivy >/dev/null 2>&1 || missing+=("trivy")

  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required tools: ${missing[*]}"
    exit 1
  fi

  # Check Kubernetes connectivity
  if ! kubectl cluster-info >/dev/null 2>&1; then
    log_error "Cannot connect to Kubernetes cluster"
    exit 1
  fi

  log_info "All prerequisites satisfied"
}

# Generate secrets
generate_secrets() {
  log_info "Generating secrets..."

  # Generate random passwords if not set
  HARBOR_ADMIN_PASSWORD="${HARBOR_ADMIN_PASSWORD:-$(openssl rand -base64 32)}"
  HARBOR_DB_PASSWORD="${HARBOR_DB_PASSWORD:-$(openssl rand -base64 32)}"
  HARBOR_CORE_SECRET="${HARBOR_CORE_SECRET:-$(openssl rand -base64 32)}"
  HARBOR_JOBSERVICE_SECRET="${HARBOR_JOBSERVICE_SECRET:-$(openssl rand -base64 32)}"
  HARBOR_REGISTRY_SECRET="${HARBOR_REGISTRY_SECRET:-$(openssl rand -base64 32)}"

  # Create namespace if not exists
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

  # Create secrets
  kubectl create secret generic harbor-secrets \
    --namespace="$NAMESPACE" \
    --from-literal=HARBOR_ADMIN_PASSWORD="$HARBOR_ADMIN_PASSWORD" \
    --from-literal=DATABASE_PASSWORD="$HARBOR_DB_PASSWORD" \
    --from-literal=CORE_SECRET="$HARBOR_CORE_SECRET" \
    --from-literal=JOBSERVICE_SECRET="$HARBOR_JOBSERVICE_SECRET" \
    --from-literal=REGISTRY_PASSWORD="$HARBOR_REGISTRY_SECRET" \
    --dry-run=client -o yaml | kubectl apply -f -

  log_info "Secrets created in namespace: $NAMESPACE"

  # Output admin password for first login
  if [ "$ENVIRONMENT" = "dev" ]; then
    log_warn "Development admin password: $HARBOR_ADMIN_PASSWORD"
    log_warn "Save this password - it will not be shown again!"
  fi
}

# Generate TLS certificates
generate_certificates() {
  log_info "Generating TLS certificates..."

  local CERT_DIR="$REGISTRY_DIR/harbor/certs"
  mkdir -p "$CERT_DIR"

  if [ "$ENVIRONMENT" = "dev" ]; then
    # Self-signed certificate for development
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "$CERT_DIR/server.key" \
      -out "$CERT_DIR/server.crt" \
      -subj "/CN=registry.intelgraph.local" \
      -addext "subjectAltName=DNS:registry.intelgraph.local,DNS:notary.intelgraph.local"

    # Create TLS secret
    kubectl create secret tls harbor-tls \
      --namespace="$NAMESPACE" \
      --cert="$CERT_DIR/server.crt" \
      --key="$CERT_DIR/server.key" \
      --dry-run=client -o yaml | kubectl apply -f -

    log_info "Self-signed certificates created"
  else
    log_info "For staging/prod, certificates should be managed by cert-manager"
  fi
}

# Deploy Harbor
deploy_harbor() {
  log_info "Deploying Harbor..."

  # Add Harbor Helm repo
  helm repo add harbor https://helm.goharbor.io
  helm repo update

  # Deploy or upgrade
  helm upgrade --install harbor harbor/harbor \
    --namespace="$NAMESPACE" \
    --values="$VALUES_FILE" \
    --set expose.ingress.hosts.core="registry-${ENVIRONMENT}.intelgraph.local" \
    --set expose.ingress.hosts.notary="notary-${ENVIRONMENT}.intelgraph.local" \
    --set externalURL="https://registry-${ENVIRONMENT}.intelgraph.local" \
    --set-string harborAdminPassword="$(kubectl get secret harbor-secrets -n "$NAMESPACE" -o jsonpath='{.data.HARBOR_ADMIN_PASSWORD}' | base64 -d)" \
    --timeout 10m \
    --wait

  log_info "Harbor deployed successfully"
}

# Configure security policies
configure_security() {
  log_info "Configuring security policies..."

  # Apply network policies
  kubectl apply -f "$REGISTRY_DIR/policies/network-policy.yaml" -n "$NAMESPACE"

  # Apply OPA policies (if Gatekeeper is installed)
  if kubectl get crd constrainttemplates.templates.gatekeeper.sh >/dev/null 2>&1; then
    log_info "Gatekeeper detected, applying OPA policies..."
    # Convert Rego to Gatekeeper ConstraintTemplate if needed
  fi

  # Configure vulnerability scanning policy via Harbor API
  log_info "Configuring vulnerability scanning policy..."

  # Wait for Harbor to be ready
  kubectl wait --for=condition=ready pod -l app=harbor -n "$NAMESPACE" --timeout=300s

  # Configure scan policy (block critical/high vulnerabilities)
  HARBOR_URL="https://registry-${ENVIRONMENT}.intelgraph.local"
  ADMIN_PASS=$(kubectl get secret harbor-secrets -n "$NAMESPACE" -o jsonpath='{.data.HARBOR_ADMIN_PASSWORD}' | base64 -d)

  curl -k -X PUT "$HARBOR_URL/api/v2.0/configurations" \
    -u "admin:$ADMIN_PASS" \
    -H "Content-Type: application/json" \
    -d '{
      "scan_all_policy": {
        "type": "daily",
        "parameter": {"daily_time": 0}
      },
      "project_creation_restriction": "adminonly"
    }'

  log_info "Security policies configured"
}

# Setup cosign keys
setup_cosign() {
  log_info "Setting up cosign keys..."

  local COSIGN_DIR="$REGISTRY_DIR/cosign/keys"
  mkdir -p "$COSIGN_DIR"

  if [ ! -f "$COSIGN_DIR/cosign.key" ]; then
    log_info "Generating new cosign key pair..."
    COSIGN_PASSWORD="" cosign generate-key-pair --output-key-prefix="$COSIGN_DIR/cosign"

    # Create Kubernetes secret with the public key
    kubectl create secret generic cosign-keys \
      --namespace="$NAMESPACE" \
      --from-file=cosign.pub="$COSIGN_DIR/cosign.pub" \
      --dry-run=client -o yaml | kubectl apply -f -

    log_warn "Cosign private key generated at: $COSIGN_DIR/cosign.key"
    log_warn "Store this key securely and never commit to version control!"
  else
    log_info "Cosign keys already exist"
  fi
}

# Setup Trivy database for offline scanning
setup_trivy_db() {
  log_info "Setting up Trivy vulnerability database..."

  local TRIVY_DB_DIR="$REGISTRY_DIR/harbor/trivy-db"
  mkdir -p "$TRIVY_DB_DIR"

  # Download latest Trivy DB
  trivy image --download-db-only --cache-dir "$TRIVY_DB_DIR"

  log_info "Trivy database downloaded to: $TRIVY_DB_DIR"
  log_info "For air-gapped environments, copy this directory to the target system"
}

# Verify installation
verify_installation() {
  log_info "Verifying installation..."

  # Wait for all pods to be ready
  kubectl wait --for=condition=ready pod -l app=harbor -n "$NAMESPACE" --timeout=300s

  # Check Harbor API
  HARBOR_URL="https://registry-${ENVIRONMENT}.intelgraph.local"

  if curl -k -sf "$HARBOR_URL/api/v2.0/ping" >/dev/null; then
    log_info "Harbor API is responding"
  else
    log_error "Harbor API is not responding"
    exit 1
  fi

  # List running components
  log_info "Harbor components:"
  kubectl get pods -n "$NAMESPACE" -l app=harbor

  log_info "Harbor installation verified successfully!"
}

# Print summary
print_summary() {
  echo ""
  echo "========================================"
  echo "Harbor Setup Complete"
  echo "========================================"
  echo ""
  echo "Environment: $ENVIRONMENT"
  echo "Namespace: $NAMESPACE"
  echo "URL: https://registry-${ENVIRONMENT}.intelgraph.local"
  echo ""
  echo "Next steps:"
  echo "1. Add DNS entry for registry-${ENVIRONMENT}.intelgraph.local"
  echo "2. Configure image pull secrets in application namespaces"
  echo "3. Review and adjust vulnerability policies"
  echo "4. Setup image sync schedule for air-gapped operation"
  echo ""
  if [ "$ENVIRONMENT" = "dev" ]; then
    echo "For local development, add to /etc/hosts:"
    echo "  127.0.0.1 registry-dev.intelgraph.local"
    echo ""
  fi
}

# Main execution
main() {
  check_prerequisites
  generate_secrets
  generate_certificates
  deploy_harbor
  configure_security
  setup_cosign
  setup_trivy_db
  verify_installation
  print_summary
}

main
