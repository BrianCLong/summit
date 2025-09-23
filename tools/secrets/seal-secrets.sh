#!/bin/bash
set -euo pipefail

# Sealed Secrets Management Script
# Usage: ./seal-secrets.sh [encrypt|decrypt|rotate] [environment]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
KUBESEAL_VERSION="0.24.0"
NAMESPACE="${NAMESPACE:-intelgraph}"
ENVIRONMENT="${2:-development}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Install kubeseal if not present
install_kubeseal() {
    if ! command -v kubeseal &> /dev/null; then
        log "Installing kubeseal..."

        case "$(uname -s)" in
            Darwin)
                if command -v brew &> /dev/null; then
                    brew install kubeseal
                else
                    curl -OL "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-darwin-amd64.tar.gz"
                    tar -xvf kubeseal-${KUBESEAL_VERSION}-darwin-amd64.tar.gz kubeseal
                    sudo mv kubeseal /usr/local/bin
                    rm kubeseal-${KUBESEAL_VERSION}-darwin-amd64.tar.gz
                fi
                ;;
            Linux)
                curl -OL "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz"
                tar -xvf kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz kubeseal
                sudo mv kubeseal /usr/local/bin
                rm kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz
                ;;
            *)
                error "Unsupported platform: $(uname -s)"
                ;;
        esac

        log "kubeseal installed successfully"
    else
        log "kubeseal already installed: $(kubeseal --version)"
    fi
}

# Create raw secrets from environment or prompts
create_raw_secrets() {
    local env_file="${PROJECT_ROOT}/environments/${ENVIRONMENT}.env"
    local secrets_dir="${PROJECT_ROOT}/tmp/secrets/${ENVIRONMENT}"

    mkdir -p "$secrets_dir"

    log "Creating raw secrets for environment: $ENVIRONMENT"

    # Database secrets
    cat > "${secrets_dir}/database-secrets.yaml" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ig-platform-database-secrets
  namespace: ${NAMESPACE}
type: Opaque
data:
  postgres-user: $(echo -n "${POSTGRES_USER:-postgres}" | base64 -w 0)
  postgres-password: $(echo -n "${POSTGRES_PASSWORD:-$(openssl rand -hex 32)}" | base64 -w 0)
  postgres-database: $(echo -n "${POSTGRES_DATABASE:-intelgraph}" | base64 -w 0)
  neo4j-user: $(echo -n "${NEO4J_USER:-neo4j}" | base64 -w 0)
  neo4j-password: $(echo -n "${NEO4J_PASSWORD:-$(openssl rand -hex 32)}" | base64 -w 0)
  redis-password: $(echo -n "${REDIS_PASSWORD:-$(openssl rand -hex 32)}" | base64 -w 0)
  minio-access-key: $(echo -n "${MINIO_ACCESS_KEY:-$(openssl rand -hex 16)}" | base64 -w 0)
  minio-secret-key: $(echo -n "${MINIO_SECRET_KEY:-$(openssl rand -hex 32)}" | base64 -w 0)
EOF

    # JWT secrets
    cat > "${secrets_dir}/jwt-secrets.yaml" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ig-platform-jwt-secrets
  namespace: ${NAMESPACE}
type: Opaque
data:
  jwt-secret: $(echo -n "${JWT_SECRET:-$(openssl rand -hex 64)}" | base64 -w 0)
  oidc-client-secret: $(echo -n "${OIDC_CLIENT_SECRET:-$(openssl rand -hex 32)}" | base64 -w 0)
EOF

    # API keys
    cat > "${secrets_dir}/api-keys.yaml" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ig-platform-api-keys
  namespace: ${NAMESPACE}
type: Opaque
data:
  openai-api-key: $(echo -n "${OPENAI_API_KEY:-sk-placeholder}" | base64 -w 0)
  slack-webhook-url: $(echo -n "${SLACK_WEBHOOK_URL:-https://hooks.slack.com/placeholder}" | base64 -w 0)
  teams-webhook-url: $(echo -n "${TEAMS_WEBHOOK_URL:-https://outlook.office.com/placeholder}" | base64 -w 0)
  pagerduty-integration-key: $(echo -n "${PAGERDUTY_INTEGRATION_KEY:-placeholder}" | base64 -w 0)
EOF

    log "Raw secrets created in: $secrets_dir"
}

