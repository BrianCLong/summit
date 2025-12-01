#!/usr/bin/env bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

REQUIRED_NODE_VERSION=${NODE_VERSION:-18}

echo -e "🔍 \033[1mValidating Local Environment...\033[0m\n"

ERRORS=0

check_tool() {
    local tool=$1
    local version_cmd=${2:-"$tool --version"}

    if command -v $tool &> /dev/null; then
        echo -e "${GREEN}✓ $tool installed${NC} ($($version_cmd | head -n 1))"
    else
        echo -e "${RED}✗ $tool not found${NC}"
        ERRORS=$((ERRORS+1))
    fi
}

check_node_version() {
    if command -v node &> /dev/null; then
        local node_ver=$(node -v | sed 's/v//;s/\..*//')
        if [ "$node_ver" -lt "$REQUIRED_NODE_VERSION" ]; then
            echo -e "${RED}✗ Node.js version $node_ver found, but >= $REQUIRED_NODE_VERSION required${NC}"
            ERRORS=$((ERRORS+1))
        else
            echo -e "${GREEN}✓ Node.js version ok ($node_ver >= $REQUIRED_NODE_VERSION)${NC}"
        fi
    fi
}

check_port_free() {
    local port=$1
    local name=$2

    if command -v lsof >/dev/null 2>&1; then
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Port $port ($name) is in use${NC}"
            return 1
        else
            echo -e "${GREEN}✓ Port $port ($name) is free${NC}"
            return 0
        fi
    else
        echo -e "${YELLOW}⚠️  Cannot check port $port (lsof missing)${NC}"
        return 0
    fi
}

# 1. Check Essential Tools
echo "🛠️  Checking Tools:"
check_tool node "node -v"
check_node_version
check_tool npm "npm -v"
check_tool docker "docker --version"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}✗ Docker daemon is not running${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ Docker daemon is running${NC}"
fi
check_tool python3 "python3 --version"
check_tool make "make --version"
check_tool jq "jq --version"
check_tool curl "curl --version"
check_tool lsof "echo lsof" # Check if lsof exists for port checking

echo ""

# 2. Check Configurations
echo "⚙️  Checking Configurations:"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
else
    echo -e "${YELLOW}⚠️  .env file missing${NC} (Will be created during bootstrap)"
    # Not an error, bootstrap fixes it
fi

echo ""

# 3. Check Ports (Advisory)
echo "🔌 Checking Ports (Advisory - should be free before starting services):"
check_port_free 3000 "Client"
check_port_free 4000 "Server"
check_port_free 5432 "Postgres"
check_port_free 7474 "Neo4j HTTP"
check_port_free 7687 "Neo4j Bolt"
check_port_free 6379 "Redis"
check_port_free 9090 "Prometheus"
check_port_free 3001 "Grafana"

echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Environment looks good!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS issues.${NC} Please fix them before proceeding."
    exit 1
fi
