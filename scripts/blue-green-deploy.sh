#!/bin/bash

# IntelGraph - Blue/Green Deployment Script
# Zero-downtime deployments with automatic rollback

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-staging}"
IMAGE_TAG="${2:-latest}"
NAMESPACE="${NAMESPACE:-intelgraph-${ENVIRONMENT}}"
RELEASE_NAME="${RELEASE_NAME:-intelgraph}"
SERVICE_NAME="${SERVICE_NAME:-${RELEASE_NAME}-service}"
TIMEOUT=${TIMEOUT:-300} # 5 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed"
        exit 1
    fi
    
    # Test cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Determine current and next environments
determine_environments() {
    log_info "Determining current deployment environment..."
    
    # Check which environment is currently active
    CURRENT_ENV=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}' 2>/dev/null || echo "none")
    
    if [[ "$CURRENT_ENV" == "blue" ]]; then
        NEXT_ENV="green"
        PREVIOUS_ENV="blue"
    elif [[ "$CURRENT_ENV" == "green" ]]; then
        NEXT_ENV="blue"
        PREVIOUS_ENV="green"
    else
        # First deployment - default to blue
        NEXT_ENV="blue"
        PREVIOUS_ENV="none"
        CURRENT_ENV="none"
    fi
    
    log_info "Current environment: $CURRENT_ENV"
    log_info "Deploying to: $NEXT_ENV"
    
    # Export for GitHub Actions
    echo "current-environment=$CURRENT_ENV" >> $GITHUB_OUTPUT 2>/dev/null || true
    echo "green-environment=$NEXT_ENV" >> $GITHUB_OUTPUT 2>/dev/null || true
    echo "previous-environment=$PREVIOUS_ENV" >> $GITHUB_OUTPUT 2>/dev/null || true
}

# Create namespace if it doesn't exist
ensure_namespace() {
    log_info "Ensuring namespace exists: $NAMESPACE"
    
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespace for monitoring
    kubectl label namespace "$NAMESPACE" \
        app.kubernetes.io/name=maestro \
        app.kubernetes.io/environment="$ENVIRONMENT" \
        --overwrite
}

# Deploy to the next environment
deploy_next_environment() {
    log_info "Deploying ${RELEASE_NAME} ${IMAGE_TAG} to $NEXT_ENV environment..."
    
    # Prepare Helm values for the deployment
    cat > "/tmp/values-${NEXT_ENV}.yaml" << EOF
# Blue/Green deployment configuration
environment: $NEXT_ENV
image:
  tag: "$IMAGE_TAG"
  pullPolicy: Always

# Service configuration (not yet active)
service:
  enabled: true
  type: ClusterIP
  port: 4000
  selector:
    environment: $NEXT_ENV

# Deployment configuration
deployment:
  replicaCount: 3
  environment: $NEXT_ENV
  
# Health checks
healthCheck:
  enabled: true
  path: /health
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5

# Readiness checks
readinessCheck:
  enabled: true
  path: /ready
  initialDelaySeconds: 15
  periodSeconds: 5
  timeoutSeconds: 3

# Resource limits for production
resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 1000m
    memory: 2Gi

# Environment-specific configuration
config:
  nodeEnv: $ENVIRONMENT
  logLevel: info
  database:
    maxConnections: 50
  redis:
    maxConnections: 20

# Monitoring and metrics
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
  grafana:
    dashboards:
      enabled: true

# Cost monitoring
costMonitoring:
  enabled: true
  alertInterval: 1m
  notifications:
    email:
      default: "platform@maestro.dev"
      critical: "oncall@maestro.dev"

# Autoscaling (disabled during deployment)
autoscaling:
  enabled: false

# Blue/green specific labels
labels:
  deployment-strategy: blue-green
  deployment-timestamp: "$(date -u +%Y%m%d-%H%M%S)"
  deployment-environment: $NEXT_ENV
EOF

    # Deploy using Helm
    helm upgrade --install \
        "${RELEASE_NAME}-${NEXT_ENV}" \
        ./charts/maestro \
        --namespace "$NAMESPACE" \
        --values "/tmp/values-${NEXT_ENV}.yaml" \
        --timeout "${TIMEOUT}s" \
        --wait \
        --atomic
    
    log_success "Deployed to $NEXT_ENV environment"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_info "Waiting for $NEXT_ENV deployment to be ready..."
    
    # Wait for deployment to be available
    kubectl wait deployment "${RELEASE_NAME}-${NEXT_ENV}" \
        --namespace "$NAMESPACE" \
        --for=condition=Available \
        --timeout="${TIMEOUT}s"
    
    # Wait for all pods to be ready
    kubectl wait pods \
        --namespace "$NAMESPACE" \
        --selector="app.kubernetes.io/name=maestro,environment=$NEXT_ENV" \
        --for=condition=Ready \
        --timeout="${TIMEOUT}s"
    
    log_success "$NEXT_ENV deployment is ready"
}

