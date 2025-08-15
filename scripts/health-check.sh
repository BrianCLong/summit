#!/bin/bash

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🏥 IntelGraph Health Check${NC}"
echo ""

# Function to check HTTP endpoint
check_http() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name ($url)... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null); then
        if [ "$response" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ OK ($response)${NC}"
            return 0
        else
            echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL (Connection failed)${NC}"
        return 1
    fi
}

# Function to check Docker service
check_docker_service() {
    local service=$1
    echo -n "Checking Docker service $service... "
    
    if docker-compose -f docker-compose.dev.yml ps $service | grep -q "Up"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not running${NC}"
        return 1
    fi
}

# Function to check Docker service health
check_docker_health() {
    local service=$1
    echo -n "Checking $service health... "
    
    if docker-compose -f docker-compose.dev.yml ps $service | grep -q "healthy"; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        status=$(docker-compose -f docker-compose.dev.yml ps $service | tail -n +2 | awk '{print $4}' || echo "unknown")
        echo -e "${YELLOW}⚠️  $status${NC}"
        return 1
    fi
}

# Track overall health
overall_health=0

echo -e "${YELLOW}=== Docker Services ===${NC}"
check_docker_service "postgres" || overall_health=1
check_docker_service "neo4j" || overall_health=1
check_docker_service "redis" || overall_health=1
check_docker_service "server" || overall_health=1
check_docker_service "client" || overall_health=1

echo ""
echo -e "${YELLOW}=== Service Health Checks ===${NC}"
check_docker_health "postgres" || overall_health=1
check_docker_health "neo4j" || overall_health=1
check_docker_health "redis" || overall_health=1

echo ""
echo -e "${YELLOW}=== HTTP Endpoints ===${NC}"
check_http "Frontend" "http://localhost:3000" || overall_health=1
check_http "Backend GraphQL" "http://localhost:4000/graphql" || overall_health=1
check_http "Neo4j Browser" "http://localhost:7474" || overall_health=1
check_http "Adminer" "http://localhost:8080" || overall_health=1

echo ""
echo -e "${YELLOW}=== Database Connectivity ===${NC}"

# Test Neo4j connectivity
echo -n "Testing Neo4j connection... "
if docker-compose -f docker-compose.dev.yml exec -T neo4j cypher-shell -u neo4j -p devpassword "RETURN 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    overall_health=1
fi

# Test PostgreSQL connectivity
echo -n "Testing PostgreSQL connection... "
if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U intelgraph -d intelgraph_dev >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    overall_health=1
fi

# Test Redis connectivity
echo -n "Testing Redis connection... "
if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli -a devpassword ping >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    overall_health=1
fi

echo ""
if [ $overall_health -eq 0 ]; then
    echo -e "${GREEN}🎉 All services are healthy!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some services have issues. Check the logs with: make logs${NC}"
    exit 1
fi