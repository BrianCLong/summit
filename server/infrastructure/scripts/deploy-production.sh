#!/usr/bin/env bash
# =============================================================================
# Summit v4.0 - Production Deployment Script
# =============================================================================
set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-west-2}"
EKS_CLUSTER_NAME="${EKS_CLUSTER_NAME:-summit-production}"
KUBERNETES_NAMESPACE="${KUBERNETES_NAMESPACE:-summit}"
ECR_REPOSITORY="${ECR_REPOSITORY:-summit/server}"
VERSION="${VERSION:-v4.0.0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   Summit v4.0 - Production Deployment                         ║"
    echo "║                                                               ║"
    echo "║   AI-Assisted Governance | Cross-Domain Compliance            ║"
    echo "║   Zero-Trust Security Evolution                               ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed"
        exit 1
    fi

    # Check Helm
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured"
        exit 1
    fi

    log_success "All prerequisites met"
}

# Initialize Terraform
init_terraform() {
    log_info "Initializing Terraform..."
    cd infrastructure/terraform

    terraform init \
        -backend-config="bucket=summit-terraform-state" \
        -backend-config="key=production/terraform.tfstate" \
        -backend-config="region=${AWS_REGION}" \
        -backend-config="encrypt=true" \
        -backend-config="dynamodb_table=summit-terraform-locks"

    cd ../..
    log_success "Terraform initialized"
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    cd infrastructure/terraform

    terraform plan \
        -var="environment=production" \
        -out=tfplan

    echo ""
    read -p "Review the plan above. Proceed with apply? (y/N) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform apply tfplan
        log_success "Infrastructure deployed"
    else
        log_warn "Infrastructure deployment cancelled"
        exit 0
    fi

    cd ../..
}

# Configure kubectl
configure_kubectl() {
    log_info "Configuring kubectl for EKS cluster..."

    aws eks update-kubeconfig \
        --region "${AWS_REGION}" \
        --name "${EKS_CLUSTER_NAME}"

    # Verify connection
    if kubectl cluster-info &> /dev/null; then
        log_success "kubectl configured and connected to cluster"
    else
        log_error "Failed to connect to EKS cluster"
        exit 1
    fi
}

# Install cluster prerequisites
install_prerequisites() {
    log_info "Installing cluster prerequisites..."

    # Install NGINX Ingress Controller
    log_info "Installing NGINX Ingress Controller..."
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --set controller.metrics.enabled=true \
        --wait

    # Install cert-manager
    log_info "Installing cert-manager..."
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --set installCRDs=true \
        --wait

    # Install external-secrets-operator
    log_info "Installing external-secrets-operator..."
    helm repo add external-secrets https://charts.external-secrets.io
    helm repo update
    helm upgrade --install external-secrets external-secrets/external-secrets \
        --namespace external-secrets \
        --create-namespace \
        --wait

    # Install Prometheus stack
    log_info "Installing Prometheus stack..."
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --set prometheus.prometheusSpec.retention=30d \
        --set grafana.enabled=true \
        --wait

    log_success "Cluster prerequisites installed"
}

# Deploy application
deploy_application() {
    log_info "Deploying Summit v4.0 application..."

    # Get ECR registry URL
    ECR_REGISTRY=$(aws ecr describe-repositories \
        --repository-names "${ECR_REPOSITORY}" \
        --query 'repositories[0].repositoryUri' \
        --output text | cut -d'/' -f1)

    # Apply Kubernetes manifests
    log_info "Applying Kubernetes manifests..."
    kubectl apply -f infrastructure/kubernetes/base/namespace.yaml
    kubectl apply -f infrastructure/kubernetes/base/configmap.yaml
    kubectl apply -f infrastructure/kubernetes/base/secrets.yaml
    kubectl apply -f infrastructure/kubernetes/base/database.yaml
    kubectl apply -f infrastructure/kubernetes/base/api-deployment.yaml
    kubectl apply -f infrastructure/kubernetes/base/ingress.yaml

    # Update deployment with correct image
    log_info "Updating deployment image to ${VERSION}..."
    kubectl set image deployment/summit-api \
        summit-api="${ECR_REGISTRY}/${ECR_REPOSITORY}:${VERSION}" \
        -n "${KUBERNETES_NAMESPACE}"

    # Wait for rollout
    log_info "Waiting for deployment rollout..."
    kubectl rollout status deployment/summit-api \
        -n "${KUBERNETES_NAMESPACE}" \
        --timeout=600s

    log_success "Application deployed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    # Check pod status
    log_info "Checking pod status..."
    kubectl get pods -l app=summit-api -n "${KUBERNETES_NAMESPACE}"

    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod \
        -l app=summit-api \
        -n "${KUBERNETES_NAMESPACE}" \
        --timeout=300s

    # Check deployment
    log_info "Deployment details:"
    kubectl get deployment summit-api -n "${KUBERNETES_NAMESPACE}"

    # Check services
    log_info "Service details:"
    kubectl get svc -n "${KUBERNETES_NAMESPACE}"

    # Check ingress
    log_info "Ingress details:"
    kubectl get ingress -n "${KUBERNETES_NAMESPACE}"

    # Run health check
    log_info "Running health check..."
    INGRESS_IP=$(kubectl get ingress summit-api -n "${KUBERNETES_NAMESPACE}" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

    if [ -n "${INGRESS_IP}" ]; then
        for i in {1..10}; do
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                "http://${INGRESS_IP}/health/ready" 2>/dev/null || echo "000")

            if [ "${HTTP_STATUS}" = "200" ]; then
                log_success "Health check passed!"
                break
            fi
            log_info "Attempt $i: HTTP Status ${HTTP_STATUS}, retrying in 10s..."
            sleep 10
        done
    else
        log_warn "Ingress IP not yet available. DNS propagation may still be in progress."
    fi

    log_success "Deployment verification complete"
}

# Print deployment summary
print_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  DEPLOYMENT COMPLETE                          ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Deployment Summary:${NC}"
    echo "  Version:     ${VERSION}"
    echo "  Cluster:     ${EKS_CLUSTER_NAME}"
    echo "  Namespace:   ${KUBERNETES_NAMESPACE}"
    echo "  Region:      ${AWS_REGION}"
    echo ""
    echo -e "${BLUE}Endpoints:${NC}"
    echo "  API:         https://api.summit.io"
    echo "  Metrics:     https://api.summit.io/metrics"
    echo "  Health:      https://api.summit.io/health"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Verify DNS propagation for api.summit.io"
    echo "  2. Check Grafana dashboards for metrics"
    echo "  3. Monitor application logs with: kubectl logs -f -l app=summit-api -n ${KUBERNETES_NAMESPACE}"
    echo "  4. Review deployment in AWS Console"
    echo ""
}

# Rollback deployment
rollback() {
    log_warn "Rolling back deployment..."

    kubectl rollout undo deployment/summit-api -n "${KUBERNETES_NAMESPACE}"
    kubectl rollout status deployment/summit-api -n "${KUBERNETES_NAMESPACE}" --timeout=300s

    log_success "Rollback complete"
}

# Show help
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy      Full deployment (infrastructure + application)"
    echo "  infra       Deploy infrastructure only"
    echo "  app         Deploy application only"
    echo "  verify      Verify deployment health"
    echo "  rollback    Rollback to previous deployment"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  AWS_REGION          AWS region (default: us-west-2)"
    echo "  EKS_CLUSTER_NAME    EKS cluster name (default: summit-production)"
    echo "  VERSION             Version to deploy (default: v4.0.0)"
}

# Main
main() {
    print_banner

    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            init_terraform
            deploy_infrastructure
            configure_kubectl
            install_prerequisites
            deploy_application
            verify_deployment
            print_summary
            ;;
        infra)
            check_prerequisites
            init_terraform
            deploy_infrastructure
            ;;
        app)
            check_prerequisites
            configure_kubectl
            deploy_application
            verify_deployment
            print_summary
            ;;
        verify)
            check_prerequisites
            configure_kubectl
            verify_deployment
            ;;
        rollback)
            check_prerequisites
            configure_kubectl
            rollback
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
