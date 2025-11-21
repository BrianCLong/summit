#!/usr/bin/env bash
# Bootstrap Free Stack: Dev → Staging → Prod at Zero Cost
# Single VM + k3s + vclusters + ArgoCD + Cloudflare Tunnel

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
echo -e "${PURPLE}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                🚀 FREE STACK BOOTSTRAP 🚀                        ║
║          Dev → Staging → Prod at $0 Cost                        ║
║       Single VM + k3s + vclusters + ArgoCD                      ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
REPO_URL="${1:-https://github.com/brianclong/intelgraph}"
BRANCH="${2:-main}"
ROOT_DOMAIN="${ROOT_DOMAIN:-intelgraph.io}"

echo -e "${BLUE}Configuration:${NC}"
echo -e "${CYAN}  Repository: ${REPO_URL}${NC}"
echo -e "${CYAN}  Branch: ${BRANCH}${NC}"
echo -e "${CYAN}  Domain: ${ROOT_DOMAIN}${NC}"
echo ""

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $*${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARN: $*${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $*${NC}"
    exit 1
}

# Prerequisites check
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if running as root or sudo
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
    
    # Check available memory (need at least 4GB for vclusters)
    MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $MEMORY_GB -lt 4 ]]; then
        warn "System has ${MEMORY_GB}GB RAM. Recommended: 4GB+ for optimal performance"
    fi
    
    # Check available disk space (need at least 20GB)
    DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $DISK_GB -lt 20 ]]; then
        warn "Available disk space: ${DISK_GB}GB. Recommended: 20GB+ for container images"
    fi
    
    # Install required tools
    local tools_needed=()
    command -v curl >/dev/null || tools_needed+=("curl")
    command -v wget >/dev/null || tools_needed+=("wget")
    command -v git >/dev/null || tools_needed+=("git")
    command -v jq >/dev/null || tools_needed+=("jq")
    
    if [[ ${#tools_needed[@]} -gt 0 ]]; then
        log "Installing required tools: ${tools_needed[*]}"
        
        # Detect package manager and install
        if command -v dnf >/dev/null; then
            dnf update -y && dnf install -y "${tools_needed[@]}"
        elif command -v yum >/dev/null; then
            yum update -y && yum install -y "${tools_needed[@]}"
        elif command -v apt-get >/dev/null; then
            apt-get update -y && apt-get install -y "${tools_needed[@]}"
        elif command -v apk >/dev/null; then
            apk update && apk add "${tools_needed[@]}"
        else
            error "Unable to detect package manager. Please install: ${tools_needed[*]}"
        fi
    fi
    
    log "✅ Prerequisites satisfied"
}

# Install k3s with optimized settings
install_k3s() {
    log "🎯 Installing k3s (lightweight Kubernetes)..."
    
    if command -v k3s >/dev/null 2>&1; then
        log "k3s already installed, skipping..."
        return
    fi
    
    # Install k3s with optimized configuration
    curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=stable sh -s - server \
        --write-kubeconfig-mode 644 \
        --disable traefik \
        --disable servicelb \
        --disable local-storage \
        --flannel-backend=host-gw \
        --kube-apiserver-arg="feature-gates=EphemeralContainers=true" \
        --kubelet-arg="feature-gates=EphemeralContainers=true" \
        --kubelet-arg="max-pods=110" \
        --kube-controller-manager-arg="bind-address=0.0.0.0" \
        --kube-scheduler-arg="bind-address=0.0.0.0" \
        --etcd-expose-metrics=true
    
    # Wait for k3s to be ready
    log "⏳ Waiting for k3s to be ready..."
    local retries=0
    while ! kubectl get nodes >/dev/null 2>&1; do
        if [[ $retries -ge 30 ]]; then
            error "k3s failed to start after 5 minutes"
        fi
        sleep 10
        retries=$((retries + 1))
    done
    
    log "✅ k3s installed and ready"
    
    # Export kubeconfig for convenience
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
    cp /etc/rancher/k3s/k3s.yaml /root/kubeconfig-host.yaml
    chmod 600 /root/kubeconfig-host.yaml
}

# Install vcluster CLI
install_vcluster() {
    log "🏗️ Installing vcluster CLI..."
    
    if command -v vcluster >/dev/null 2>&1; then
        log "vcluster already installed, skipping..."
        return
    fi
    
    # Download and install vcluster CLI
    ARCH=$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/')
    curl -L -o vcluster "https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-linux-${ARCH}"
    chmod +x vcluster
    mv vcluster /usr/local/bin/
    
    log "✅ vcluster CLI installed"
}

# Create virtual clusters for dev, staging, prod
create_vclusters() {
    log "🎭 Creating virtual clusters (dev, staging, prod)..."
    
    local envs=("dev" "staging" "prod")
    
    for env in "${envs[@]}"; do
        log "Creating vcluster: ${env}"
        
        # Create namespace for vcluster
        kubectl create namespace "vcluster-${env}" --dry-run=client -o yaml | kubectl apply -f -
        
        # Create vcluster with resource limits appropriate for free tier
        vcluster create "${env}" \
            --namespace "vcluster-${env}" \
            --set "syncer.resources.requests.cpu=50m" \
            --set "syncer.resources.requests.memory=128Mi" \
            --set "syncer.resources.limits.cpu=200m" \
            --set "syncer.resources.limits.memory=256Mi" \
            --set "vcluster.resources.requests.cpu=50m" \
            --set "vcluster.resources.requests.memory=128Mi" \
            --set "vcluster.resources.limits.cpu=200m" \
            --set "vcluster.resources.limits.memory=256Mi" \
            --set "enableHA=false" \
            --set "isolation.enabled=true" \
            --wait
        
        # Generate kubeconfig for this vcluster
        vcluster connect "${env}" --namespace "vcluster-${env}" --update-current=false --print > "/root/kubeconfig-${env}.yaml"
        
        log "✅ vcluster '${env}' created"
    done
    
    # List all vclusters
    log "📋 Virtual clusters created:"
    vcluster list
}

# Install ArgoCD in each vcluster
install_argocd() {
    log "🔄 Installing ArgoCD in each virtual cluster..."
    
    local envs=("dev" "staging" "prod")
    
    for env in "${envs[@]}"; do
        log "Installing ArgoCD in ${env} environment..."
        
        # Switch to vcluster context
        export KUBECONFIG="/root/kubeconfig-${env}.yaml"
        
        # Create ArgoCD namespace
        kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
        
        # Install ArgoCD with minimal resources for free tier
        kubectl apply -n argocd -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
metadata:
  name: argocd
  namespace: argocd
spec:
  server:
    insecure: true
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
  controller:
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
  repoServer:
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
  redis:
    resources:
      requests:
        cpu: 25m
        memory: 64Mi
      limits:
        cpu: 100m
        memory: 128Mi
  dex:
    resources:
      requests:
        cpu: 25m
        memory: 32Mi
      limits:
        cpu: 100m
        memory: 64Mi
EOF
        
        # Wait for ArgoCD to be ready
        kubectl wait --for=condition=ready pods -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s
        
        # Get ArgoCD admin password
        local admin_password=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
        echo "${admin_password}" > "/root/argocd-${env}-password.txt"
        
        log "✅ ArgoCD installed in ${env} (admin password saved to /root/argocd-${env}-password.txt)"
    done
    
    # Reset kubeconfig
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
}

# Create app-of-apps pattern for each environment
create_app_of_apps() {
    log "📱 Creating app-of-apps pattern for GitOps..."
    
    local envs=("dev" "staging" "prod")
    
    for env in "${envs[@]}"; do
        log "Creating app-of-apps for ${env}..."
        
        # Switch to vcluster context
        export KUBECONFIG="/root/kubeconfig-${env}.yaml"
        
        # Create the main application that manages all other apps
        kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${env}-apps
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: ${REPO_URL}
    targetRevision: ${BRANCH}
    path: deploy/environments/${env}
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
EOF
        
        log "✅ App-of-apps created for ${env}"
    done
    
    # Reset kubeconfig
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
}

# Create sample manifests directory structure
create_sample_manifests() {
    log "📁 Creating sample manifests structure..."
    
    local repo_dir="/tmp/intelgraph-bootstrap"
    
    # Clone the repo to add manifest structure
    if [[ -d "$repo_dir" ]]; then
        rm -rf "$repo_dir"
    fi
    
    # Create sample structure locally
    mkdir -p "$repo_dir/deploy/environments"/{dev,staging,prod}
    
    # Base kustomization for each environment
    local envs=("dev" "staging" "prod")
    local ports=(8080 8081 8082)
    
    for i in "${!envs[@]}"; do
        local env="${envs[i]}"
        local port="${ports[i]}"
        local replicas=$((i + 1))  # dev=1, staging=2, prod=3
        
        # Create kustomization.yaml
        cat > "$repo_dir/deploy/environments/${env}/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  - target:
      kind: Deployment
      name: maestro
    patch: |-
      - op: replace
        path: /spec/replicas
        value: ${replicas}
      - op: replace
        path: /spec/template/spec/containers/0/env/0/value
        value: "${env}"

  - target:
      kind: Service
      name: maestro
    patch: |-
      - op: replace
        path: /spec/ports/0/nodePort
        value: ${port}

  - target:
      kind: Ingress
      name: maestro
    patch: |-
      - op: replace
        path: /spec/rules/0/host
        value: "${env}.${ROOT_DOMAIN}"
EOF
    done
    
    # Create base manifests
    mkdir -p "$repo_dir/deploy/base"
    
    cat > "$repo_dir/deploy/base/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml

commonLabels:
  app: maestro
  version: v1.0.0
EOF
    
    cat > "$repo_dir/deploy/base/deployment.yaml" <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maestro
spec:
  replicas: 1
  selector:
    matchLabels:
      app: maestro
  template:
    metadata:
      labels:
        app: maestro
    spec:
      containers:
      - name: maestro
        image: ghcr.io/brianclong/intelgraph:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "development"
        - name: PORT
          value: "8080"
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
EOF
    
    cat > "$repo_dir/deploy/base/service.yaml" <<EOF
apiVersion: v1
kind: Service
metadata:
  name: maestro
spec:
  selector:
    app: maestro
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080
  type: NodePort
EOF
    
    cat > "$repo_dir/deploy/base/ingress.yaml" <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: maestro
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - dev.${ROOT_DOMAIN}
    secretName: maestro-tls
  rules:
  - host: dev.${ROOT_DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: maestro
            port:
              number: 80
EOF
    
    log "✅ Sample manifests structure created at ${repo_dir}"
    log "📝 Copy the deploy/ directory to your repository: ${REPO_URL}"
}

# Install NGINX Ingress Controller
install_nginx_ingress() {
    log "🌐 Installing NGINX Ingress Controller..."
    
    # Install NGINX Ingress with minimal resources
    kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx
---
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: nginx-ingress
  namespace: kube-system
spec:
  chart: https://kubernetes.github.io/ingress-nginx/charts/ingress-nginx-4.7.1.tgz
  targetNamespace: ingress-nginx
  valuesContent: |-
    controller:
      replicaCount: 1
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi
      service:
        type: NodePort
        nodePorts:
          http: 30080
          https: 30443
EOF
    
    log "✅ NGINX Ingress Controller installed"
}

# Install cert-manager for free TLS certificates
install_cert_manager() {
    log "🔒 Installing cert-manager for free TLS certificates..."
    
    # Install cert-manager
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=ready pods -l app=cert-manager -n cert-manager --timeout=300s
    
    # Create Let's Encrypt cluster issuer
    kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@${ROOT_DOMAIN}
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    log "✅ cert-manager installed with Let's Encrypt"
}

# Setup Cloudflare Tunnel (optional but recommended)
setup_cloudflare_tunnel() {
    log "☁️ Setting up Cloudflare Tunnel configuration..."
    
    # Download cloudflared
    ARCH=$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/')
    if [[ "$ARCH" == "amd64" ]]; then
        curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" -o /usr/local/bin/cloudflared
    else
        curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" -o /usr/local/bin/cloudflared
    fi
    chmod +x /usr/local/bin/cloudflared
    
    # Create tunnel configuration directory
    mkdir -p /etc/cloudflared
    
    # Create sample tunnel configuration
    cat > /etc/cloudflared/config-sample.yml <<EOF
# Cloudflare Tunnel Configuration
# Run: cloudflared tunnel login
# Run: cloudflared tunnel create maestro-free
# Update tunnel ID below, then run: systemctl enable --now cloudflared

tunnel: YOUR_TUNNEL_ID
credentials-file: /etc/cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: dev.${ROOT_DOMAIN}
    service: http://127.0.0.1:30080
  - hostname: staging.${ROOT_DOMAIN}
    service: http://127.0.0.1:30081
  - hostname: prod.${ROOT_DOMAIN}
    service: http://127.0.0.1:30082
  - service: http_status:404

EOF
    
    # Create systemd service
    cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    
    log "✅ Cloudflare Tunnel configured (manual setup required)"
    log "📝 Follow these steps to activate:"
    log "   1. cloudflared tunnel login"
    log "   2. cloudflared tunnel create maestro-free"
    log "   3. Update /etc/cloudflared/config-sample.yml with your tunnel ID"
    log "   4. Rename to /etc/cloudflared/config.yml"
    log "   5. systemctl enable --now cloudflared"
}

# Create helper scripts for management
create_helper_scripts() {
    log "🛠️ Creating helper scripts..."
    
    # Create environment switch script
    cat > /usr/local/bin/kube-env <<'EOF'
#!/bin/bash
# Switch kubectl context between environments
ENV="${1:-host}"

case "$ENV" in
    dev|d)
        export KUBECONFIG="/root/kubeconfig-dev.yaml"
        echo "Switched to DEV environment"
        ;;
    staging|stg|s)
        export KUBECONFIG="/root/kubeconfig-staging.yaml"
        echo "Switched to STAGING environment"
        ;;
    production|prod|p)
        export KUBECONFIG="/root/kubeconfig-prod.yaml"
        echo "Switched to PRODUCTION environment"
        ;;
    host|h)
        export KUBECONFIG="/root/kubeconfig-host.yaml"
        echo "Switched to HOST environment"
        ;;
    *)
        echo "Usage: kube-env [dev|staging|prod|host]"
        exit 1
        ;;
esac

# Also set for current shell
exec bash
EOF
    chmod +x /usr/local/bin/kube-env
    
    # Create monitoring script
    cat > /usr/local/bin/monitor-stack <<'EOF'
#!/bin/bash
# Monitor the entire stack

echo "🖥️  Host Cluster Status:"
KUBECONFIG="/root/kubeconfig-host.yaml" kubectl get nodes,pods -A

echo -e "\n📊 vCluster Status:"
vcluster list

echo -e "\n🎭 Environment Status:"
for env in dev staging prod; do
    echo "--- $env Environment ---"
    KUBECONFIG="/root/kubeconfig-${env}.yaml" kubectl get pods,svc,ingress 2>/dev/null || echo "Not accessible"
done

echo -e "\n🔄 ArgoCD Applications:"
for env in dev staging prod; do
    echo "--- $env ArgoCD ---"
    KUBECONFIG="/root/kubeconfig-${env}.yaml" kubectl get applications -n argocd 2>/dev/null || echo "Not accessible"
done

echo -e "\n💾 Resource Usage:"
free -h
df -h /
EOF
    chmod +x /usr/local/bin/monitor-stack
    
    # Create port-forward helper
    cat > /usr/local/bin/argocd-ui <<'EOF'
#!/bin/bash
# Access ArgoCD UI for each environment
ENV="${1:-dev}"

if [[ ! -f "/root/kubeconfig-${ENV}.yaml" ]]; then
    echo "Environment $ENV not found"
    exit 1
fi

PORT=$((8080 + $(echo "$ENV" | wc -c)))
case "$ENV" in
    dev) PORT=8080 ;;
    staging) PORT=8081 ;;
    prod) PORT=8082 ;;
esac

echo "Starting ArgoCD UI for $ENV on http://localhost:$PORT"
echo "Username: admin"
echo "Password: $(cat /root/argocd-${ENV}-password.txt 2>/dev/null || echo 'Check /root/argocd-'${ENV}'-password.txt')"
echo ""
echo "Press Ctrl+C to stop"

KUBECONFIG="/root/kubeconfig-${ENV}.yaml" kubectl port-forward -n argocd svc/argocd-server $PORT:80
EOF
    chmod +x /usr/local/bin/argocd-ui
    
    log "✅ Helper scripts created:"
    log "   • kube-env [dev|staging|prod|host] - Switch kubectl context"
    log "   • monitor-stack - Monitor entire stack"
    log "   • argocd-ui [dev|staging|prod] - Access ArgoCD UI"
}

# Display final status and next steps
show_final_status() {
    log "🎉 Free Stack Bootstrap Complete!"
    
    echo -e "\n${GREEN}📊 DEPLOYMENT SUMMARY${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    
    # Show vcluster status
    echo -e "${CYAN}Virtual Clusters:${NC}"
    vcluster list 2>/dev/null || echo "  Unable to list vclusters"
    
    # Show resource usage
    echo -e "\n${CYAN}Resource Usage:${NC}"
    echo "  Memory: $(free -h | awk '/^Mem:/{print $3 "/" $2}')"
    echo "  Disk: $(df -h / | awk 'NR==2{print $3 "/" $2 " (" $5 " used)"}')"
    
    # Show access information
    echo -e "\n${CYAN}Environment Access:${NC}"
    echo -e "  🌐 Dev:        dev.${ROOT_DOMAIN} (NodePort: 30080)"
    echo -e "  🌐 Staging:    staging.${ROOT_DOMAIN} (NodePort: 30081)"  
    echo -e "  🌐 Production: prod.${ROOT_DOMAIN} (NodePort: 30082)"
    
    echo -e "\n${CYAN}ArgoCD Access:${NC}"
    echo "  Dev:        argocd-ui dev"
    echo "  Staging:    argocd-ui staging"
    echo "  Production: argocd-ui prod"
    
    echo -e "\n${CYAN}Management Commands:${NC}"
    echo "  Switch context:    kube-env [dev|staging|prod|host]"
    echo "  Monitor stack:     monitor-stack"
    echo "  List vclusters:    vcluster list"
    
    echo -e "\n${YELLOW}⚠️  NEXT STEPS TO GO LIVE:${NC}"
    echo "1. 📁 Copy sample manifests to your repo:"
    echo "   cp -r /tmp/intelgraph-bootstrap/deploy/ /path/to/your/repo/"
    echo ""
    echo "2. ☁️  Setup Cloudflare Tunnel (recommended for public access):"
    echo "   cloudflared tunnel login"
    echo "   cloudflared tunnel create maestro-free"
    echo "   # Update /etc/cloudflared/config-sample.yml"
    echo "   systemctl enable --now cloudflared"
    echo ""
    echo "3. 🔧 Or open firewall ports for direct access:"
    echo "   ufw allow 30080:30082/tcp  # For NodePort access"
    echo ""
    echo "4. 🚀 Push your manifests and watch ArgoCD sync!"
    echo ""
    echo "5. 🧰 Layer in the $0 IaC/GitOps stack that fits your needs:"
    echo "   - Option A (minimal): OpenTofu + Ansible for IaC/config, Cluster Autoscaler,"
    echo "     Prometheus + Alertmanager + Grafana OSS + Loki, and the Prometheus"
    echo "     blackbox_exporter for uptime."
    echo "   - Option B (GitOps control plane): Crossplane, Argo CD or Flux CD,"
    echo "     Prometheus + Grafana OSS + Alertmanager with Grafana Mimir/Tempo,"
    echo "     OpenTelemetry Collector, and KEDA for event-driven autoscaling."
    echo "   - Full component tables live in deploy/zero-cost-stacks.md (same repo)."

    echo -e "\n${GREEN}🎯 Your $0-cost dev/staging/prod environment is LIVE!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    
    # Save configuration summary
    cat > /root/free-stack-info.txt <<EOF
# Free Stack Configuration Summary
Repository: ${REPO_URL}
Branch: ${BRANCH}
Domain: ${ROOT_DOMAIN}

# Environment URLs
Dev: dev.${ROOT_DOMAIN}:30080
Staging: staging.${ROOT_DOMAIN}:30081
Production: prod.${ROOT_DOMAIN}:30082

# Kubeconfig Files
Host: /root/kubeconfig-host.yaml
Dev: /root/kubeconfig-dev.yaml
Staging: /root/kubeconfig-staging.yaml
Production: /root/kubeconfig-prod.yaml

# ArgoCD Passwords
Dev: /root/argocd-dev-password.txt
Staging: /root/argocd-staging-password.txt  
Production: /root/argocd-prod-password.txt

# Helper Commands
kube-env [dev|staging|prod|host]
monitor-stack
argocd-ui [dev|staging|prod]

# Reference Docs
Zero-cost stack options: deploy/zero-cost-stacks.md
EOF
    
    log "📄 Configuration saved to /root/free-stack-info.txt"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    log "🚀 Starting Free Stack Bootstrap..."
    log "Target: Dev → Staging → Prod environments at $0 cost"
    
    check_prerequisites
    install_k3s
    install_vcluster
    create_vclusters
    install_argocd
    create_app_of_apps
    create_sample_manifests
    install_nginx_ingress
    install_cert_manager
    setup_cloudflare_tunnel
    create_helper_scripts
    show_final_status
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "⏱️  Total setup time: ${duration} seconds"
    log "🎉 Free Stack Bootstrap Complete!"
}

# Handle interruption gracefully
trap 'error "Bootstrap interrupted"' INT TERM

# Execute main function
main "$@"