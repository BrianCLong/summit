#!/bin/bash
set -euo pipefail

# IntelGraph Secret Rotation Script
# 
# Rotates JWT secrets, API keys, database passwords, and other sensitive credentials
# Supports Kubernetes secrets, Vault, and AWS Secrets Manager
# 
# Usage:
#   ./rotate-secrets.sh --type jwt --environment production
#   ./rotate-secrets.sh --type database --environment staging --dry-run
#   ./rotate-secrets.sh --all --environment production

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/secret-rotation.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Configuration
VAULT_ADDR=${VAULT_ADDR:-"https://vault.intelgraph.ai:8200"}
AWS_REGION=${AWS_REGION:-"us-west-2"}
NAMESPACE=${NAMESPACE:-"intelgraph-production"}

# Logging function
log() {
    local level=$1
    shift
    echo "[$TIMESTAMP] [$level] $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Generate JWT secret (256 bits minimum)
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

# Rotate JWT secrets
rotate_jwt_secrets() {
    local environment=$1
    local dry_run=${2:-false}
    
    log "INFO" "Starting JWT secret rotation for environment: $environment"
    
    local new_jwt_secret=$(generate_jwt_secret)
    local new_refresh_secret=$(generate_jwt_secret)
    
    if [[ "$dry_run" == "true" ]]; then
        log "INFO" "DRY RUN: Would rotate JWT secrets"
        log "INFO" "DRY RUN: New JWT secret length: ${#new_jwt_secret}"
        log "INFO" "DRY RUN: New refresh secret length: ${#new_refresh_secret}"
        return 0
    fi
    
    # Update Kubernetes secrets
    if command -v kubectl >/dev/null 2>&1; then
        log "INFO" "Updating Kubernetes JWT secrets..."
        
        # Create new secret
        kubectl create secret generic jwt-secrets-new \
            --from-literal=jwt-secret="$new_jwt_secret" \
            --from-literal=jwt-refresh-secret="$new_refresh_secret" \
            --namespace="$NAMESPACE" || error_exit "Failed to create new JWT secret"
        
        # Patch deployments to use new secret
        kubectl patch deployment maestro-server \
            --namespace="$NAMESPACE" \
            --patch '{"spec":{"template":{"spec":{"containers":[{"name":"server","env":[{"name":"JWT_SECRET","valueFrom":{"secretKeyRef":{"name":"jwt-secrets-new","key":"jwt-secret"}}},{"name":"JWT_REFRESH_SECRET","valueFrom":{"secretKeyRef":{"name":"jwt-secrets-new","key":"jwt-refresh-secret"}}}]}]}}}}' \
            || error_exit "Failed to patch deployment with new JWT secret"
        
        # Wait for rollout
        kubectl rollout status deployment/maestro-server --namespace="$NAMESPACE" --timeout=300s \
            || error_exit "Deployment rollout failed"
        
        # Verify new deployment is healthy
        sleep 30
        if ! kubectl get pods --namespace="$NAMESPACE" -l app=maestro-server --field-selector=status.phase=Running | grep -q Running; then
            error_exit "New deployment is not healthy, rolling back"
        fi
        
        # Delete old secret
        kubectl delete secret jwt-secrets --namespace="$NAMESPACE" --ignore-not-found=true
        kubectl get secret jwt-secrets-new -o yaml --namespace="$NAMESPACE" | \
            sed 's/jwt-secrets-new/jwt-secrets/' | \
            kubectl apply -f - || error_exit "Failed to rename secret"
        kubectl delete secret jwt-secrets-new --namespace="$NAMESPACE"
        
        log "INFO" "JWT secrets rotated successfully in Kubernetes"
    fi
    
    # Update Vault if configured
    if command -v vault >/dev/null 2>&1 && [[ -n "${VAULT_TOKEN:-}" ]]; then
        log "INFO" "Updating Vault JWT secrets..."
        
        vault kv put secret/maestro/jwt \
            secret="$new_jwt_secret" \
            refresh_secret="$new_refresh_secret" \
            rotated_at="$TIMESTAMP" \
            || error_exit "Failed to update Vault JWT secrets"
        
        log "INFO" "JWT secrets rotated successfully in Vault"
    fi
    
    # Update AWS Secrets Manager if configured
    if command -v aws >/dev/null 2>&1; then
        log "INFO" "Updating AWS Secrets Manager JWT secrets..."
        
        aws secretsmanager update-secret \
            --region "$AWS_REGION" \
            --secret-id "maestro/jwt/$environment" \
            --secret-string "{\"jwt_secret\":\"$new_jwt_secret\",\"jwt_refresh_secret\":\"$new_refresh_secret\",\"rotated_at\":\"$TIMESTAMP\"}" \
            || error_exit "Failed to update AWS Secrets Manager JWT secrets"
        
        log "INFO" "JWT secrets rotated successfully in AWS Secrets Manager"
    fi
    
    log "INFO" "JWT secret rotation completed successfully"
}

# Rotate database passwords
rotate_database_secrets() {
    local environment=$1
    local dry_run=${2:-false}
    
    log "INFO" "Starting database secret rotation for environment: $environment"
    
    local new_postgres_password=$(generate_secret 32)
    local new_redis_password=$(generate_secret 32)
    local new_neo4j_password=$(generate_secret 32)
    
    if [[ "$dry_run" == "true" ]]; then
        log "INFO" "DRY RUN: Would rotate database passwords"
        log "INFO" "DRY RUN: New PostgreSQL password length: ${#new_postgres_password}"
        log "INFO" "DRY RUN: New Redis password length: ${#new_redis_password}"
        log "INFO" "DRY RUN: New Neo4j password length: ${#new_neo4j_password}"
        return 0
    fi
    
    # Rotate PostgreSQL password
    log "INFO" "Rotating PostgreSQL password..."
    
    # Update password in database
    PGPASSWORD="$POSTGRES_CURRENT_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -c "ALTER USER $POSTGRES_USER PASSWORD '$new_postgres_password';" \
        || error_exit "Failed to update PostgreSQL password"
    
    # Update Kubernetes secret
    kubectl create secret generic postgres-credentials-new \
        --from-literal=host="$POSTGRES_HOST" \
        --from-literal=user="$POSTGRES_USER" \
        --from-literal=password="$new_postgres_password" \
        --from-literal=database="$POSTGRES_DB" \
        --namespace="$NAMESPACE" || error_exit "Failed to create new PostgreSQL secret"
    
    # Rotate Redis password (if Redis AUTH is enabled)
    if [[ -n "${REDIS_HOST:-}" ]]; then
        log "INFO" "Rotating Redis password..."
        
        # Update Redis AUTH
        redis-cli -h "$REDIS_HOST" -a "$REDIS_CURRENT_PASSWORD" CONFIG SET requirepass "$new_redis_password" \
            || error_exit "Failed to update Redis password"
        
        # Update Kubernetes secret
        kubectl create secret generic redis-credentials-new \
            --from-literal=host="$REDIS_HOST" \
            --from-literal=password="$new_redis_password" \
            --namespace="$NAMESPACE" || error_exit "Failed to create new Redis secret"
    fi
    
    # Rotate Neo4j password
    if [[ -n "${NEO4J_HOST:-}" ]]; then
        log "INFO" "Rotating Neo4j password..."
        
        # Update Neo4j password using Cypher
        cypher-shell -a "bolt://$NEO4J_HOST:7687" \
            -u "$NEO4J_USER" \
            -p "$NEO4J_CURRENT_PASSWORD" \
            "ALTER USER $NEO4J_USER SET PASSWORD '$new_neo4j_password'" \
            || error_exit "Failed to update Neo4j password"
        
        # Update Kubernetes secret
        kubectl create secret generic neo4j-credentials-new \
            --from-literal=uri="bolt://$NEO4J_HOST:7687" \
            --from-literal=user="$NEO4J_USER" \
            --from-literal=password="$new_neo4j_password" \
            --namespace="$NAMESPACE" || error_exit "Failed to create new Neo4j secret"
    fi
    
    # Update deployment with new secrets
    log "INFO" "Updating deployments with new database credentials..."
    
    kubectl patch deployment maestro-server \
        --namespace="$NAMESPACE" \
        --patch '{"spec":{"template":{"metadata":{"annotations":{"kubectl.kubernetes.io/restartedAt":"'"$TIMESTAMP"'"}}}}}' \
        || error_exit "Failed to restart deployment"
    
    kubectl rollout status deployment/maestro-server --namespace="$NAMESPACE" --timeout=300s \
        || error_exit "Deployment rollout failed"
    
    # Verify connectivity with new passwords
    log "INFO" "Verifying database connectivity..."
    
    # Test PostgreSQL connection
    PGPASSWORD="$new_postgres_password" psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -c "SELECT 1;" >/dev/null || error_exit "PostgreSQL connectivity test failed"
    
    # Test Redis connection
    if [[ -n "${REDIS_HOST:-}" ]]; then
        redis-cli -h "$REDIS_HOST" -a "$new_redis_password" ping >/dev/null \
            || error_exit "Redis connectivity test failed"
    fi
    
    # Test Neo4j connection
    if [[ -n "${NEO4J_HOST:-}" ]]; then
        cypher-shell -a "bolt://$NEO4J_HOST:7687" \
            -u "$NEO4J_USER" \
            -p "$new_neo4j_password" \
            "RETURN 1" >/dev/null || error_exit "Neo4j connectivity test failed"
    fi
    
    # Clean up old secrets
    kubectl delete secret postgres-credentials --namespace="$NAMESPACE" --ignore-not-found=true
    kubectl get secret postgres-credentials-new -o yaml --namespace="$NAMESPACE" | \
        sed 's/postgres-credentials-new/postgres-credentials/' | \
        kubectl apply -f -
    kubectl delete secret postgres-credentials-new --namespace="$NAMESPACE"
    
    if [[ -n "${REDIS_HOST:-}" ]]; then
        kubectl delete secret redis-credentials --namespace="$NAMESPACE" --ignore-not-found=true
        kubectl get secret redis-credentials-new -o yaml --namespace="$NAMESPACE" | \
            sed 's/redis-credentials-new/redis-credentials/' | \
            kubectl apply -f -
        kubectl delete secret redis-credentials-new --namespace="$NAMESPACE"
    fi
    
    if [[ -n "${NEO4J_HOST:-}" ]]; then
        kubectl delete secret neo4j-credentials --namespace="$NAMESPACE" --ignore-not-found=true
        kubectl get secret neo4j-credentials-new -o yaml --namespace="$NAMESPACE" | \
            sed 's/neo4j-credentials-new/neo4j-credentials/' | \
            kubectl apply -f -
        kubectl delete secret neo4j-credentials-new --namespace="$NAMESPACE"
    fi
    
    log "INFO" "Database secret rotation completed successfully"
}

# Rotate API keys
rotate_api_keys() {
    local environment=$1
    local dry_run=${2:-false}
    
    log "INFO" "Starting API key rotation for environment: $environment"
    
    if [[ "$dry_run" == "true" ]]; then
        log "INFO" "DRY RUN: Would rotate API keys for external services"
        return 0
    fi
    
    # Note: API key rotation requires coordination with external services
    # This is a template for services that support programmatic key rotation
    
    # Example: Rotate OpenAI API key (if service supports it)
    if [[ -n "${OPENAI_ORG_ID:-}" ]]; then
        log "INFO" "API key rotation for OpenAI requires manual intervention"
        log "WARN" "Please manually rotate OpenAI API key and update secrets"
    fi
    
    # Example: Rotate internal API keys
    local new_internal_api_key=$(generate_secret 64)
    
    kubectl create secret generic api-keys-new \
        --from-literal=internal-api-key="$new_internal_api_key" \
        --from-literal=rotated-at="$TIMESTAMP" \
        --namespace="$NAMESPACE" || error_exit "Failed to create new API key secret"
    
    log "INFO" "API key rotation completed (manual steps may be required)"
}

# Main rotation function
rotate_secrets() {
    local secret_type=$1
    local environment=$2
    local dry_run=${3:-false}
    
    case "$secret_type" in
        jwt)
            rotate_jwt_secrets "$environment" "$dry_run"
            ;;
        database)
            rotate_database_secrets "$environment" "$dry_run"
            ;;
        api-keys)
            rotate_api_keys "$environment" "$dry_run"
            ;;
        all)
            rotate_jwt_secrets "$environment" "$dry_run"
            rotate_database_secrets "$environment" "$dry_run"
            rotate_api_keys "$environment" "$dry_run"
            ;;
        *)
            error_exit "Unknown secret type: $secret_type. Valid types: jwt, database, api-keys, all"
            ;;
    esac
}

# Verify prerequisites
verify_prerequisites() {
    local missing_tools=()
    
    if ! command -v kubectl >/dev/null 2>&1; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v openssl >/dev/null 2>&1; then
        missing_tools+=("openssl")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error_exit "Missing required tools: ${missing_tools[*]}"
    fi
    
    # Verify Kubernetes connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    log "INFO" "Prerequisites verified"
}

# Break-glass emergency rotation
emergency_rotation() {
    local environment=$1
    
    log "WARN" "EMERGENCY ROTATION: Rotating all secrets immediately"
    log "WARN" "This may cause temporary service disruption"
    
    # Rotate all secrets without confirmation
    rotate_secrets "all" "$environment" "false"
    
    # Send alert
    if command -v curl >/dev/null 2>&1 && [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚨 EMERGENCY: Secret rotation completed for '$environment'"}' \
            "$SLACK_WEBHOOK_URL" || log "WARN" "Failed to send Slack alert"
    fi
    
    log "WARN" "EMERGENCY ROTATION COMPLETED"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --type TYPE         Type of secrets to rotate (jwt|database|api-keys|all)
    --environment ENV   Target environment (production|staging|development)
    --dry-run          Show what would be done without making changes
    --emergency        Emergency rotation mode (rotates all secrets immediately)
    --help             Show this help message

Examples:
    $0 --type jwt --environment production
    $0 --type database --environment staging --dry-run
    $0 --type all --environment production
    $0 --emergency --environment production

EOF
}

# Parse command line arguments
TEMP=$(getopt -o h --long type:,environment:,dry-run,emergency,help -n "$0" -- "$@")
eval set -- "$TEMP"

SECRET_TYPE=""
ENVIRONMENT=""
DRY_RUN="false"
EMERGENCY="false"

while true; do
    case "$1" in
        --type)
            SECRET_TYPE="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --emergency)
            EMERGENCY="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Validate arguments
if [[ "$EMERGENCY" == "true" ]]; then
    if [[ -z "$ENVIRONMENT" ]]; then
        error_exit "Environment must be specified for emergency rotation"
    fi
    verify_prerequisites
    emergency_rotation "$ENVIRONMENT"
    exit 0
fi

if [[ -z "$SECRET_TYPE" || -z "$ENVIRONMENT" ]]; then
    usage
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
    error_exit "Invalid environment: $ENVIRONMENT. Valid environments: production, staging, development"
fi

# Main execution
log "INFO" "Starting secret rotation process"
log "INFO" "Type: $SECRET_TYPE, Environment: $ENVIRONMENT, Dry Run: $DRY_RUN"

verify_prerequisites
rotate_secrets "$SECRET_TYPE" "$ENVIRONMENT" "$DRY_RUN"

log "INFO" "Secret rotation process completed successfully"