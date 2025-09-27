#!/bin/bash

# Maestro Production Deployment Script
# Deploys the Maestro Orchestration System to production environment

set -euo pipefail

# Configuration
NAMESPACE="maestro-system"
KUBECTL_CONTEXT="${KUBECTL_CONTEXT:-prod-cluster}"
HELM_RELEASE_NAME="maestro"
CHART_PATH="charts/maestro"
VALUES_FILE="charts/maestro/values.yaml"
TIMEOUT="600s"

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

# Error handling
error_exit() {
    log_error "$1"
    exit 1
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
}
trap cleanup EXIT

# Pre-deployment checks
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is not installed or not in PATH"
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        error_exit "helm is not installed or not in PATH"
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info --context="${KUBECTL_CONTEXT}" &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster. Check your kubeconfig and context."
    fi
    
    # Verify we're deploying to the right cluster
    CURRENT_CONTEXT=$(kubectl config current-context)
    if [[ "${CURRENT_CONTEXT}" != *"prod"* ]] && [[ "${CURRENT_CONTEXT}" != *"production"* ]]; then
        log_warning "Current context '${CURRENT_CONTEXT}' doesn't appear to be production"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error_exit "Deployment cancelled"
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Validate configuration
validate_config() {
    log_info "Validating deployment configuration..."
    
    # Check if Helm chart exists
    if [[ ! -d "$CHART_PATH" ]]; then
        error_exit "Helm chart not found at $CHART_PATH"
    fi
    
    # Check if values file exists
    if [[ ! -f "$VALUES_FILE" ]]; then
        error_exit "Values file not found at $VALUES_FILE"
    fi
    
    # Validate Helm chart
    helm lint "$CHART_PATH" || error_exit "Helm chart validation failed"
    
    # Template and validate Kubernetes manifests
    log_info "Validating Kubernetes manifests..."
    helm template "$HELM_RELEASE_NAME" "$CHART_PATH" -f "$VALUES_FILE" --namespace "$NAMESPACE" | kubectl apply --dry-run=client -f - || error_exit "Manifest validation failed"
    
    log_success "Configuration validation passed"
}

# Create namespace if it doesn't exist
create_namespace() {
    log_info "Ensuring namespace '$NAMESPACE' exists..."
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Namespace '$NAMESPACE' already exists"
    else
        kubectl create namespace "$NAMESPACE"
        
        # Add security labels
        kubectl label namespace "$NAMESPACE" \
            pod-security.kubernetes.io/enforce=restricted \
            pod-security.kubernetes.io/audit=restricted \
            pod-security.kubernetes.io/warn=restricted
        
        log_success "Created namespace '$NAMESPACE'"
    fi
}

# Deploy configuration
deploy_config() {
    log_info "Deploying configuration resources..."
    
    # Apply ConfigMaps
    kubectl apply -f k8s/maestro-production-configmap.yaml
    log_success "Applied ConfigMaps"
    
    # Apply Secrets (these should be managed by external-secrets-operator in production)
    if [[ -f "k8s/maestro-production-secrets.yaml" ]]; then
        log_warning "Applying secrets from file - consider using external-secrets-operator for production"
        kubectl apply -f k8s/maestro-production-secrets.yaml
        log_success "Applied Secrets"
    fi
}

# Deploy using Helm
deploy_helm_chart() {
    log_info "Deploying Maestro using Helm..."
    
    # Check if release already exists
    if helm list -n "$NAMESPACE" | grep -q "$HELM_RELEASE_NAME"; then
        log_info "Upgrading existing Helm release..."
        helm upgrade "$HELM_RELEASE_NAME" "$CHART_PATH" \
            --namespace "$NAMESPACE" \
            --values "$VALUES_FILE" \
            --timeout "$TIMEOUT" \
            --wait \
            --atomic
    else
        log_info "Installing new Helm release..."
        helm install "$HELM_RELEASE_NAME" "$CHART_PATH" \
            --namespace "$NAMESPACE" \
            --create-namespace \
            --values "$VALUES_FILE" \
            --timeout "$TIMEOUT" \
            --wait \
            --atomic
    fi
    
    log_success "Helm deployment completed"
}

# Deploy raw Kubernetes manifests (alternative to Helm)
deploy_k8s_manifests() {
    log_info "Deploying Kubernetes manifests..."
    
    # Apply the main deployment manifest
    kubectl apply -f k8s/maestro-production-deployment.yaml
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/maestro-orchestrator -n "$NAMESPACE" --timeout="$TIMEOUT"
    
    log_success "Kubernetes manifests deployed"
}

# Health checks
run_health_checks() {
    log_info "Running post-deployment health checks..."
    
    # Check pod status
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=maestro
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=maestro -n "$NAMESPACE" --timeout="$TIMEOUT"
    
    # Check service status
    log_info "Checking service status..."
    kubectl get svc -n "$NAMESPACE"
    
    # Check ingress status
    log_info "Checking ingress status..."
    kubectl get ingress -n "$NAMESPACE"
    
    # Test health endpoints
    log_info "Testing health endpoints..."
    POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=maestro -o jsonpath='{.items[0].metadata.name}')
    
    if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- curl -f http://localhost:8080/healthz; then
        log_success "Health check endpoint is responding"
    else
        log_error "Health check endpoint is not responding"
        return 1
    fi
    
    if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- curl -f http://localhost:8080/readyz; then
        log_success "Readiness check endpoint is responding"
    else
        log_error "Readiness check endpoint is not responding"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Get service endpoint
    SERVICE_IP=$(kubectl get svc maestro-orchestrator-svc -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    
    # Test basic API connectivity
    POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=maestro -o jsonpath='{.items[0].metadata.name}')
    
    log_info "Testing API connectivity..."
    if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- curl -f "http://${SERVICE_IP}/healthz"; then
        log_success "API connectivity test passed"
    else
        log_error "API connectivity test failed"
        return 1
    fi
    
    # Test metrics endpoint
    log_info "Testing metrics endpoint..."
    if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- curl -f "http://${SERVICE_IP}:9090/metrics"; then
        log_success "Metrics endpoint test passed"
    else
        log_warning "Metrics endpoint test failed - this might be expected if metrics are restricted"
    fi
    
    log_success "Smoke tests completed"
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."
    
    REPORT_FILE="deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "=== Maestro Production Deployment Report ==="
        echo "Deployment Date: $(date)"
        echo "Namespace: $NAMESPACE"
        echo "Helm Release: $HELM_RELEASE_NAME"
        echo "Kubernetes Context: $KUBECTL_CONTEXT"
        echo ""
        
        echo "=== Deployment Status ==="
        kubectl get all -n "$NAMESPACE"
        echo ""
        
        echo "=== Pod Logs (last 10 lines) ==="
        kubectl logs -n "$NAMESPACE" -l app.kubernetes.io/name=maestro --tail=10
        echo ""
        
        echo "=== Resource Usage ==="
        kubectl top pods -n "$NAMESPACE" 2>/dev/null || echo "Metrics server not available"
        echo ""
        
        echo "=== ConfigMaps ==="
        kubectl get configmaps -n "$NAMESPACE"
        echo ""
        
        echo "=== Secrets ==="
        kubectl get secrets -n "$NAMESPACE"
        echo ""
        
        echo "=== Network Policies ==="
        kubectl get networkpolicies -n "$NAMESPACE" 2>/dev/null || echo "No network policies found"
        echo ""
        
        echo "=== Ingress ==="
        kubectl get ingress -n "$NAMESPACE"
        echo ""
        
        echo "=== Events ==="
        kubectl get events -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp | tail -20
        
    } > "$REPORT_FILE"
    
    log_success "Deployment report generated: $REPORT_FILE"
}

# Main deployment function
main() {
    log_info "Starting Maestro Production Deployment"
    log_info "Target namespace: $NAMESPACE"
    log_info "Kubernetes context: $KUBECTL_CONTEXT"
    
    # Run all deployment steps
    check_prerequisites
    validate_config
    create_namespace
    deploy_config
    
    # Choose deployment method
    if [[ "${USE_HELM:-true}" == "true" ]]; then
        deploy_helm_chart
    else
        deploy_k8s_manifests
    fi
    
    run_health_checks
    run_smoke_tests
    generate_report
    
    log_success "Maestro Production Deployment completed successfully!"
    log_info "Access the service via: https://maestro.intelgraph.ai"
    log_info "Monitoring dashboard: https://grafana.intelgraph.ai/d/maestro"
    log_info "Check logs with: kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=maestro -f"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "check")
        check_prerequisites
        validate_config
        ;;
    "health")
        run_health_checks
        ;;
    "smoke")
        run_smoke_tests
        ;;
    "report")
        generate_report
        ;;
    "rollback")
        log_info "Rolling back Maestro deployment..."
        helm rollback "$HELM_RELEASE_NAME" -n "$NAMESPACE"
        log_success "Rollback completed"
        ;;
    "status")
        log_info "Checking deployment status..."
        kubectl get all -n "$NAMESPACE"
        helm status "$HELM_RELEASE_NAME" -n "$NAMESPACE"
        ;;
    *)
        echo "Usage: $0 {deploy|check|health|smoke|report|rollback|status}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (default)"
        echo "  check    - Validate prerequisites and config"
        echo "  health   - Run health checks"
        echo "  smoke    - Run smoke tests"
        echo "  report   - Generate deployment report"
        echo "  rollback - Rollback to previous version"
        echo "  status   - Show deployment status"
        exit 1
        ;;
esac