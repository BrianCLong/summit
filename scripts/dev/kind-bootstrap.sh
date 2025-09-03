#!/bin/bash
set -euo pipefail

# scripts/dev/kind-bootstrap.sh
# One-shot kind cluster setup for reproducible dev environment

CLUSTER_NAME="${CLUSTER_NAME:-intelgraph-dev}"
K8S_VERSION="${K8S_VERSION:-v1.29.0}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { printf "${BLUE}[kind-bootstrap]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
error() { printf "${RED}[ERROR]${NC} %s\n" "$*"; exit 1; }
success() { printf "${GREEN}[SUCCESS]${NC} %s\n" "$*"; }

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    for cmd in kind kubectl docker helm; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            error "$cmd is required but not installed"
        fi
    done
    
    success "All dependencies found"
}

# Create kind config
create_kind_config() {
    log "Creating kind cluster config..."
    
    cat > /tmp/kind-config.yaml << EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ${CLUSTER_NAME}
nodes:
  - role: control-plane
    image: kindest/node:${K8S_VERSION}
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
  - role: worker
    image: kindest/node:${K8S_VERSION}
  - role: worker
    image: kindest/node:${K8S_VERSION}
EOF
}

# Create kind cluster
create_cluster() {
    log "Creating kind cluster: ${CLUSTER_NAME}..."
    
    if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
        warn "Cluster ${CLUSTER_NAME} already exists"
        read -p "Delete and recreate? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kind delete cluster --name "${CLUSTER_NAME}"
        else
            log "Using existing cluster"
            return 0
        fi
    fi
    
    kind create cluster --config /tmp/kind-config.yaml --wait 5m
    success "Kind cluster created"
}

# Install NGINX Ingress
install_nginx_ingress() {
    log "Installing NGINX Ingress Controller..."
    
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    
    log "Waiting for NGINX Ingress to be ready..."
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=90s
    
    success "NGINX Ingress installed"
}

# Install Prometheus Operator
install_prometheus_stack() {
    log "Installing kube-prometheus-stack..."
    
    # Add helm repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Install prometheus stack
    helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
        --set prometheus.prometheusSpec.ruleSelectorNilUsesHelmValues=false \
        --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
        --wait
    
    success "Prometheus stack installed"
}

# Install Gatekeeper
install_gatekeeper() {
    log "Installing OPA Gatekeeper..."
    
    kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
    
    log "Waiting for Gatekeeper to be ready..."
    kubectl wait --for=condition=ready pod -l gatekeeper.sh/system=yes -n gatekeeper-system --timeout=180s
    
    success "Gatekeeper installed"
}

# Install Argo Rollouts
install_argo_rollouts() {
    log "Installing Argo Rollouts..."
    
    kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f -
    kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
    
    log "Waiting for Argo Rollouts to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argo-rollouts -n argo-rollouts --timeout=120s
    
    success "Argo Rollouts installed"
}

# Deploy blackbox exporter
deploy_blackbox_exporter() {
    log "Deploying Blackbox Exporter..."
    
    if [[ -f "deploy/k8s/blackbox-exporter.yaml" ]]; then
        kubectl apply -f deploy/k8s/blackbox-exporter.yaml
        kubectl wait --for=condition=ready pod -l app=blackbox-exporter -n monitoring --timeout=120s
        success "Blackbox Exporter deployed"
    else
        warn "Blackbox exporter manifest not found, skipping"
    fi
}

# Create namespaces
create_namespaces() {
    log "Creating application namespaces..."
    
    kubectl create namespace intelgraph-prod --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace intelgraph-dev --dry-run=client -o yaml | kubectl apply -f -
    
    success "Application namespaces created"
}

# Install kubectl argo rollouts plugin if not exists
install_argo_rollouts_plugin() {
    if ! kubectl argo rollouts version >/dev/null 2>&1; then
        log "Installing kubectl argo rollouts plugin..."
        
        # Download and install the plugin
        curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/amd64/')
        chmod +x kubectl-argo-rollouts-*
        sudo mv kubectl-argo-rollouts-* /usr/local/bin/kubectl-argo-rollouts
        
        success "kubectl argo rollouts plugin installed"
    else
        log "kubectl argo rollouts plugin already installed"
    fi
}

# Print cluster info
print_cluster_info() {
    log "Cluster setup complete!"
    echo ""
    echo "Cluster Info:"
    echo "  Name: ${CLUSTER_NAME}"
    echo "  Kubeconfig: $(kubectl config current-context)"
    echo ""
    echo "Installed Components:"
    echo "  ✅ NGINX Ingress Controller"
    echo "  ✅ Prometheus + Grafana Stack"
    echo "  ✅ OPA Gatekeeper"
    echo "  ✅ Argo Rollouts"
    echo "  ✅ Blackbox Exporter"
    echo ""
    echo "Access Services:"
    echo "  Grafana: kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80"
    echo "  Prometheus: kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090"
    echo ""
    echo "Next Steps:"
    echo "  1. Deploy your application: make deploy-dev"
    echo "  2. Run preflight checks: make preflight"
    echo "  3. Test rollout: kubectl apply -f deploy/argo/"
}

# Main execution
main() {
    log "Starting kind bootstrap for IntelGraph dev environment..."
    
    check_dependencies
    create_kind_config
    create_cluster
    
    log "Installing core components..."
    install_nginx_ingress
    install_prometheus_stack
    install_gatekeeper
    install_argo_rollouts
    install_argo_rollouts_plugin
    
    create_namespaces
    deploy_blackbox_exporter
    
    print_cluster_info
}

# Handle cleanup on exit
cleanup() {
    rm -f /tmp/kind-config.yaml
}
trap cleanup EXIT

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi