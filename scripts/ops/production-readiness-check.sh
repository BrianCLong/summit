#!/bin/bash
set -euo pipefail

# scripts/ops/production-readiness-check.sh
# Comprehensive production readiness validation for Maestro Conductor
# This script validates all critical components before go-live

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph-prod}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://kube-prometheus-stack-prometheus.monitoring.svc:9090}"
GRAFANA_URL="${GRAFANA_URL:-https://grafana.intelgraph.ai}"
MAESTRO_URL="${MAESTRO_URL:-https://maestro.intelgraph.ai}"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

log() { printf "${BLUE}[READINESS]${NC} %s\n" "$*"; }
success() { printf "${GREEN}✅ %s${NC}\n" "$*"; ((PASSED_CHECKS++)); }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; ((FAILED_CHECKS++)); }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; ((WARNINGS++)); }

check() {
    local description="$1"
    local command="$2"
    ((TOTAL_CHECKS++))
    
    if eval "$command" >/dev/null 2>&1; then
        success "$description"
        return 0
    else
        fail "$description"
        return 1
    fi
}

# Header
echo "🚀 Maestro Conductor Production Readiness Check"
echo "================================================="
echo "Environment: Production"
echo "Namespace: $NAMESPACE"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# 1. Infrastructure Readiness
log "🏗️  Infrastructure Readiness"
echo "----------------------------"

check "Kubernetes cluster accessible" "kubectl cluster-info"
check "Target namespace exists" "kubectl get namespace $NAMESPACE"
check "RBAC permissions configured" "kubectl auth can-i create deployments -n $NAMESPACE"
check "Storage classes available" "kubectl get storageclass"
check "Ingress controller ready" "kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --field-selector=status.phase=Running"

# 2. Security & Compliance
log "🔒 Security & Compliance"
echo "-------------------------"

check "Gatekeeper policies active" "kubectl get constrainttemplates"
check "Network policies configured" "kubectl get networkpolicies -n $NAMESPACE"
check "Pod security policies enforced" "kubectl get podsecuritypolicy"
check "Sealed secrets controller running" "kubectl get pods -n kube-system -l name=sealed-secrets-controller"
check "Image signatures verified" "cosign version"

# Validate critical secrets exist
if kubectl get secret maestro-secrets -n "$NAMESPACE" >/dev/null 2>&1; then
    success "Critical secrets configured"
else
    fail "Critical secrets missing"
fi

# 3. Monitoring & Observability
log "📊 Monitoring & Observability"
echo "------------------------------"

check "Prometheus server running" "kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus"
check "Grafana dashboard accessible" "kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana"
check "Blackbox exporter deployed" "kubectl get pods -n monitoring -l app=blackbox-exporter"
check "Service monitors configured" "kubectl get servicemonitor -n monitoring"
check "Alertmanager configured" "kubectl get pods -n monitoring -l app.kubernetes.io/name=alertmanager"

# Check if Prometheus is scraping targets
if curl -s -f "$PROMETHEUS_URL/api/v1/targets" | jq -e '.data.activeTargets[] | select(.labels.job == "blackbox")' >/dev/null 2>&1; then
    success "Prometheus scraping maestro targets"
else
    fail "Prometheus not scraping maestro targets"
fi

# 4. Application Readiness
log "🎯 Application Readiness"
echo "-------------------------"

