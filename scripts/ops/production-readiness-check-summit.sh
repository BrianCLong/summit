#!/bin/bash
set -euo pipefail

# scripts/ops/production-readiness-check-summit.sh
# Summit production readiness validation (GA environment prep).

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-summit-prod}"
RELEASE_NAME="${RELEASE_NAME:-summit}"
KUBECTL_CONTEXT="${KUBECTL_CONTEXT:-prod-cluster}"

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

echo "🚀 Summit Production Readiness Check"
echo "===================================="
echo "Environment: Production"
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

log "🏗️  Infrastructure Readiness"
check "Kubernetes cluster accessible" "kubectl cluster-info --context ${KUBECTL_CONTEXT}"
check "Target namespace exists" "kubectl get namespace ${NAMESPACE}"
check "RBAC permissions configured" "kubectl auth can-i create deployments -n ${NAMESPACE}"
check "Storage classes available" "kubectl get storageclass"

log "🔒 Security & Compliance"
check "Network policies configured" "kubectl get networkpolicies -n ${NAMESPACE}"
check "Pod security enforcement labels present" "kubectl get namespace ${NAMESPACE} -o jsonpath='{.metadata.labels.pod-security\\.kubernetes\\.io/enforce}'"

log "📊 Monitoring & Observability"
check "ServiceMonitor configured" "kubectl get servicemonitor -n ${NAMESPACE}"
check "PrometheusRule configured" "kubectl get prometheusrule -n ${NAMESPACE}"

log "🎯 Application Readiness"
check "Summit deployment exists" "kubectl get deployment ${RELEASE_NAME} -n ${NAMESPACE}"
check "Summit service exists" "kubectl get svc ${RELEASE_NAME} -n ${NAMESPACE}"
check "Summit PDB configured" "kubectl get pdb -n ${NAMESPACE}"

if kubectl get deployment "${RELEASE_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  ready_replicas=$(kubectl get deployment "${RELEASE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}')
  desired_replicas=$(kubectl get deployment "${RELEASE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}')
  if [[ "${ready_replicas:-0}" == "${desired_replicas:-0}" && "${ready_replicas:-0}" -gt 0 ]]; then
    success "Summit deployment ready (${ready_replicas}/${desired_replicas})"
  else
    fail "Summit deployment not ready (${ready_replicas:-0}/${desired_replicas:-0})"
  fi
fi

log "🗄️  Dependencies"
check "PostgreSQL reachable (label-based)" "kubectl get pods -n ${NAMESPACE} -l app=postgresql"
check "Redis reachable (label-based)" "kubectl get pods -n ${NAMESPACE} -l app=redis"
check "Neo4j reachable (label-based)" "kubectl get pods -n ${NAMESPACE} -l app=neo4j"

log "🔍 Final Validation"
if kubectl exec -n "${NAMESPACE}" deployment/${RELEASE_NAME} -- curl -f -s localhost:3000/health >/dev/null 2>&1; then
  success "Application health endpoint reachable"
else
  warn "Application health endpoint not reachable from pod"
fi

echo ""
echo "📋 Production Readiness Summary"
echo "==============================="
echo "Total Checks: $TOTAL_CHECKS"
echo "✅ Passed: $PASSED_CHECKS"
echo "❌ Failed: $FAILED_CHECKS"
echo "⚠️  Warnings: $WARNINGS"
echo ""

if [[ $TOTAL_CHECKS -gt 0 ]]; then
  READINESS_SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
  echo "🎯 Readiness Score: $READINESS_SCORE%"
  echo ""

  if [[ $FAILED_CHECKS -eq 0 && $READINESS_SCORE -ge 90 ]]; then
    echo "${GREEN}🚀 PRODUCTION READY - GO FOR LAUNCH${NC}"
    exit 0
  elif [[ $FAILED_CHECKS -le 2 && $READINESS_SCORE -ge 80 ]]; then
    echo "${YELLOW}⚠️  CAUTION - Address critical issues before launch${NC}"
    exit 1
  else
    echo "${RED}❌ NOT READY - Critical issues must be resolved${NC}"
    exit 2
  fi
else
  echo "${RED}❌ Unable to perform readiness checks${NC}"
  exit 2
fi
