#!/bin/bash
# Harbor Health Check Script
# Purpose: Comprehensive health check for Harbor registry
#
# Usage: ./health-check.sh [--namespace=harbor] [--verbose]

set -euo pipefail

# Default values
NAMESPACE="${NAMESPACE:-harbor}"
VERBOSE=false
HARBOR_URL="${HARBOR_URL:-https://registry.intelgraph.local}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse arguments
for arg in "$@"; do
  case $arg in
    --namespace=*)
      NAMESPACE="${arg#*=}"
      ;;
    --verbose)
      VERBOSE=true
      ;;
    --url=*)
      HARBOR_URL="${arg#*=}"
      ;;
  esac
done

# Health check results
declare -A RESULTS

check_pass() {
  RESULTS["$1"]="PASS"
  echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
  RESULTS["$1"]="FAIL"
  echo -e "${RED}✗${NC} $1: $2"
}

check_warn() {
  RESULTS["$1"]="WARN"
  echo -e "${YELLOW}!${NC} $1: $2"
}

# Check Kubernetes pods
check_pods() {
  echo ""
  echo "=== Kubernetes Pods ==="

  local pods
  pods=$(kubectl get pods -n "$NAMESPACE" -l app=harbor -o json)

  local total
  total=$(echo "$pods" | jq '.items | length')

  local ready
  ready=$(echo "$pods" | jq '[.items[] | select(.status.phase == "Running")] | length')

  if [ "$ready" -eq "$total" ] && [ "$total" -gt 0 ]; then
    check_pass "All $total pods running"
  else
    check_fail "Pod status" "$ready/$total pods running"

    if [ "$VERBOSE" = true ]; then
      kubectl get pods -n "$NAMESPACE" -l app=harbor
    fi
  fi

  # Check for restarts
  local restarts
  restarts=$(echo "$pods" | jq '[.items[].status.containerStatuses[]?.restartCount] | add // 0')

  if [ "$restarts" -gt 10 ]; then
    check_warn "Pod restarts" "$restarts total restarts detected"
  fi
}

# Check Harbor API
check_api() {
  echo ""
  echo "=== Harbor API ==="

  # Ping endpoint
  if curl -k -sf "$HARBOR_URL/api/v2.0/ping" >/dev/null 2>&1; then
    check_pass "API ping endpoint"
  else
    check_fail "API ping endpoint" "Not responding"
    return
  fi

  # Health endpoint
  local health
  health=$(curl -k -sf "$HARBOR_URL/api/v2.0/health" 2>/dev/null || echo '{"status":"error"}')

  local status
  status=$(echo "$health" | jq -r '.status // "unknown"')

  if [ "$status" = "healthy" ]; then
    check_pass "API health status"
  else
    check_fail "API health status" "Status: $status"

    if [ "$VERBOSE" = true ]; then
      echo "$health" | jq '.components[]'
    fi
  fi
}

# Check database
check_database() {
  echo ""
  echo "=== Database ==="

  local db_pod
  db_pod=$(kubectl get pods -n "$NAMESPACE" -l component=database -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

  if [ -z "$db_pod" ]; then
    check_warn "Database pod" "Not found (may be external)"
    return
  fi

  if kubectl exec -n "$NAMESPACE" "$db_pod" -- pg_isready -U postgres >/dev/null 2>&1; then
    check_pass "PostgreSQL connectivity"
  else
    check_fail "PostgreSQL connectivity" "pg_isready failed"
  fi

  # Check database size
  if [ "$VERBOSE" = true ]; then
    local db_size
    db_size=$(kubectl exec -n "$NAMESPACE" "$db_pod" -- psql -U postgres -d harbor_core -t -c "SELECT pg_size_pretty(pg_database_size('harbor_core'));" 2>/dev/null || echo "unknown")
    echo "  Database size: $db_size"
  fi
}

# Check Redis
check_redis() {
  echo ""
  echo "=== Redis ==="

  local redis_pod
  redis_pod=$(kubectl get pods -n "$NAMESPACE" -l component=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

  if [ -z "$redis_pod" ]; then
    check_warn "Redis pod" "Not found (may be external)"
    return
  fi

  if kubectl exec -n "$NAMESPACE" "$redis_pod" -- redis-cli ping 2>/dev/null | grep -q PONG; then
    check_pass "Redis connectivity"
  else
    check_fail "Redis connectivity" "ping failed"
  fi
}

# Check storage
check_storage() {
  echo ""
  echo "=== Storage ==="

  # Check PVCs
  local pvcs
  pvcs=$(kubectl get pvc -n "$NAMESPACE" -o json)

  local bound
  bound=$(echo "$pvcs" | jq '[.items[] | select(.status.phase == "Bound")] | length')

  local total
  total=$(echo "$pvcs" | jq '.items | length')

  if [ "$bound" -eq "$total" ] && [ "$total" -gt 0 ]; then
    check_pass "All $total PVCs bound"
  else
    check_fail "PVC status" "$bound/$total PVCs bound"
  fi

  # Check registry storage usage
  local registry_pod
  registry_pod=$(kubectl get pods -n "$NAMESPACE" -l component=registry -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

  if [ -n "$registry_pod" ]; then
    local usage
    usage=$(kubectl exec -n "$NAMESPACE" "$registry_pod" -- df -h /storage 2>/dev/null | tail -1 | awk '{print $5}' || echo "unknown")

    if [ "$usage" != "unknown" ]; then
      local percent
      percent=${usage%\%}

      if [ "$percent" -gt 90 ]; then
        check_fail "Registry storage" "$usage used (critical)"
      elif [ "$percent" -gt 80 ]; then
        check_warn "Registry storage" "$usage used"
      else
        check_pass "Registry storage ($usage used)"
      fi
    fi
  fi
}

# Check Trivy scanner
check_trivy() {
  echo ""
  echo "=== Vulnerability Scanner ==="

  local trivy_pod
  trivy_pod=$(kubectl get pods -n "$NAMESPACE" -l component=trivy -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

  if [ -z "$trivy_pod" ]; then
    check_warn "Trivy pod" "Not found"
    return
  fi

  if kubectl exec -n "$NAMESPACE" "$trivy_pod" -- curl -sf http://localhost:8080/probe/healthy >/dev/null 2>&1; then
    check_pass "Trivy scanner healthy"
  else
    check_fail "Trivy scanner" "Health probe failed"
  fi

  # Check vulnerability database age
  if [ "$VERBOSE" = true ]; then
    local db_age
    db_age=$(kubectl exec -n "$NAMESPACE" "$trivy_pod" -- stat -c %Y /home/scanner/.cache/trivy/db/trivy.db 2>/dev/null || echo "0")
    local now
    now=$(date +%s)
    local age_hours
    age_hours=$(( (now - db_age) / 3600 ))

    if [ "$age_hours" -gt 24 ]; then
      check_warn "Trivy DB age" "${age_hours}h old (recommend update)"
    else
      echo "  Trivy DB age: ${age_hours}h"
    fi
  fi
}

# Check certificates
check_certificates() {
  echo ""
  echo "=== TLS Certificates ==="

  local cert_info
  cert_info=$(echo | openssl s_client -connect "${HARBOR_URL#https://}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")

  if [ -z "$cert_info" ]; then
    check_fail "TLS certificate" "Could not retrieve certificate"
    return
  fi

  local expiry
  expiry=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)

  local expiry_epoch
  expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry" +%s 2>/dev/null || echo "0")

  local now
  now=$(date +%s)

  local days_left
  days_left=$(( (expiry_epoch - now) / 86400 ))

  if [ "$days_left" -lt 0 ]; then
    check_fail "TLS certificate" "EXPIRED"
  elif [ "$days_left" -lt 30 ]; then
    check_warn "TLS certificate" "Expires in $days_left days"
  else
    check_pass "TLS certificate valid ($days_left days remaining)"
  fi
}

# Check scan queue
check_scan_queue() {
  echo ""
  echo "=== Scan Queue ==="

  local queue_length
  queue_length=$(curl -k -sf "$HARBOR_URL/api/v2.0/systeminfo" 2>/dev/null | jq -r '.scan_all_policy.parameter.daily_time // "unknown"' || echo "unknown")

  if [ "$queue_length" != "unknown" ]; then
    check_pass "Scan configuration active"
  fi
}

# Summary
print_summary() {
  echo ""
  echo "========================================"
  echo "Health Check Summary"
  echo "========================================"

  local pass=0
  local fail=0
  local warn=0

  for key in "${!RESULTS[@]}"; do
    case "${RESULTS[$key]}" in
      PASS) ((pass++)) ;;
      FAIL) ((fail++)) ;;
      WARN) ((warn++)) ;;
    esac
  done

  echo -e "${GREEN}PASS${NC}: $pass"
  echo -e "${YELLOW}WARN${NC}: $warn"
  echo -e "${RED}FAIL${NC}: $fail"

  if [ "$fail" -gt 0 ]; then
    echo ""
    echo "Status: UNHEALTHY"
    exit 1
  elif [ "$warn" -gt 0 ]; then
    echo ""
    echo "Status: DEGRADED"
    exit 0
  else
    echo ""
    echo "Status: HEALTHY"
    exit 0
  fi
}

# Main
main() {
  echo "Harbor Health Check"
  echo "Namespace: $NAMESPACE"
  echo "URL: $HARBOR_URL"
  echo "Time: $(date)"

  check_pods
  check_api
  check_database
  check_redis
  check_storage
  check_trivy
  check_certificates
  check_scan_queue
  print_summary
}

main
