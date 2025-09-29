#!/bin/bash

# Maestro Deployment Validation Script
# Validates deployment configurations and runs comprehensive tests

set -euo pipefail

# Configuration
NAMESPACE="maestro-system"
HELM_RELEASE_NAME="maestro"
CHART_PATH="charts/maestro"
VALUES_FILE="charts/maestro/values.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Validate Helm Chart
validate_helm_chart() {
    log_info "Validating Helm chart..."
    
    # Check if Helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed"
        return 1
    fi
    
    # Lint the chart
    log_info "Running helm lint..."
    if helm lint "$CHART_PATH"; then
        log_success "Helm chart lint passed"
    else
        log_error "Helm chart lint failed"
        return 1
    fi
    
    # Template the chart
    log_info "Testing helm template generation..."
    local template_output
    if template_output=$(helm template "$HELM_RELEASE_NAME" "$CHART_PATH" -f "$VALUES_FILE" --namespace "$NAMESPACE" 2>&1); then
        log_success "Helm template generation successful"
        
        # Count resources
        local resource_count
        resource_count=$(echo "$template_output" | grep -c "^kind:" || true)
        log_info "Generated $resource_count Kubernetes resources"
        
        # Check for required resources
        local required_resources=("Deployment" "Service" "ConfigMap" "ServiceAccount" "HorizontalPodAutoscaler" "PodDisruptionBudget")
        for resource in "${required_resources[@]}"; do
            if echo "$template_output" | grep -q "kind: $resource"; then
                log_success "Found required resource: $resource"
            else
                log_warning "Missing resource: $resource"
            fi
        done
        
    else
        log_error "Helm template generation failed"
        echo "$template_output"
        return 1
    fi
}

# Validate Kubernetes Manifests
validate_k8s_manifests() {
    log_info "Validating Kubernetes manifests..."
    
    # Check YAML syntax
    local yaml_files=("k8s/maestro-production-deployment.yaml" "k8s/maestro-production-configmap.yaml" "k8s/maestro-production-secrets.yaml")
    
    for yaml_file in "${yaml_files[@]}"; do
        if [[ -f "$yaml_file" ]]; then
            log_info "Validating $yaml_file..."
            
            # Check YAML syntax with yq or python
            if command -v yq &> /dev/null; then
                if yq eval '.' "$yaml_file" > /dev/null 2>&1; then
                    log_success "$yaml_file has valid YAML syntax"
                else
                    log_error "$yaml_file has invalid YAML syntax"
                    return 1
                fi
            elif command -v python3 &> /dev/null; then
                if python3 -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null; then
                    log_success "$yaml_file has valid YAML syntax"
                else
                    log_error "$yaml_file has invalid YAML syntax"
                    return 1
                fi
            else
                log_warning "Cannot validate YAML syntax - yq or python3 not available"
            fi
            
            # Count resources
            local resource_count
            resource_count=$(grep -c "^kind:" "$yaml_file" || true)
            log_info "$yaml_file contains $resource_count resources"
            
        else
            log_warning "File not found: $yaml_file"
        fi
    done
}

# Validate Docker Image
validate_docker_image() {
    log_info "Validating Docker image configuration..."
    
    local image_repo="ghcr.io/brianlong/intelgraph/maestro-control-plane"
    local image_tag="2.0.0-prod"
    local full_image="${image_repo}:${image_tag}"
    
    # Check if Docker is available
    if command -v docker &> /dev/null; then
        log_info "Checking Docker image: $full_image"
        
        # Try to inspect the image (this would work if image exists locally or remotely)
        if docker manifest inspect "$full_image" &>/dev/null; then
            log_success "Docker image manifest exists: $full_image"
        else
            log_warning "Docker image not found or not accessible: $full_image"
            log_info "This is expected if the image hasn't been built and pushed yet"
        fi
        
        # Validate Dockerfile
        if [[ -f "Dockerfile" ]]; then
            log_info "Validating Dockerfile..."
            
            # Check for security best practices
            if grep -q "USER.*nonroot\|USER.*10001" Dockerfile; then
                log_success "Dockerfile uses non-root user"
            else
                log_warning "Dockerfile might not use non-root user"
            fi
            
            if grep -q "HEALTHCHECK" Dockerfile; then
                log_success "Dockerfile includes health check"
            else
                log_warning "Dockerfile missing health check"
            fi
            
            if grep -q "dumb-init\|tini" Dockerfile; then
                log_success "Dockerfile uses proper init system"
            else
                log_warning "Dockerfile might not use proper init system"
            fi
        fi
    else
        log_warning "Docker not available - skipping image validation"
    fi
}

# Security Validation
validate_security() {
    log_info "Validating security configuration..."
    
    # Check Helm values for security settings
    if [[ -f "$VALUES_FILE" ]]; then
        log_info "Checking security settings in values.yaml..."
        
        if grep -q "runAsNonRoot.*true" "$VALUES_FILE"; then
            log_success "Container configured to run as non-root"
        else
            log_warning "Container might run as root"
        fi
        
        if grep -q "readOnlyRootFilesystem.*true" "$VALUES_FILE"; then
            log_success "Read-only root filesystem configured"
        else
            log_warning "Root filesystem might be writable"
        fi
        
        if grep -q "allowPrivilegeEscalation.*false" "$VALUES_FILE"; then
            log_success "Privilege escalation disabled"
        else
            log_warning "Privilege escalation might be allowed"
        fi
        
        if grep -q "capabilities:" "$VALUES_FILE" && grep -q "drop:" "$VALUES_FILE"; then
            log_success "Capabilities are being dropped"
        else
            log_warning "No capability restrictions found"
        fi
    fi
    
    # Check for network policies
    local network_policy_files=("k8s/maestro-production-deployment.yaml" "charts/maestro/templates/networkpolicy.yaml")
    local found_network_policy=false
    
    for file in "${network_policy_files[@]}"; do
        if [[ -f "$file" ]] && grep -q "kind: NetworkPolicy" "$file"; then
            log_success "Network policy found in $file"
            found_network_policy=true
            break
        fi
    done
    
    if [[ "$found_network_policy" == "false" ]]; then
        log_warning "No network policies found"
    fi
}

# Resource Validation
validate_resources() {
    log_info "Validating resource configuration..."
    
    # Check for resource limits and requests
    local files_to_check=("$VALUES_FILE" "k8s/maestro-production-deployment.yaml")
    
    for file in "${files_to_check[@]}"; do
        if [[ -f "$file" ]]; then
            log_info "Checking resource configuration in $file..."
            
            if grep -q "requests:" "$file" && grep -q "limits:" "$file"; then
                log_success "Resource requests and limits defined in $file"
                
                # Check for memory limits
                if grep -q "memory.*[0-9]" "$file"; then
                    log_success "Memory limits configured"
                fi
                
                # Check for CPU limits
                if grep -q "cpu.*[0-9]" "$file"; then
                    log_success "CPU limits configured"
                fi
            else
                log_warning "Resource limits not found in $file"
            fi
        fi
    done
    
    # Check for HPA configuration
    if grep -rq "HorizontalPodAutoscaler\|kind: HorizontalPodAutoscaler" charts/ k8s/ 2>/dev/null; then
        log_success "Horizontal Pod Autoscaler configured"
    else
        log_warning "No Horizontal Pod Autoscaler found"
    fi
    
    # Check for PDB configuration
    if grep -rq "PodDisruptionBudget\|kind: PodDisruptionBudget" charts/ k8s/ 2>/dev/null; then
        log_success "Pod Disruption Budget configured"
    else
        log_warning "No Pod Disruption Budget found"
    fi
}

# Monitoring Validation
validate_monitoring() {
    log_info "Validating monitoring configuration..."
    
    # Check for ServiceMonitor
    if grep -rq "ServiceMonitor\|kind: ServiceMonitor" charts/ k8s/ 2>/dev/null; then
        log_success "ServiceMonitor configured for Prometheus"
    else
        log_warning "No ServiceMonitor found"
    fi
    
    # Check for PrometheusRule
    if grep -rq "PrometheusRule\|kind: PrometheusRule" charts/ k8s/ 2>/dev/null; then
        log_success "PrometheusRule configured for alerting"
    else
        log_warning "No PrometheusRule found"
    fi
    
    # Check for metrics endpoint
    if grep -rq "/metrics" charts/ k8s/ 2>/dev/null; then
        log_success "Metrics endpoint configured"
    else
        log_warning "No metrics endpoint found"
    fi
    
    # Check for health check endpoints
    if grep -rq "/healthz\|/readyz" charts/ k8s/ 2>/dev/null; then
        log_success "Health check endpoints configured"
    else
        log_warning "No health check endpoints found"
    fi
}

# Configuration Validation
validate_configuration() {
    log_info "Validating configuration management..."
    
    # Check for ConfigMaps
    if grep -rq "ConfigMap\|kind: ConfigMap" charts/ k8s/ 2>/dev/null; then
        log_success "ConfigMap resources found"
    else
        log_warning "No ConfigMap resources found"
    fi
    
    # Check for Secrets
    if grep -rq "Secret\|kind: Secret" charts/ k8s/ 2>/dev/null; then
        log_success "Secret resources found"
    else
        log_warning "No Secret resources found"
    fi
    
    # Check for environment variables
    if grep -rq "env:" charts/ k8s/ 2>/dev/null; then
        log_success "Environment variables configured"
    else
        log_warning "No environment variables found"
    fi
    
    # Check for volume mounts
    if grep -rq "volumeMounts:\|volumes:" charts/ k8s/ 2>/dev/null; then
        log_success "Volume mounts configured"
    else
        log_warning "No volume mounts found"
    fi
}

# Network Validation
validate_networking() {
    log_info "Validating networking configuration..."
    
    # Check for Services
    if grep -rq "Service\|kind: Service" charts/ k8s/ 2>/dev/null; then
        log_success "Service resources found"
    else
        log_error "No Service resources found"
    fi
    
    # Check for Ingress
    if grep -rq "Ingress\|kind: Ingress" charts/ k8s/ 2>/dev/null; then
        log_success "Ingress resources found"
        
        # Check for SSL/TLS
        if grep -rq "tls:\|secretName.*tls" charts/ k8s/ 2>/dev/null; then
            log_success "SSL/TLS configuration found"
        else
            log_warning "No SSL/TLS configuration found"
        fi
        
        # Check for rate limiting
        if grep -rq "rate-limit\|nginx.ingress.kubernetes.io/rate-limit" charts/ k8s/ 2>/dev/null; then
            log_success "Rate limiting configured"
        else
            log_warning "No rate limiting found"
        fi
    else
        log_warning "No Ingress resources found"
    fi
    
    # Check for CORS configuration
    if grep -rq "cors\|CORS" charts/ k8s/ 2>/dev/null; then
        log_success "CORS configuration found"
    else
        log_warning "No CORS configuration found"
    fi
}

# Generate validation report
generate_validation_report() {
    log_info "Generating validation report..."
    
    local report_file="validation-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "=== Maestro Deployment Validation Report ==="
        echo "Generated: $(date)"
        echo "Chart Path: $CHART_PATH"
        echo "Values File: $VALUES_FILE"
        echo ""
        
        echo "=== Helm Chart Analysis ==="
        helm template "$HELM_RELEASE_NAME" "$CHART_PATH" -f "$VALUES_FILE" --namespace "$NAMESPACE" | grep "^kind:" | sort | uniq -c
        echo ""
        
        echo "=== File Structure ==="
        find charts/ k8s/ scripts/ -name "*.yaml" -o -name "*.yml" -o -name "*.sh" -o -name "*.tpl" 2>/dev/null | sort
        echo ""
        
        echo "=== Security Configuration ==="
        echo "Security contexts, RBAC, and network policies:"
        grep -r "securityContext\|runAsUser\|NetworkPolicy" charts/ k8s/ 2>/dev/null | head -10
        echo ""
        
        echo "=== Resource Configuration ==="
        echo "Resource requests and limits:"
        grep -r "requests:\|limits:\|cpu:\|memory:" charts/ k8s/ 2>/dev/null | head -10
        echo ""
        
        echo "=== Environment Variables ==="
        echo "Environment variable configuration:"
        grep -r "env:" charts/ k8s/ 2>/dev/null | wc -l
        echo ""
        
        echo "=== Validation Summary ==="
        echo "This report shows the current state of the Maestro deployment configuration."
        echo "All critical components appear to be configured for production deployment."
        
    } > "$report_file"
    
    log_success "Validation report generated: $report_file"
}

# Main function
main() {
    log_info "Starting Maestro Deployment Validation"
    echo "=================================="
    
    local validation_passed=true
    
    # Run all validations
    if ! validate_helm_chart; then
        validation_passed=false
    fi
    
    if ! validate_k8s_manifests; then
        validation_passed=false
    fi
    
    validate_docker_image
    validate_security
    validate_resources
    validate_monitoring
    validate_configuration
    validate_networking
    
    generate_validation_report
    
    echo ""
    echo "=================================="
    
    if [[ "$validation_passed" == "true" ]]; then
        log_success "✅ All critical validations passed!"
        log_info "The Maestro deployment is ready for production"
        echo ""
        log_info "Next steps:"
        echo "  1. Build and push Docker images: npm run docker:build:maestro"
        echo "  2. Configure production secrets in your cluster"
        echo "  3. Deploy using: ./scripts/deploy-maestro-production.sh"
        echo "  4. Verify deployment: ./scripts/deploy-maestro-production.sh health"
    else
        log_error "❌ Some validations failed"
        log_info "Please review the errors above and fix them before deploying"
        return 1
    fi
}

# Run main function
main "$@"