# Run health checks on the new deployment
run_health_checks() {
    log_info "Running health checks on $NEXT_ENV deployment..."
    
    # Get a pod from the new deployment for health checking
    POD_NAME=$(kubectl get pods -n "$NAMESPACE" \
        --selector="app.kubernetes.io/name=maestro,environment=$NEXT_ENV" \
        --output jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$POD_NAME" ]]; then
        log_error "No pods found for health checking"
        return 1
    fi
    
    # Port forward for health check
    kubectl port-forward -n "$NAMESPACE" "pod/$POD_NAME" 8080:4000 &
    PORT_FORWARD_PID=$!
    
    # Give port-forward time to establish
    sleep 5
    
    # Health check
    local health_attempts=0
    local max_attempts=30
    
    while [[ $health_attempts -lt $max_attempts ]]; do
        if curl -sf http://localhost:8080/health &>/dev/null; then
            log_success "Health check passed"
            kill $PORT_FORWARD_PID &>/dev/null || true
            return 0
        fi
        
        ((health_attempts++))
        log_info "Health check attempt $health_attempts/$max_attempts failed, retrying..."
        sleep 2
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    kill $PORT_FORWARD_PID &>/dev/null || true
    return 1
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests on $NEXT_ENV deployment..."
    
    # Get service endpoint for testing
    SERVICE_ENDPOINT="http://${RELEASE_NAME}-${NEXT_ENV}.${NAMESPACE}.svc.cluster.local:4000"
    
    # Create a test pod for smoke tests
    kubectl run smoke-test-pod \
        --namespace "$NAMESPACE" \
        --image=curlimages/curl:latest \
        --rm -i --tty \
        --restart=Never \
        --command -- sh -c "
            echo 'Running smoke tests...'
            
            # Test health endpoint
            if ! curl -sf $SERVICE_ENDPOINT/health; then
                echo 'Health endpoint test failed'
                exit 1
            fi
            
            # Test ready endpoint
            if ! curl -sf $SERVICE_ENDPOINT/ready; then
                echo 'Ready endpoint test failed'
                exit 1
            fi
            
            # Test GraphQL endpoint
            if ! curl -sf -X POST $SERVICE_ENDPOINT/graphql \
                -H 'Content-Type: application/json' \
                -d '{\"query\":\"query{__typename}\"}'; then
                echo 'GraphQL endpoint test failed'
                exit 1
            fi
            
            echo 'All smoke tests passed'
        " 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        log_success "Smoke tests passed"
    else
        log_error "Smoke tests failed"
        return 1
    fi
}

# Switch traffic to the new environment
switch_traffic() {
    log_info "Switching traffic to $NEXT_ENV environment..."
    
    # Update the main service selector to point to the new environment
    kubectl patch service "$SERVICE_NAME" \
        --namespace "$NAMESPACE" \
        --type='merge' \
        --patch="{\"spec\":{\"selector\":{\"environment\":\"$NEXT_ENV\"}}}"
    
    # Wait a moment for the change to propagate
    sleep 10
    
    # Verify the switch
    NEW_SELECTOR=$(kubectl get service "$SERVICE_NAME" \
        -n "$NAMESPACE" \
        -o jsonpath='{.spec.selector.environment}')
    
    if [[ "$NEW_SELECTOR" == "$NEXT_ENV" ]]; then
        log_success "Traffic successfully switched to $NEXT_ENV"
        
        # Set output for external URL
        EXTERNAL_URL=$(get_external_url)
        echo "url=$EXTERNAL_URL" >> $GITHUB_OUTPUT 2>/dev/null || true
        
        return 0
    else
        log_error "Traffic switch verification failed"
        return 1
    fi
}

# Get external URL for the service
get_external_url() {
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        echo "https://maestro-staging.example.com"
    elif [[ "$ENVIRONMENT" == "production" ]]; then
        echo "https://maestro.example.com"
    else
        echo "http://localhost:4000"
    fi
}

# Monitor the deployment for stability
monitor_deployment() {
    log_info "Monitoring deployment stability for 2 minutes..."
    
    local monitor_duration=120
    local check_interval=10
    local checks=$((monitor_duration / check_interval))
    
    for ((i=1; i<=checks; i++)); do
        # Check pod health
        local ready_pods=$(kubectl get pods -n "$NAMESPACE" \
            --selector="app.kubernetes.io/name=maestro,environment=$NEXT_ENV" \
            --field-selector=status.phase=Running \
            -o json | jq '.items | length')
        
        local expected_pods=3
        
        if [[ "$ready_pods" -eq "$expected_pods" ]]; then
            log_info "Stability check $i/$checks: $ready_pods/$expected_pods pods ready ✓"
        else
            log_warning "Stability check $i/$checks: $ready_pods/$expected_pods pods ready"
        fi
        
        sleep $check_interval
    done
    
    log_success "Deployment monitoring completed successfully"
}

# Cleanup old environment (keep for rollback capability)
cleanup_old_environment() {
    if [[ "$PREVIOUS_ENV" != "none" ]]; then
        log_info "Keeping $PREVIOUS_ENV environment for rollback capability"
        log_info "Old environment will be cleaned up in the next deployment cycle"
    fi
}

# Rollback function
rollback() {
    log_error "Deployment failed, initiating rollback..."
    
    if [[ "$PREVIOUS_ENV" != "none" ]]; then
        log_info "Rolling back to $PREVIOUS_ENV environment..."
        
        # Switch service back to previous environment
        kubectl patch service "$SERVICE_NAME" \
            --namespace "$NAMESPACE" \
            --type='merge' \
            --patch="{\"spec\":{\"selector\":{\"environment\":\"$PREVIOUS_ENV\"}}}"
        
        # Delete the failed deployment
        helm uninstall "${RELEASE_NAME}-${NEXT_ENV}" --namespace "$NAMESPACE" || true
        
        log_success "Rollback completed"
    else
        log_warning "No previous environment to rollback to"
    fi
}

# Main deployment function
main() {
    log_info "Starting Blue/Green deployment for ${RELEASE_NAME}"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image: $IMAGE_TAG"
    
    # Trap errors for rollback
    trap 'rollback; exit 1' ERR
    
    check_prerequisites
    ensure_namespace
    determine_environments
    deploy_next_environment
    wait_for_deployment
    
    # Run validation tests
    if ! run_health_checks; then
        log_error "Health checks failed"
        exit 1
    fi
    
    if ! run_smoke_tests; then
        log_error "Smoke tests failed"
        exit 1
    fi
    
    # Switch traffic
    switch_traffic
    monitor_deployment
    cleanup_old_environment
    
    log_success "Blue/Green deployment completed successfully!"
    log_info "New environment: $NEXT_ENV"
    log_info "Service URL: $(get_external_url)"
    
    # Remove error trap on success
    trap - ERR
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi