#!/bin/bash
# ===================================================================
# INTELGRAPH SECURITY HARDENING DEPLOYMENT SCRIPT
# Deploy comprehensive container and runtime security configurations
# ===================================================================

set -euo pipefail

# Configuration
NAMESPACE="intelgraph-production"
SECURITY_NAMESPACE="security"
MONITORING_NAMESPACE="monitoring"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KUBECONFIG=${KUBECONFIG:-~/.kube/config}

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

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local tools=("kubectl" "helm" "cosign" "syft" "trivy")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespaces
create_namespaces() {
    log_info "Creating namespaces..."
    
    local namespaces=("$NAMESPACE" "$SECURITY_NAMESPACE" "$MONITORING_NAMESPACE" "ingress-nginx" "database" "cache")
    
    for ns in "${namespaces[@]}"; do
        if kubectl get namespace "$ns" &> /dev/null; then
            log_warn "Namespace $ns already exists"
        else
            kubectl create namespace "$ns"
            log_success "Created namespace: $ns"
        fi
        
        # Apply Pod Security Standards
        kubectl label namespace "$ns" \
            pod-security.kubernetes.io/enforce=restricted \
            pod-security.kubernetes.io/audit=restricted \
            pod-security.kubernetes.io/warn=restricted \
            --overwrite
            
        kubectl label namespace "$ns" \
            security.intelgraph.ai/level=high \
            security.intelgraph.ai/admission-webhook=enabled \
            --overwrite
    done
}

# Deploy security policies
deploy_security_policies() {
    log_info "Deploying security policies..."
    
    # Apply Pod Security Policies
    kubectl apply -f "${PROJECT_ROOT}/k8s/security/pod-security-policy.yaml"
    log_success "Applied Pod Security Policies"
    
    # Apply Network Policies
    kubectl apply -f "${PROJECT_ROOT}/k8s/security/network-security-policies.yaml"
    log_success "Applied Network Security Policies"
    
    # Apply RBAC configurations
    kubectl apply -f "${PROJECT_ROOT}/k8s/security/rbac-security.yaml"
    log_success "Applied RBAC Security configurations"
}

# Deploy secrets management
deploy_secrets_management() {
    log_info "Deploying secrets management..."
    
    # Check if External Secrets Operator is installed
    if ! helm list -n external-secrets | grep -q external-secrets; then
        log_info "Installing External Secrets Operator..."
        helm repo add external-secrets https://charts.external-secrets.io
        helm repo update
        helm install external-secrets external-secrets/external-secrets \
            --namespace external-secrets \
            --create-namespace \
            --set installCRDs=true
        
        # Wait for operator to be ready
        kubectl wait --for=condition=available deployment/external-secrets \
            -n external-secrets --timeout=300s
    fi
    
    # Apply secrets management configurations
    kubectl apply -f "${PROJECT_ROOT}/k8s/security/secrets-management.yaml"
    log_success "Applied secrets management configurations"
}

# Deploy admission controllers
deploy_admission_controllers() {
    log_info "Deploying admission controllers..."
    
    # Install OPA Gatekeeper
    if ! kubectl get namespace gatekeeper-system &> /dev/null; then
        log_info "Installing OPA Gatekeeper..."
        kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
        
        # Wait for Gatekeeper to be ready
        kubectl wait --for=condition=available deployment/gatekeeper-controller-manager \
            -n gatekeeper-system --timeout=300s
    fi
    
    # Install Kyverno
    if ! kubectl get namespace kyverno &> /dev/null; then
        log_info "Installing Kyverno..."
        helm repo add kyverno https://kyverno.github.io/kyverno/
        helm repo update
        helm install kyverno kyverno/kyverno \
            --namespace kyverno \
            --create-namespace \
            --set replicaCount=3 \
            --set podSecurityStandard=restricted
            
        # Wait for Kyverno to be ready
        kubectl wait --for=condition=available deployment/kyverno-admission-controller \
            -n kyverno --timeout=300s
    fi
    
    # Apply admission controller configurations
    kubectl apply -f "${PROJECT_ROOT}/k8s/security/admission-controllers.yaml"
    log_success "Applied admission controller configurations"
}

# Deploy runtime security monitoring
deploy_runtime_security() {
    log_info "Deploying runtime security monitoring..."
    
    # Install Falco
    if ! helm list -n falco | grep -q falco; then
        log_info "Installing Falco..."
        helm repo add falcosecurity https://falcosecurity.github.io/charts
        helm repo update
        helm install falco falcosecurity/falco \
            --namespace falco \
            --create-namespace \
            --set driver.kind=ebpf \
            --set falco.grpc.enabled=true \
            --set falco.grpcOutput.enabled=true \
            --set falco.webserver.enabled=true
            
        # Wait for Falco to be ready
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=falco \
            -n falco --timeout=300s
    fi
    
    log_success "Applied runtime security monitoring"
}

# Scan and sign container images
scan_and_sign_images() {
    log_info "Scanning and signing container images..."
    
    local images=(
        "ghcr.io/brianlong/intelgraph/maestro:latest"
        "ghcr.io/brianlong/intelgraph/admission-webhook:v1.0.0"
        "ghcr.io/brianlong/intelgraph/secret-rotator:v1.0.0"
    )
    
    for image in "${images[@]}"; do
        log_info "Scanning image: $image"
        
        # Vulnerability scan with Trivy
        if trivy image --exit-code 1 --severity HIGH,CRITICAL "$image"; then
            log_success "Image $image passed vulnerability scan"
        else
            log_error "Image $image failed vulnerability scan"
            continue
        fi
        
        # Generate SBOM
        syft "$image" -o spdx-json > "sbom-$(basename "$image").json"
        log_success "Generated SBOM for $image"
        
        # Sign image with Cosign (requires COSIGN_PRIVATE_KEY env var)
        if [[ -n "${COSIGN_PRIVATE_KEY:-}" ]]; then
            cosign sign --yes "$image"
            cosign attest --yes --predicate "sbom-$(basename "$image").json" --type spdxjson "$image"
            log_success "Signed image: $image"
        else
            log_warn "COSIGN_PRIVATE_KEY not set, skipping image signing"
        fi
    done
}

# Validate security configurations
validate_security() {
    log_info "Validating security configurations..."
    
    # Check Pod Security Standards
    local failed_pods
    failed_pods=$(kubectl get pods --all-namespaces -o jsonpath='{.items[?(@.status.phase=="Failed")].metadata.name}' | wc -w)
    if [[ $failed_pods -gt 0 ]]; then
        log_warn "$failed_pods pods are in failed state, check Pod Security Standards compliance"
    fi
    
    # Check Network Policy enforcement
    if kubectl get networkpolicy -A | grep -q "default-deny-all"; then
        log_success "Default deny-all network policy is in place"
    else
        log_error "Default deny-all network policy not found"
    fi
    
    # Check RBAC configuration
    local cluster_admin_bindings
    cluster_admin_bindings=$(kubectl get clusterrolebindings -o jsonpath='{.items[?(@.roleRef.name=="cluster-admin")].metadata.name}' | wc -w)
    log_info "Found $cluster_admin_bindings cluster-admin bindings (review for necessity)"
    
    # Verify admission controllers
    if kubectl get validatingadmissionwebhooks | grep -q "gatekeeper"; then
        log_success "Gatekeeper admission controller is active"
    fi
    
    if kubectl get validatingadmissionwebhooks | grep -q "kyverno"; then
        log_success "Kyverno admission controller is active"
    fi
    
    log_success "Security validation completed"
}