# Check if Maestro deployment exists and is ready
if kubectl get deployment maestro-control-plane -n "$NAMESPACE" >/dev/null 2>&1; then
    ready_replicas=$(kubectl get deployment maestro-control-plane -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    desired_replicas=$(kubectl get deployment maestro-control-plane -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [[ "$ready_replicas" == "$desired_replicas" && "$ready_replicas" -gt 0 ]]; then
        success "Maestro deployment ready ($ready_replicas/$desired_replicas)"
    else
        fail "Maestro deployment not ready ($ready_replicas/$desired_replicas)"
    fi
else
    fail "Maestro deployment not found"
fi

check "Services configured" "kubectl get svc maestro-control-plane -n $NAMESPACE"
check "Ingress configured" "kubectl get ingress -n $NAMESPACE"
check "HPA configured" "kubectl get hpa -n $NAMESPACE"
check "PDB configured" "kubectl get pdb -n $NAMESPACE"

# 5. Database & Dependencies
log "🗄️  Database & Dependencies"
echo "----------------------------"

check "PostgreSQL accessible" "kubectl get pods -l app=postgresql"
check "Redis accessible" "kubectl get pods -l app=redis"
check "Neo4j accessible" "kubectl get pods -l app=neo4j"

# 6. CI/CD & Automation
log "🔄 CI/CD & Automation"
echo "----------------------"

check "Argo Rollouts controller running" "kubectl get pods -n argo-rollouts -l app.kubernetes.io/name=argo-rollouts"
check "Rollout configuration exists" "kubectl get rollout -n $NAMESPACE"
check "Container registry accessible" "docker pull ghcr.io/brianclong/maestro-control-plane:latest --dry-run"

# 7. Performance & Scalability
log "⚡ Performance & Scalability"
echo "----------------------------"

# Check resource limits
if kubectl get deployment maestro-control-plane -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.limits}' | grep -q "cpu\|memory"; then
    success "Resource limits configured"
else
    fail "Resource limits not configured"
fi

# Check if HPA is working
if kubectl get hpa -n "$NAMESPACE" -o jsonpath='{.items[0].status.currentReplicas}' >/dev/null 2>&1; then
    success "HPA active and monitoring"
else
    warn "HPA not active or configured"
fi

# 8. Disaster Recovery
log "🚨 Disaster Recovery"
echo "---------------------"

check "Backup strategy configured" "kubectl get cronjob -n $NAMESPACE"
check "PVC snapshots available" "kubectl get volumesnapshotclass"

# Check if disaster recovery scripts exist
if [[ -f "scripts/dr/restore_check.sh" ]]; then
    success "DR scripts available"
else
    warn "DR scripts not found"
fi

# 9. External Dependencies
log "🌐 External Dependencies"
echo "-------------------------"

# Test external endpoints
if curl -s -f --max-time 10 "$MAESTRO_URL/health" >/dev/null 2>&1; then
    success "Maestro health endpoint accessible"
else
    warn "Maestro health endpoint not accessible"
fi

# Check DNS resolution
if nslookup maestro.intelgraph.ai >/dev/null 2>&1; then
    success "DNS resolution working"
else
    fail "DNS resolution failing"
fi

# 10. Final Validation
log "🔍 Final Validation"
echo "-------------------"

# Run application-specific health checks
if kubectl exec -n "$NAMESPACE" deployment/maestro-control-plane -- curl -f localhost:4000/health >/dev/null 2>&1; then
    success "Application health check passing"
else
    fail "Application health check failing"
fi

# Check if all required environment variables are set
required_envs=("NODE_ENV" "LOG_LEVEL" "DATABASE_URL")
for env_var in "${required_envs[@]}"; do
    if kubectl get deployment maestro-control-plane -n "$NAMESPACE" -o jsonpath="{.spec.template.spec.containers[0].env[?(@.name=='$env_var')].value}" | grep -q .; then
        success "Environment variable $env_var configured"
    else
        warn "Environment variable $env_var not found"
    fi
done

# Summary
echo ""
echo "📋 Production Readiness Summary"
echo "==============================="
echo "Total Checks: $TOTAL_CHECKS"
echo "✅ Passed: $PASSED_CHECKS"
echo "❌ Failed: $FAILED_CHECKS"
echo "⚠️  Warnings: $WARNINGS"
echo ""

# Calculate readiness score
if [[ $TOTAL_CHECKS -gt 0 ]]; then
    READINESS_SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo "🎯 Readiness Score: $READINESS_SCORE%"
    echo ""
    
    if [[ $FAILED_CHECKS -eq 0 && $READINESS_SCORE -ge 90 ]]; then
        echo "${GREEN}🚀 PRODUCTION READY - GO FOR LAUNCH! 🚀${NC}"
        echo "All critical systems are operational and ready for production deployment."
        exit 0
    elif [[ $FAILED_CHECKS -le 2 && $READINESS_SCORE -ge 80 ]]; then
        echo "${YELLOW}⚠️  CAUTION - Address critical issues before launch${NC}"
        echo "Some issues need attention. Review failed checks above."
        exit 1
    else
        echo "${RED}❌ NOT READY - Critical issues must be resolved${NC}"
        echo "Too many failures. Do not proceed to production."
        exit 2
    fi
else
    echo "${RED}❌ Unable to perform readiness checks${NC}"
    exit 2
fi