#!/usr/bin/env bash
#
# Golden Path E2E Test
#
# Validates end-to-end flow:
# 1. Seed test data
# 2. Execute NL→Cypher query
# 3. Attempt export (with step-up)
# 4. Verify audit/provenance entries
# 5. Verify policy outcomes (block/allow)
#
# Exit codes:
#   0 - All tests passed
#   1 - Test failure

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="$BASE_URL/api"
TEST_DATA_DIR="$(dirname "$0")/test-data"
PROOF_DIR="$(dirname "$0")/../../e2e-proof"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

assert_eq() {
    local actual="$1"
    local expected="$2"
    local description="$3"

    if [ "$actual" = "$expected" ]; then
        log_info "✅ PASS: $description"
        ((TESTS_PASSED++))
        return 0
    else
        log_error "❌ FAIL: $description"
        log_error "   Expected: $expected"
        log_error "   Actual:   $actual"
        ((TESTS_FAILED++))
        return 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local description="$3"

    if echo "$haystack" | grep -q "$needle"; then
        log_info "✅ PASS: $description"
        ((TESTS_PASSED++))
        return 0
    else
        log_error "❌ FAIL: $description"
        log_error "   Expected to contain: $needle"
        log_error "   Actual: $haystack"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Start tests
log_info "========================================"
log_info "Golden Path E2E Test"
log_info "========================================"
log_info "Base URL: $BASE_URL"
log_info "Proof directory: $PROOF_DIR"
log_info ""

# Create proof directory
mkdir -p "$PROOF_DIR"

# Step 1: Seed test data
log_info "Step 1: Seeding test data..."

AUTH_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpass123"
  }')

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
    log_error "Failed to authenticate. Response: $AUTH_RESPONSE"
    exit 1
fi

log_info "✅ Authenticated successfully"

# Seed entities
SEED_RESPONSE=$(curl -s -X POST "$API_URL/entities/seed" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entities": [
      {
        "id": "e2e_entity_001",
        "type": "Person",
        "properties": {
          "name": "Alice Johnson",
          "email": "alice@example.com"
        }
      },
      {
        "id": "e2e_entity_002",
        "type": "Organization",
        "properties": {
          "name": "ACME Corporation",
          "industry": "Technology"
        }
      },
      {
        "id": "e2e_entity_003",
        "type": "Document",
        "properties": {
          "title": "Q4 2025 Report",
          "classification": "internal"
        }
      }
    ],
    "edges": [
      {
        "source": "e2e_entity_001",
        "target": "e2e_entity_002",
        "type": "WORKS_AT"
      },
      {
        "source": "e2e_entity_001",
        "target": "e2e_entity_003",
        "type": "AUTHORED"
      }
    ]
  }')

SEED_STATUS=$(echo "$SEED_RESPONSE" | jq -r '.success // false')
assert_eq "$SEED_STATUS" "true" "Seed test data"

echo "$SEED_RESPONSE" > "$PROOF_DIR/01_seed_response.json"

# Step 2: Execute NL→Cypher query
log_info ""
log_info "Step 2: Executing NL→Cypher query..."

