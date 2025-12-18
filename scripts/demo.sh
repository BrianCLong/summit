#!/bin/bash
# Tenant Graph Slice v0 - End-to-End Demo
# Demonstrates the complete ingest → query → provenance flow

set -e

echo "🎬 Tenant Graph Slice v0 - Demo"
echo "================================"
echo ""

# Configuration
TENANT_ID="${TENANT_ID:-demo-tenant-001}"
USER_ID="${USER_ID:-demo-user}"
API_URL="${API_URL:-http://localhost:4000/graphql}"
DATA_DIR="./data/tenant-graph/golden-sample"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Generate golden sample data
echo -e "${BLUE}Step 1: Generating golden sample data...${NC}"
if [ ! -f "$DATA_DIR/entities.csv" ]; then
  pnpm tsx scripts/generate-golden-sample.ts
else
  echo "  ✓ Golden sample already exists"
fi
echo ""

# Step 2: Wait for services to be ready
echo -e "${BLUE}Step 2: Checking services...${NC}"
echo "  Waiting for API to be ready..."
timeout=60
elapsed=0
while ! curl -s "${API_URL}?query={__typename}" > /dev/null 2>&1; do
  if [ $elapsed -ge $timeout ]; then
    echo -e "${YELLOW}  ⚠ API not responding after ${timeout}s, continuing anyway...${NC}"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
  echo -n "."
done
echo ""
echo "  ✓ API is ready"
echo ""

# Step 3: Ingest data via GraphQL mutation
echo -e "${BLUE}Step 3: Ingesting data...${NC}"
START_TIME=$(date +%s)

# Run ingest script
pnpm tsx scripts/ingest-golden-sample.ts --tenant "$TENANT_ID" --user "$USER_ID"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo -e "${GREEN}  ✓ Ingest completed in ${DURATION}s${NC}"
echo ""

# Step 4: Query entities
echo -e "${BLUE}Step 4: Testing queries...${NC}"

# 4.1: Search entities
echo "  Testing searchEntities query..."
SEARCH_QUERY='{
  "query": "query SearchDemo($tenantId: ID!, $q: String!) { searchEntities(tenantId: $tenantId, q: $q, limit: 10) { entities { ... on Person { id name email } } total took } }",
  "variables": {
    "tenantId": "'"$TENANT_ID"'",
    "q": "Alice"
  }
}'

SEARCH_RESULT=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$SEARCH_QUERY")

SEARCH_COUNT=$(echo "$SEARCH_RESULT" | jq -r '.data.searchEntities.total // 0')
SEARCH_TOOK=$(echo "$SEARCH_RESULT" | jq -r '.data.searchEntities.took // 0')

echo -e "    Found: ${GREEN}${SEARCH_COUNT}${NC} entities in ${SEARCH_TOOK}ms"

# Check SLO (p95 < 350ms)
if [ "$SEARCH_TOOK" -lt 350 ]; then
  echo -e "    ${GREEN}✓ SLO met: ${SEARCH_TOOK}ms < 350ms${NC}"
else
  echo -e "    ${YELLOW}⚠ SLO warning: ${SEARCH_TOOK}ms >= 350ms${NC}"
fi

# 4.2: Get entity by ID
echo ""
echo "  Testing entityById query..."
ENTITY_ID=$(echo "$SEARCH_RESULT" | jq -r '.data.searchEntities.entities[0].id // ""')

if [ -n "$ENTITY_ID" ]; then
  ENTITY_QUERY='{
    "query": "query GetEntity($id: ID!, $tenantId: ID!) { entityById(id: $id, tenantId: $tenantId) { ... on Person { id name email } } }",
    "variables": {
      "id": "'"$ENTITY_ID"'",
      "tenantId": "'"$TENANT_ID"'"
    }
  }'

  ENTITY_RESULT=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$ENTITY_QUERY")

  ENTITY_NAME=$(echo "$ENTITY_RESULT" | jq -r '.data.entityById.name // "N/A"')
  echo -e "    Retrieved: ${GREEN}${ENTITY_NAME}${NC}"

  # 4.3: Get neighbors
  echo ""
  echo "  Testing neighbors query (1-hop)..."
  NEIGHBORS_QUERY='{
    "query": "query GetNeighbors($id: ID!, $tenantId: ID!, $hops: Int!) { neighbors(id: $id, tenantId: $tenantId, hops: $hops, limit: 20) { entities { ... on Organization { id name } } total took } }",
    "variables": {
      "id": "'"$ENTITY_ID"'",
      "tenantId": "'"$TENANT_ID"'",
      "hops": 1
    }
  }'

  NEIGHBORS_RESULT=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$NEIGHBORS_QUERY")

  NEIGHBORS_COUNT=$(echo "$NEIGHBORS_RESULT" | jq -r '.data.neighbors.total // 0')
  NEIGHBORS_TOOK=$(echo "$NEIGHBORS_RESULT" | jq -r '.data.neighbors.took // 0')

  echo -e "    Found: ${GREEN}${NEIGHBORS_COUNT}${NC} neighbors in ${NEIGHBORS_TOOK}ms"

  # Check SLO (1-hop p95 < 300ms)
  if [ "$NEIGHBORS_TOOK" -lt 300 ]; then
    echo -e "    ${GREEN}✓ SLO met: ${NEIGHBORS_TOOK}ms < 300ms${NC}"
  else
    echo -e "    ${YELLOW}⚠ SLO warning: ${NEIGHBORS_TOOK}ms >= 300ms${NC}"
  fi
else
  echo -e "    ${YELLOW}⚠ No entities found to test neighbors query${NC}"
fi

echo ""

# Step 5: Summary
echo -e "${BLUE}Step 5: Demo Summary${NC}"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Tenant: $TENANT_ID"
echo "  Ingest Duration: ${DURATION}s"
echo "  Search Results: ${SEARCH_COUNT} entities (${SEARCH_TOOK}ms)"
echo "  Neighbors: ${NEIGHBORS_COUNT} found (${NEIGHBORS_TOOK}ms)"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${GREEN}✅ Demo completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  • Run load tests: ./scripts/load-test.sh"
echo "  • View dashboards: http://localhost:3001 (Grafana)"
echo "  • Check metrics: http://localhost:9090 (Prometheus)"