# Encrypt secrets using kubeseal
encrypt_secrets() {
    local secrets_dir="${PROJECT_ROOT}/tmp/secrets/${ENVIRONMENT}"
    local sealed_dir="${PROJECT_ROOT}/charts/ig-platform/templates/sealed-secrets/${ENVIRONMENT}"

    mkdir -p "$sealed_dir"

    log "Encrypting secrets for environment: $ENVIRONMENT"

    # Check if sealed-secrets controller is running
    if ! kubectl get deployment sealed-secrets-controller -n kube-system &> /dev/null; then
        warn "Sealed secrets controller not found. Installing..."
        kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/controller.yaml

        log "Waiting for controller to be ready..."
        kubectl wait --for=condition=available --timeout=300s deployment/sealed-secrets-controller -n kube-system
    fi

    # Encrypt each secret file
    for secret_file in "${secrets_dir}"/*.yaml; do
        if [[ -f "$secret_file" ]]; then
            local filename=$(basename "$secret_file" .yaml)
            local output_file="${sealed_dir}/sealed-${filename}.yaml"

            log "Encrypting: $filename"
            kubeseal --format=yaml --namespace="$NAMESPACE" < "$secret_file" > "$output_file"

            # Verify the sealed secret
            if kubectl apply --dry-run=client -f "$output_file" &> /dev/null; then
                log "✓ Sealed secret valid: $filename"
            else
                error "✗ Invalid sealed secret: $filename"
            fi
        fi
    done

    log "Sealed secrets created in: $sealed_dir"
    warn "Remember to delete raw secrets: rm -rf $secrets_dir"
}

# Decrypt secrets for verification
decrypt_secrets() {
    local sealed_dir="${PROJECT_ROOT}/charts/ig-platform/templates/sealed-secrets/${ENVIRONMENT}"

    log "Decrypting sealed secrets for verification..."

    for sealed_file in "${sealed_dir}"/sealed-*.yaml; do
        if [[ -f "$sealed_file" ]]; then
            local filename=$(basename "$sealed_file")
            log "Decrypting: $filename"

            # Apply and then get the resulting secret
            kubectl apply -f "$sealed_file"

            local secret_name=$(yq eval '.metadata.name' "$sealed_file")

            echo "--- $secret_name ---"
            kubectl get secret "$secret_name" -n "$NAMESPACE" -o yaml | yq eval '.data | with_entries(.value |= @base64d)'
            echo
        fi
    done
}

# Rotate sealed secrets (re-encrypt with new controller key)
rotate_secrets() {
    log "Rotating sealed secrets..."

    # First backup existing sealed secrets
    local backup_dir="${PROJECT_ROOT}/tmp/sealed-secrets-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"

    cp -r "${PROJECT_ROOT}/charts/ig-platform/templates/sealed-secrets" "$backup_dir/"
    log "Backup created: $backup_dir"

    # Get current secrets and re-encrypt
    local secrets_dir="${PROJECT_ROOT}/tmp/secrets/${ENVIRONMENT}-rotation"
    mkdir -p "$secrets_dir"

    # Extract current secrets
    for secret_name in "ig-platform-database-secrets" "ig-platform-jwt-secrets" "ig-platform-api-keys"; do
        if kubectl get secret "$secret_name" -n "$NAMESPACE" &> /dev/null; then
            kubectl get secret "$secret_name" -n "$NAMESPACE" -o yaml > "${secrets_dir}/${secret_name}.yaml"
        fi
    done

    # Re-encrypt with current controller
    ENVIRONMENT="${ENVIRONMENT}-rotation"
    encrypt_secrets

    log "Secrets rotated successfully"
    warn "Test the new sealed secrets before removing backup: $backup_dir"
}

# Generate development sealed secrets with example values
generate_dev_secrets() {
    log "Generating development sealed secrets with placeholder values..."

    # Set development environment variables
    export POSTGRES_USER="postgres"
    export POSTGRES_PASSWORD="dev-password-123"
    export POSTGRES_DATABASE="intelgraph"
    export NEO4J_USER="neo4j"
    export NEO4J_PASSWORD="dev-neo4j-456"
    export REDIS_PASSWORD="dev-redis-789"
    export MINIO_ACCESS_KEY="dev-minio-access"
    export MINIO_SECRET_KEY="dev-minio-secret-key"
    export JWT_SECRET="dev-jwt-secret-$(openssl rand -hex 32)"
    export OIDC_CLIENT_SECRET="dev-oidc-secret"
    export OPENAI_API_KEY="sk-dev-placeholder-key"
    export SLACK_WEBHOOK_URL="https://hooks.slack.com/dev/placeholder"
    export TEAMS_WEBHOOK_URL="https://outlook.office.com/dev/placeholder"
    export PAGERDUTY_INTEGRATION_KEY="dev-pagerduty-key"

    ENVIRONMENT="development"
    create_raw_secrets
    encrypt_secrets

    log "Development sealed secrets generated"
    warn "These contain placeholder values - update for real deployments"
}

# Main command handler
main() {
    local command="${1:-help}"

    case "$command" in
        encrypt)
            install_kubeseal
            create_raw_secrets
            encrypt_secrets
            ;;
        decrypt)
            install_kubeseal
            decrypt_secrets
            ;;
        rotate)
            install_kubeseal
            rotate_secrets
            ;;
        dev)
            install_kubeseal
            generate_dev_secrets
            ;;
        help|*)
            cat <<EOF
Sealed Secrets Management Script

Usage: $0 <command> [environment]

Commands:
  encrypt     Create and encrypt secrets for environment
  decrypt     Decrypt and display secrets for verification
  rotate      Rotate sealed secrets with new controller key
  dev         Generate development secrets with placeholders
  help        Show this help message

Environment: development, staging, production (default: development)

Examples:
  $0 dev                    # Generate development secrets
  $0 encrypt production     # Encrypt production secrets
  $0 decrypt staging        # Decrypt staging secrets for verification
  $0 rotate production      # Rotate production sealed secrets

Environment Variables:
  POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE
  NEO4J_USER, NEO4J_PASSWORD
  REDIS_PASSWORD
  MINIO_ACCESS_KEY, MINIO_SECRET_KEY
  JWT_SECRET, OIDC_CLIENT_SECRET
  OPENAI_API_KEY
  SLACK_WEBHOOK_URL, TEAMS_WEBHOOK_URL
  PAGERDUTY_INTEGRATION_KEY

EOF
            ;;
    esac
}

main "$@"