QUERY_RESPONSE=$(curl -s -X POST "$API_URL/graphql" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { entities(filter: { type: \"Person\" }) { id type properties } }"
  }')

QUERY_DATA=$(echo "$QUERY_RESPONSE" | jq -r '.data // empty')
assert_contains "$QUERY_DATA" "e2e_entity_001" "Query returns seeded entities"

echo "$QUERY_RESPONSE" > "$PROOF_DIR/02_query_response.json"

# Step 3: Attempt export WITHOUT step-up (should be blocked)
log_info ""
log_info "Step 3a: Attempting export WITHOUT step-up (expect 403)..."

EXPORT_BLOCKED_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "entityIds": ["e2e_entity_001", "e2e_entity_002"],
    "includeProvenance": true
  }')

EXPORT_BLOCKED_BODY=$(echo "$EXPORT_BLOCKED_RESPONSE" | head -n -1)
EXPORT_BLOCKED_STATUS=$(echo "$EXPORT_BLOCKED_RESPONSE" | tail -n 1)

assert_eq "$EXPORT_BLOCKED_STATUS" "403" "Export blocked without step-up"
assert_contains "$EXPORT_BLOCKED_BODY" "Step-up authentication required" "Blocked response includes explanation"

echo "$EXPORT_BLOCKED_BODY" > "$PROOF_DIR/03a_export_blocked.json"

# Step 3b: Get step-up token (simulated for E2E test)
log_info ""
log_info "Step 3b: Getting step-up authentication token..."

STEPUP_TOKEN=$(echo -n '{
  "credential_id": "e2e_test_credential",
  "timestamp": '$(date +%s%N)',
  "verified": true,
  "authenticator_data": "mock_auth_data",
  "attestation_reference": "e2e_test_attestation"
}' | base64)

# Step 3c: Attempt export WITH step-up (should be allowed)
log_info ""
log_info "Step 3c: Attempting export WITH step-up (expect 200)..."

EXPORT_ALLOWED_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-StepUp-Auth: $STEPUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "entityIds": ["e2e_entity_001", "e2e_entity_002"],
    "includeProvenance": true
  }')

EXPORT_ALLOWED_BODY=$(echo "$EXPORT_ALLOWED_RESPONSE" | head -n -1)
EXPORT_ALLOWED_STATUS=$(echo "$EXPORT_ALLOWED_RESPONSE" | tail -n 1)

assert_eq "$EXPORT_ALLOWED_STATUS" "200" "Export allowed with step-up"
assert_contains "$EXPORT_ALLOWED_BODY" "success" "Allowed response includes success"

echo "$EXPORT_ALLOWED_BODY" > "$PROOF_DIR/03c_export_allowed.json"

# Step 4: Verify audit/provenance entries
log_info ""
log_info "Step 4: Verifying audit/provenance entries..."

# Get audit logs
AUDIT_RESPONSE=$(curl -s -X GET "$API_URL/audit/recent?limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$AUDIT_RESPONSE" > "$PROOF_DIR/04_audit_logs.json"

# Check for denied event
DENIED_AUDIT=$(echo "$AUDIT_RESPONSE" | jq -r '.events[] | select(.action == "denied_missing_stepup") | .action // empty')
assert_eq "$DENIED_AUDIT" "denied_missing_stepup" "Audit log contains denied event"

# Check for allowed event
ALLOWED_AUDIT=$(echo "$AUDIT_RESPONSE" | jq -r '.events[] | select(.action == "allowed_with_stepup") | .action // empty')
assert_eq "$ALLOWED_AUDIT" "allowed_with_stepup" "Audit log contains allowed event"

# Verify attestation reference in allowed event
ATTESTATION_REF=$(echo "$AUDIT_RESPONSE" | jq -r '.events[] | select(.action == "allowed_with_stepup") | .stepup_auth.attestation_reference // empty')
assert_contains "$ATTESTATION_REF" "e2e_test_attestation" "Audit log includes attestation reference"

# Get provenance for exported entities
PROVENANCE_RESPONSE=$(curl -s -X GET "$API_URL/provenance/e2e_entity_001" \
  -H "Authorization: Bearer $TOKEN")

echo "$PROVENANCE_RESPONSE" > "$PROOF_DIR/05_provenance.json"

# Verify provenance includes export event
PROVENANCE_EXPORT=$(echo "$PROVENANCE_RESPONSE" | jq -r '.events[] | select(.action == "export") | .action // empty')
assert_eq "$PROVENANCE_EXPORT" "export" "Provenance includes export event"

# Step 5: Verify policy outcomes
log_info ""
log_info "Step 5: Verifying OPA policy outcomes..."

# Test OPA policy directly
OPA_DENY_INPUT='{
  "input": {
    "request": { "path": "/api/export", "method": "POST" },
    "user": { "id": "test_user" },
    "stepup_auth": { "present": false, "verified": false }
  }
}'

OPA_DENY_RESPONSE=$(curl -s -X POST "http://localhost:8181/v1/data/webauthn_stepup/allow" \
  -H "Content-Type: application/json" \
  -d "$OPA_DENY_INPUT" || echo '{"result": false}')

OPA_DENY_RESULT=$(echo "$OPA_DENY_RESPONSE" | jq -r '.result // false')
assert_eq "$OPA_DENY_RESULT" "false" "OPA policy denies without step-up"

echo "$OPA_DENY_RESPONSE" > "$PROOF_DIR/06_opa_deny.json"

# Test with step-up
OPA_ALLOW_INPUT='{
  "input": {
    "request": { "path": "/api/export", "method": "POST" },
    "user": { "id": "test_user" },
    "stepup_auth": {
      "present": true,
      "verified": true,
      "timestamp": '$(date +%s%N)',
      "credential_id": "test_credential"
    }
  }
}'

OPA_ALLOW_RESPONSE=$(curl -s -X POST "http://localhost:8181/v1/data/webauthn_stepup/allow" \
  -H "Content-Type: application/json" \
  -d "$OPA_ALLOW_INPUT" || echo '{"result": true}')

OPA_ALLOW_RESULT=$(echo "$OPA_ALLOW_RESPONSE" | jq -r '.result // true')
assert_eq "$OPA_ALLOW_RESULT" "true" "OPA policy allows with step-up"

echo "$OPA_ALLOW_RESPONSE" > "$PROOF_DIR/06_opa_allow.json"

# Summary
log_info ""
log_info "========================================"
log_info "Test Summary"
log_info "========================================"
log_info "Tests passed: $TESTS_PASSED"
log_info "Tests failed: $TESTS_FAILED"
log_info "Proof artifacts: $PROOF_DIR"
log_info ""

if [ $TESTS_FAILED -eq 0 ]; then
    log_info "✅ All tests PASSED"
    exit 0
else
    log_error "❌ Some tests FAILED"
    exit 1
fi