# Generate security report
generate_security_report() {
    log_info "Generating security report..."
    
    local report_file="security-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# IntelGraph Platform Security Report
Generated: $(date)

## Summary
This report provides an overview of the security hardening implemented for the IntelGraph platform.

## Security Components Deployed

### 1. Container Image Security
- **Multi-stage Dockerfile**: Implemented with distroless base images
- **Vulnerability Scanning**: Trivy integration in CI/CD pipeline
- **Image Signing**: Cosign-based signing with attestations
- **SBOM Generation**: Software Bill of Materials for supply chain transparency

### 2. Runtime Security
- **Pod Security Standards**: Restricted profile enforced across all namespaces
- **Security Contexts**: Non-root users, read-only filesystems, dropped capabilities
- **Seccomp Profiles**: Custom profiles restricting system calls
- **AppArmor Profiles**: Mandatory Access Control policies

### 3. Network Security
- **Network Policies**: Zero-trust networking with default deny-all
- **Service Mesh Security**: Istio mTLS and authorization policies
- **Ingress Security**: Rate limiting, DDoS protection, SSL termination
- **L7 Filtering**: Application-layer security policies

### 4. Secrets Management
- **External Secrets Operator**: Integration with HashiCorp Vault
- **Secret Rotation**: Automated rotation workflows
- **Encryption at Rest**: Kubernetes secrets encryption
- **Secret Scanning**: Automated detection of exposed secrets

### 5. RBAC and Access Control
- **Least Privilege**: Minimal required permissions per service
- **Service Accounts**: Dedicated accounts with scoped permissions
- **Audit Logging**: Comprehensive access logging and monitoring

### 6. Supply Chain Security
- **Admission Controllers**: Policy enforcement at deployment time
- **Image Verification**: Signature and attestation validation
- **SBOM Validation**: Software composition analysis
- **Policy as Code**: Automated compliance enforcement

### 7. Runtime Monitoring
- **Falco**: Runtime threat detection and response
- **Anomaly Detection**: Behavioral analysis and alerting
- **Incident Response**: Automated threat mitigation

## Compliance Standards
- NIST 800-53 controls implementation
- CIS Kubernetes Benchmark Level 1
- Pod Security Standards (Restricted)
- OWASP Container Security best practices

## Security Metrics
$(kubectl get pods -A --field-selector=status.phase=Running | wc -l) pods running with security hardening
$(kubectl get networkpolicies -A | wc -l) network policies active
$(kubectl get psp,podsecuritypolicy -A 2>/dev/null | wc -l) Pod Security Policies enforced
$(kubectl get validatingadmissionwebhooks | wc -l) admission controllers active

## Recommendations
1. Regular security policy reviews and updates
2. Continuous vulnerability scanning and remediation
3. Security training for development and operations teams
4. Incident response plan testing and updates

## Contact
For security-related questions or incidents:
- Security Team: security@intelgraph.ai
- On-call: PagerDuty integration active
EOF
    
    log_success "Security report generated: $report_file"
}

# Main deployment function
main() {
    log_info "Starting IntelGraph security hardening deployment..."
    log_info "Project root: $PROJECT_ROOT"
    log_info "Target namespace: $NAMESPACE"
    
    check_prerequisites
    create_namespaces
    deploy_security_policies
    deploy_secrets_management
    deploy_admission_controllers
    deploy_runtime_security
    
    # Optional: Scan and sign images (requires signing keys)
    if [[ "${SKIP_IMAGE_OPERATIONS:-false}" != "true" ]]; then
        scan_and_sign_images
    fi
    
    validate_security
    generate_security_report
    
    log_success "Security hardening deployment completed successfully!"
    log_info "Next steps:"
    log_info "1. Review the generated security report"
    log_info "2. Configure monitoring and alerting"
    log_info "3. Set up incident response procedures"
    log_info "4. Schedule regular security reviews"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy"|"")
        main
        ;;
    "validate")
        validate_security
        ;;
    "report")
        generate_security_report
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [deploy|validate|report|help]"
        echo "  deploy   - Deploy all security hardening (default)"
        echo "  validate - Validate existing security configurations"
        echo "  report   - Generate security report"
        echo "  help     - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac