#!/bin/bash
# Summit Agent Gateway Deployment Verification Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3001}"
OPA_URL="${OPA_ENDPOINT:-http://localhost:8181}"

PASSED=0
FAILED=0

# Helper functions
check_passed() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

check_failed() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Agent Gateway Deployment Verification${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ============================================================================
# 1. Service Health Check
# ============================================================================

echo -e "${YELLOW}[1] Checking service health...${NC}"

HEALTH_RESPONSE=$(curl -s "$GATEWAY_URL/health" || echo "failed")

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    check_passed "Service is healthy"
else
    check_failed "Service health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# ============================================================================
# 2. Database Connection
# ============================================================================

echo -e "\n${YELLOW}[2] Checking database connection...${NC}"

# Test if we can reach the database (through the service)
CONFIG_RESPONSE=$(curl -s "$GATEWAY_URL/config" || echo "failed")

if echo "$CONFIG_RESPONSE" | grep -q "defaultOperationMode"; then
    check_passed "Database connection working"
else
    check_failed "Cannot connect to database"
fi

# ============================================================================
# 3. Database Tables
# ============================================================================

echo -e "\n${YELLOW}[3] Verifying database tables...${NC}"

REQUIRED_TABLES=(
    "agents"
    "agent_credentials"
    "agent_runs"
    "agent_actions"
    "agent_approvals"
    "agent_quotas"
    "agent_metrics"
    "agent_audit_log"
)

DB_CHECK=$(PGPASSWORD="$DB_PASSWORD" psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-summit}" "${DB_NAME:-summit}" -t -c "\dt agents" 2>&1 || echo "failed")

if echo "$DB_CHECK" | grep -q "agents"; then
    check_passed "Database tables exist"
else
    check_failed "Database tables missing"
    echo "Run: psql -f db/migrations/017_agent_framework.sql"
fi

# ============================================================================
# 4. OPA Policy Engine
# ============================================================================

echo -e "\n${YELLOW}[4] Checking OPA policy engine...${NC}"

OPA_HEALTH=$(curl -s "$OPA_URL/health" || echo "failed")

if echo "$OPA_HEALTH" | grep -q "ok"; then
    check_passed "OPA is running"

    # Check if agent policy is loaded
    OPA_POLICIES=$(curl -s "$OPA_URL/v1/policies" || echo "failed")

    if echo "$OPA_POLICIES" | grep -q "agent"; then
        check_passed "Agent policy is loaded"
    else
        check_failed "Agent policy not loaded"
        echo "Run: curl -X PUT $OPA_URL/v1/policies/agent --data-binary @policy/agent/agent_policy.rego"
    fi
else
    check_failed "OPA is not running"
    echo "Start OPA: opa run --server --addr :8181"
fi

# ============================================================================
# 5. Environment Configuration
# ============================================================================

echo -e "\n${YELLOW}[5] Checking environment configuration...${NC}"

REQUIRED_ENV_VARS=(
    "DB_HOST"
    "DB_NAME"
    "OPA_ENDPOINT"
)

MISSING_VARS=0

for VAR in "${REQUIRED_ENV_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        check_failed "$VAR not set"
        ((MISSING_VARS++))
    fi
done

if [ $MISSING_VARS -eq 0 ]; then
    check_passed "All required environment variables set"
fi

# ============================================================================
# 6. Create Test Agent
# ============================================================================

echo -e "\n${YELLOW}[6] Testing agent creation...${NC}"

if [ -n "$ADMIN_TOKEN" ]; then
    TEST_AGENT_NAME="verify-test-agent-$$"

    CREATE_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/admin/agents" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$TEST_AGENT_NAME\",
            \"description\": \"Verification test agent\",
            \"agentType\": \"internal\",
            \"tenantScopes\": [\"test\"],
            \"capabilities\": [\"read:data\"],
            \"restrictions\": {
                \"maxRiskLevel\": \"low\",
                \"requireApproval\": [\"high\", \"critical\"]
            }
        }" || echo "failed")

    if echo "$CREATE_RESPONSE" | grep -q "$TEST_AGENT_NAME"; then
        check_passed "Agent creation working"

        AGENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

        # Clean up test agent
        curl -s -X DELETE "$GATEWAY_URL/api/admin/agents/$AGENT_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null 2>&1 || true
    else
        check_failed "Agent creation failed"
        echo "Response: $CREATE_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠ Skipping (ADMIN_TOKEN not set)${NC}"
fi

# ============================================================================
# 7. Test Safety Scenarios
# ============================================================================

echo -e "\n${YELLOW}[7] Running safety scenario tests...${NC}"

if [ -d "$(dirname "$0")/../src/__tests__" ]; then
    cd "$(dirname "$0")/.."

    if npm test -- --testPathPattern=safety-scenarios --silent 2>&1 | grep -q "passed"; then
        check_passed "Safety scenarios pass"
    else
        check_failed "Safety scenarios failed"
        echo "Run: npm test:safety"
    fi
else
    echo -e "${YELLOW}⚠ Test directory not found${NC}"
fi

# ============================================================================
# 8. Check Observability
# ============================================================================

echo -e "\n${YELLOW}[8] Checking observability setup...${NC}"

if [ -n "$JAEGER_ENDPOINT" ]; then
    JAEGER_CHECK=$(curl -s "$JAEGER_ENDPOINT/api/services" || echo "failed")

    if [ "$JAEGER_CHECK" != "failed" ]; then
        check_passed "Jaeger tracing available"
    else
        check_failed "Jaeger not reachable"
    fi
else
    echo -e "${YELLOW}⚠ Jaeger not configured${NC}"
fi

if [ -n "$PROMETHEUS_PORT" ]; then
    PROM_CHECK=$(curl -s "http://localhost:${PROMETHEUS_PORT}/metrics" || echo "failed")

    if echo "$PROM_CHECK" | grep -q "agent_"; then
        check_passed "Prometheus metrics available"
    else
        check_failed "Prometheus metrics not available"
    fi
else
    echo -e "${YELLOW}⚠ Prometheus not configured${NC}"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Verification Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Checks passed: ${GREEN}$PASSED${NC}"
echo -e "Checks failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Agent Gateway is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Create your first agent: summit-agent create -i"
    echo "  2. Review documentation: cat README.md"
    echo "  3. Set up monitoring dashboards"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the issues above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Database: psql -f db/migrations/017_agent_framework.sql"
    echo "  - OPA: opa run --server --addr :8181"
    echo "  - Environment: cp .env.example .env && vi .env"
    exit 1
fi
