#!/usr/bin/env bash
# Summit Platform – Post-Deploy Smoke Test
# Usage: ./scripts/smoke-test.sh [--base-url <url>] [--env <staging|production>] [--timeout <seconds>]
#
# Verifies that Summit is alive and serving traffic after a deployment.
# Checks health endpoints, critical API paths, and observability signals.
#
# Exit codes:
#   0 - all smoke checks passed
#   1 - one or more checks failed

set -euo pipefail

BASE_URL="${SUMMIT_HEALTH_URL:-http://localhost:4000}"
ENV="staging"
TIMEOUT=10
FAILED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) BASE_URL="$2"; shift 2 ;;
    --env)      ENV="$2";      shift 2 ;;
    --timeout)  TIMEOUT="$2";  shift 2 ;;
    *)          echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Colours / helpers ────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

pass()    { echo -e "  ${GREEN}✅ PASS${NC}  $*"; }
fail()    { echo -e "  ${RED}❌ FAIL${NC}  $*" >&2; FAILED=$((FAILED + 1)); }
warn()    { echo -e "  ${YELLOW}⚠️  WARN${NC}  $*"; }
section() { echo -e "\n${CYAN}=== $* ===${NC}"; }

check_http() {
  local label="$1"
  local url="$2"
  local expected="${3:-200}"
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" "${url}" 2>/dev/null || echo "000")
  if [[ "$http_code" == "$expected" ]]; then
    pass "${label} → HTTP ${http_code}"
  else
    fail "${label} → expected HTTP ${expected}, got ${http_code} (url: ${url})"
  fi
}

check_json_field() {
  local label="$1"
  local url="$2"
  local field="$3"
  local expected="$4"
  local body
  body=$(curl -s --max-time "${TIMEOUT}" "${url}" 2>/dev/null || echo "{}")
  local actual
  actual=$(echo "$body" | jq -r "${field}" 2>/dev/null || echo "PARSE_ERROR")
  if [[ "$actual" == "$expected" ]]; then
    pass "${label} → ${field}=${actual}"
  else
    fail "${label} → ${field}: expected '${expected}', got '${actual}'"
  fi
}

echo ""
echo -e "${CYAN}Summit Post-Deploy Smoke Test${NC}"
echo -e "Base URL    : ${BASE_URL}"
echo -e "Environment : ${ENV}"
echo -e "Timestamp   : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── Section 1: Liveness ──────────────────────────────────────────────────────
section "Liveness"
check_http "/healthz"     "${BASE_URL}/healthz"
check_http "/health/live" "${BASE_URL}/health/live"

# ── Section 2: Readiness ─────────────────────────────────────────────────────
section "Readiness"
check_http "/health/ready" "${BASE_URL}/health/ready"
check_http "/readyz"       "${BASE_URL}/readyz"

# ── Section 3: Status / Version ──────────────────────────────────────────────
section "Status & Version"
check_http "/status" "${BASE_URL}/status"
check_json_field "status.status" "${BASE_URL}/status" ".status" "ok"

# ── Section 4: Detailed health (dependency checks) ───────────────────────────
section "Detailed Health (Dependencies)"
DETAIL_CODE=$(curl -s -o /tmp/summit-health-detail.json -w "%{http_code}" \
  --max-time $((TIMEOUT * 2)) "${BASE_URL}/health/detailed" 2>/dev/null || echo "000")

if [[ "$DETAIL_CODE" == "200" ]]; then
  pass "/health/detailed → HTTP 200"
  NEO4J_STATUS=$(jq -r '.services.neo4j' /tmp/summit-health-detail.json 2>/dev/null || echo "unknown")
  PG_STATUS=$(jq -r '.services.postgres' /tmp/summit-health-detail.json 2>/dev/null || echo "unknown")
  REDIS_STATUS=$(jq -r '.services.redis' /tmp/summit-health-detail.json 2>/dev/null || echo "unknown")

  [[ "$NEO4J_STATUS" == "healthy" ]] && pass "Neo4j: healthy" || \
    { [[ "$NEO4J_STATUS" == "skipped" ]] && warn "Neo4j: skipped" || fail "Neo4j: ${NEO4J_STATUS}"; }
  [[ "$PG_STATUS"    == "healthy" ]] && pass "PostgreSQL: healthy" || fail "PostgreSQL: ${PG_STATUS}"
  [[ "$REDIS_STATUS" == "healthy" ]] && pass "Redis: healthy" || fail "Redis: ${REDIS_STATUS}"
elif [[ "$DETAIL_CODE" == "503" ]]; then
  warn "/health/detailed → HTTP 503 (some dependencies degraded)"
  FAILED=$((FAILED + 1))
else
  fail "/health/detailed → HTTP ${DETAIL_CODE}"
fi

# ── Section 5: Metrics endpoint ──────────────────────────────────────────────
section "Metrics"
METRICS_URL="${BASE_URL/4000/9090}/metrics"
ALT_METRICS="${BASE_URL}/metrics"
METRICS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" "${ALT_METRICS}" 2>/dev/null || echo "000")
if [[ "$METRICS_CODE" == "200" ]]; then
  pass "/metrics → HTTP 200"
else
  warn "/metrics → HTTP ${METRICS_CODE} (Prometheus metrics may be on a separate port)"
fi

# ── Section 6: GraphQL endpoint reachable ────────────────────────────────────
section "GraphQL"
GQL_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" \
  -X POST "${BASE_URL}/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' 2>/dev/null || echo "000")

# GraphQL returns 200 even for introspection queries
if [[ "$GQL_CODE" == "200" || "$GQL_CODE" == "400" ]]; then
  pass "GraphQL endpoint reachable (HTTP ${GQL_CODE})"
else
  fail "GraphQL endpoint returned HTTP ${GQL_CODE}"
fi

# ── Section 7: Feature flags sanity ──────────────────────────────────────────
section "Feature Flags Sanity"
FEATURE_FLAGS_FILE="${SCRIPT_DIR:-$(dirname "$0")}/../feature-flags/flags.yaml"
if [[ -f "$FEATURE_FLAGS_FILE" ]]; then
  if command -v python3 &>/dev/null; then
    EXPERIMENTAL=$(python3 -c "
import sys
try:
  import yaml
  d = yaml.safe_load(open('${FEATURE_FLAGS_FILE}'))
  features = d.get('features', {})
  exp = features.get('SEMANTIC_VALIDATION_ENABLED', {})
  print(str(exp.get('default', False)).lower())
except Exception as e:
  print('skip')
" 2>/dev/null || echo "skip")
    if [[ "$EXPERIMENTAL" == "true" ]]; then
      fail "SEMANTIC_VALIDATION_ENABLED=true in feature flags (stub – not production-safe)"
    elif [[ "$EXPERIMENTAL" == "skip" ]]; then
      warn "Could not parse feature flags file (yaml module may be missing)"
    else
      pass "SEMANTIC_VALIDATION_ENABLED is not true"
    fi
  else
    warn "python3 not available – skipping feature flag yaml check"
  fi
else
  warn "Feature flags file not found at ${FEATURE_FLAGS_FILE} – skipping"
fi

# ── Section 8: Deployment gate endpoint ──────────────────────────────────────
section "Deployment Gate"
check_json_field "deployment gate" "${BASE_URL}/health/deployment" ".status" "ready_for_traffic"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
if [[ "$FAILED" -eq 0 ]]; then
  echo -e "${GREEN}✅ All smoke checks passed. Deployment looks healthy.${NC}"
  exit 0
else
  echo -e "${RED}❌ ${FAILED} smoke check(s) FAILED.${NC}"
  echo -e "${RED}   Consider rollback: ./scripts/rollback.sh <prev-version> ${ENV}${NC}"
  exit 1
fi
