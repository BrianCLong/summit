#!/usr/bin/env bash
# =============================================================================
# Summit v4.0 - Deployment Verification Script
# =============================================================================
set -euo pipefail

API_URL="${API_URL:-https://api.summit.io}"
NAMESPACE="${NAMESPACE:-summit}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }

PASSED=0
FAILED=0

check() {
    local name="$1"
    local result="$2"

    if [ "$result" = "true" ]; then
        log_success "$name"
        ((PASSED++))
    else
        log_fail "$name"
        ((FAILED++))
    fi
}

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           Summit v4.0 - Deployment Verification               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# Kubernetes Checks
# =============================================================================
log_info "Running Kubernetes checks..."

# Check namespace exists
NS_EXISTS=$(kubectl get namespace ${NAMESPACE} &>/dev/null && echo "true" || echo "false")
check "Namespace '${NAMESPACE}' exists" "$NS_EXISTS"

# Check deployment exists and is available
DEPLOY_READY=$(kubectl get deployment summit-api -n ${NAMESPACE} -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo "0")
check "API deployment has available replicas (${DEPLOY_READY})" "$([[ "$DEPLOY_READY" -ge 1 ]] && echo true || echo false)"

# Check minimum replicas
MIN_REPLICAS=$(kubectl get deployment summit-api -n ${NAMESPACE} -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
check "Minimum replicas configured (${MIN_REPLICAS})" "$([[ "$MIN_REPLICAS" -ge 3 ]] && echo true || echo false)"

# Check HPA exists
HPA_EXISTS=$(kubectl get hpa summit-api -n ${NAMESPACE} &>/dev/null && echo "true" || echo "false")
check "HorizontalPodAutoscaler configured" "$HPA_EXISTS"

# Check PDB exists
PDB_EXISTS=$(kubectl get pdb summit-api -n ${NAMESPACE} &>/dev/null && echo "true" || echo "false")
check "PodDisruptionBudget configured" "$PDB_EXISTS"

# Check ingress exists
INGRESS_EXISTS=$(kubectl get ingress summit-api -n ${NAMESPACE} &>/dev/null && echo "true" || echo "false")
check "Ingress configured" "$INGRESS_EXISTS"

# Check ConfigMap exists
CM_EXISTS=$(kubectl get configmap summit-config -n ${NAMESPACE} &>/dev/null && echo "true" || echo "false")
check "ConfigMap exists" "$CM_EXISTS"

# Check Secrets exist
SECRET_EXISTS=$(kubectl get secret summit-secrets -n ${NAMESPACE} &>/dev/null && echo "true" || echo "false")
check "Secrets configured" "$SECRET_EXISTS"

# Check all pods are ready
TOTAL_PODS=$(kubectl get pods -l app=summit-api -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l | tr -d ' ')
READY_PODS=$(kubectl get pods -l app=summit-api -n ${NAMESPACE} --no-headers 2>/dev/null | grep -c "Running" || echo "0")
check "All pods running (${READY_PODS}/${TOTAL_PODS})" "$([[ "$READY_PODS" -eq "$TOTAL_PODS" && "$TOTAL_PODS" -gt 0 ]] && echo true || echo false)"

echo ""

# =============================================================================
# API Health Checks
# =============================================================================
log_info "Running API health checks..."

# Liveness check
LIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health/live" 2>/dev/null || echo "000")
check "Liveness probe returns 200 (got ${LIVE_STATUS})" "$([[ "$LIVE_STATUS" = "200" ]] && echo true || echo false)"

# Readiness check
READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health/ready" 2>/dev/null || echo "000")
check "Readiness probe returns 200 (got ${READY_STATUS})" "$([[ "$READY_STATUS" = "200" ]] && echo true || echo false)"

# Version endpoint
VERSION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/version" 2>/dev/null || echo "000")
check "Version endpoint accessible (got ${VERSION_STATUS})" "$([[ "$VERSION_STATUS" = "200" ]] && echo true || echo false)"

# Metrics endpoint (internal)
if kubectl port-forward svc/summit-api 9090:9090 -n ${NAMESPACE} &>/dev/null & then
    PF_PID=$!
    sleep 2
    METRICS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9090/metrics" 2>/dev/null || echo "000")
    kill $PF_PID 2>/dev/null || true
    check "Metrics endpoint accessible (got ${METRICS_STATUS})" "$([[ "$METRICS_STATUS" = "200" ]] && echo true || echo false)"
else
    log_warn "Could not port-forward to check metrics"
fi

echo ""

# =============================================================================
# v4 Feature Checks
# =============================================================================
log_info "Running v4 feature checks..."

# Check v4 features endpoint
V4_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v4/features" 2>/dev/null || echo "000")
check "v4 Features endpoint accessible (got ${V4_STATUS})" "$([[ "$V4_STATUS" = "200" || "$V4_STATUS" = "401" ]] && echo true || echo false)"

# Check AI Governance endpoint
AI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v4/ai/governance/status" 2>/dev/null || echo "000")
check "AI Governance endpoint accessible (got ${AI_STATUS})" "$([[ "$AI_STATUS" = "200" || "$AI_STATUS" = "401" ]] && echo true || echo false)"

# Check Compliance endpoint
COMPLIANCE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v4/compliance/frameworks" 2>/dev/null || echo "000")
check "Compliance endpoint accessible (got ${COMPLIANCE_STATUS})" "$([[ "$COMPLIANCE_STATUS" = "200" || "$COMPLIANCE_STATUS" = "401" ]] && echo true || echo false)"

# Check Audit endpoint
AUDIT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v4/audit/status" 2>/dev/null || echo "000")
check "Audit Ledger endpoint accessible (got ${AUDIT_STATUS})" "$([[ "$AUDIT_STATUS" = "200" || "$AUDIT_STATUS" = "401" ]] && echo true || echo false)"

echo ""

# =============================================================================
# Database Connectivity
# =============================================================================
log_info "Checking database connectivity..."

# Check PostgreSQL
PG_STATUS=$(kubectl exec -n ${NAMESPACE} deploy/summit-api -- \
    node -e "const pg = require('pg'); const c = new pg.Client(process.env.DATABASE_URL); c.connect().then(() => { console.log('OK'); c.end(); }).catch(() => console.log('FAIL'));" 2>/dev/null || echo "FAIL")
check "PostgreSQL connectivity" "$([[ "$PG_STATUS" = "OK" ]] && echo true || echo false)"

# Check Redis
REDIS_STATUS=$(kubectl exec -n ${NAMESPACE} deploy/summit-api -- \
    node -e "const redis = require('redis'); const c = redis.createClient({url: process.env.REDIS_URL}); c.connect().then(() => { console.log('OK'); c.quit(); }).catch(() => console.log('FAIL'));" 2>/dev/null || echo "FAIL")
check "Redis connectivity" "$([[ "$REDIS_STATUS" = "OK" ]] && echo true || echo false)"

echo ""

# =============================================================================
# Security Checks
# =============================================================================
log_info "Running security checks..."

# Check TLS
TLS_OK=$(curl -sI "${API_URL}/" 2>/dev/null | grep -i "strict-transport-security" && echo "true" || echo "false")
check "HSTS header present" "$TLS_OK"

# Check security headers
XCT_OK=$(curl -sI "${API_URL}/" 2>/dev/null | grep -i "x-content-type-options" && echo "true" || echo "false")
check "X-Content-Type-Options header present" "$XCT_OK"

XFO_OK=$(curl -sI "${API_URL}/" 2>/dev/null | grep -i "x-frame-options" && echo "true" || echo "false")
check "X-Frame-Options header present" "$XFO_OK"

# Check pods run as non-root
NON_ROOT=$(kubectl get deployment summit-api -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.securityContext.runAsNonRoot}' 2>/dev/null || echo "false")
check "Pods configured to run as non-root" "$NON_ROOT"

echo ""

# =============================================================================
# Summary
# =============================================================================
TOTAL=$((PASSED + FAILED))
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                     VERIFICATION SUMMARY                      ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
printf "║  %-20s %s\n" "Total Checks:" "${TOTAL}"
printf "║  ${GREEN}%-20s %s${NC}\n" "Passed:" "${PASSED}"
if [ $FAILED -gt 0 ]; then
    printf "║  ${RED}%-20s %s${NC}\n" "Failed:" "${FAILED}"
fi
echo "╠═══════════════════════════════════════════════════════════════╣"

if [ $FAILED -eq 0 ]; then
    echo -e "║  ${GREEN}STATUS: ALL CHECKS PASSED - DEPLOYMENT HEALTHY${NC}             ║"
    EXIT_CODE=0
else
    echo -e "║  ${RED}STATUS: ${FAILED} CHECKS FAILED - REQUIRES ATTENTION${NC}          ║"
    EXIT_CODE=1
fi

echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

exit $EXIT_CODE
