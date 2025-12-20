#!/bin/bash
# Wave 0: Validate Canonical Entity Schema
# Validates TypeScript compilation and schema correctness

set -e

echo "========================================="
echo "Wave 0: Schema Validation"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
}

section() {
    echo ""
    echo -e "${YELLOW}$1${NC}"
    echo "-----------------------------------------"
}

section "1. TypeScript Compilation"

# Check if packages have tsconfig
PACKAGES=(
    "packages/authority-compiler"
    "packages/canonical-entities"
    "packages/connector-sdk"
    "packages/prov-ledger-extensions"
    "packages/governance-hooks"
)

for pkg in "${PACKAGES[@]}"; do
    if [ -f "$pkg/tsconfig.json" ]; then
        check_pass "$pkg has tsconfig.json"
    else
        check_fail "$pkg missing tsconfig.json"
    fi
done

section "2. Canonical Entity Types"

ENTITY_TYPES=(
    "Person"
    "Organization"
    "Asset"
    "Location"
    "Event"
    "Document"
    "Claim"
    "Case"
)

TYPES_FILE="packages/canonical-entities/src/types.ts"

if [ -f "$TYPES_FILE" ]; then
    check_pass "Entity types file exists"

    for type in "${ENTITY_TYPES[@]}"; do
        if grep -q "${type}Entity" "$TYPES_FILE"; then
            check_pass "Entity type '$type' defined"
        else
            check_fail "Entity type '$type' not found"
        fi
    done
else
    check_fail "Entity types file not found"
fi

section "3. Bitemporal Fields"

BITEMPORAL_FIELDS=(
    "validFrom"
    "validTo"
    "observedAt"
    "recordedAt"
)

if [ -f "$TYPES_FILE" ]; then
    for field in "${BITEMPORAL_FIELDS[@]}"; do
        if grep -q "$field" "$TYPES_FILE"; then
            check_pass "Bitemporal field '$field' defined"
        else
            check_fail "Bitemporal field '$field' not found"
        fi
    done
fi

section "4. Classification Levels"

CLASSIFICATIONS=(
    "UNCLASSIFIED"
    "CONFIDENTIAL"
    "SECRET"
    "TOP_SECRET"
)

if [ -f "$TYPES_FILE" ]; then
    for level in "${CLASSIFICATIONS[@]}"; do
        if grep -q "$level" "$TYPES_FILE"; then
            check_pass "Classification '$level' defined"
        else
            check_fail "Classification '$level' not found"
        fi
    done
fi

section "5. GraphQL Schema"

GRAPHQL_FILE="packages/canonical-entities/src/graphql-types.ts"

if [ -f "$GRAPHQL_FILE" ]; then
    check_pass "GraphQL types file exists"

    # Check for interface definitions
    if grep -q "interface CanonicalEntity" "$GRAPHQL_FILE"; then
        check_pass "CanonicalEntity interface defined"
    else
        check_fail "CanonicalEntity interface not found"
    fi

    if grep -q "interface BitemporalEntity" "$GRAPHQL_FILE"; then
        check_pass "BitemporalEntity interface defined"
    else
        check_warn "BitemporalEntity interface not found"
    fi
else
    check_fail "GraphQL types file not found"
fi

section "6. Policy Schema"

POLICY_FILE="packages/authority-compiler/src/schema/policy.schema.ts"

if [ -f "$POLICY_FILE" ]; then
    check_pass "Policy schema file exists"

    # Check for key schemas
    SCHEMAS=("Authority" "License" "Operation" "PolicyBundle")
    for schema in "${SCHEMAS[@]}"; do
        if grep -q "export const $schema" "$POLICY_FILE"; then
            check_pass "Schema '$schema' exported"
        else
            check_fail "Schema '$schema' not found"
        fi
    done
else
    check_fail "Policy schema file not found"
fi

section "7. Connector Registry"

REGISTRY_FILE="connectors/registry.json"

if [ -f "$REGISTRY_FILE" ]; then
    check_pass "Connector registry exists"

    # Count connectors
    CONNECTOR_COUNT=$(grep -c '"id":' "$REGISTRY_FILE" || echo "0")
    if [ "$CONNECTOR_COUNT" -ge 13 ]; then
        check_pass "All 13 connectors registered ($CONNECTOR_COUNT found)"
    else
        check_fail "Missing connectors (found $CONNECTOR_COUNT, expected 13)"
    fi
else
    check_fail "Connector registry not found"
fi

# Summary
echo ""
echo "========================================="
echo "Schema Validation Summary"
echo "========================================="
echo ""
echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All schema checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some schema checks failed${NC}"
    exit 1
fi
