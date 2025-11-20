#!/bin/bash

# Development Environment Check Script
# Verifies that all prerequisites and services are properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emojis
CHECK="✅"
CROSS="❌"
WARN="⚠️"
INFO="ℹ️"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Summit/IntelGraph Development Check${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Track results
ERRORS=0
WARNINGS=0
CHECKS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}${CHECK} $1${NC}"
    CHECKS=$((CHECKS + 1))
}

check_fail() {
    echo -e "${RED}${CROSS} $1${NC}"
    ERRORS=$((ERRORS + 1))
    CHECKS=$((CHECKS + 1))
}

check_warn() {
    echo -e "${YELLOW}${WARN} $1${NC}"
    WARNINGS=$((WARNINGS + 1))
    CHECKS=$((CHECKS + 1))
}

check_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

# 1. Check Node.js
echo -e "${BLUE}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        check_pass "Node.js v$NODE_VERSION installed"
    else
        check_fail "Node.js v$NODE_VERSION is too old (need v18+)"
    fi
else
    check_fail "Node.js not found. Install from https://nodejs.org/"
fi
echo ""

# 2. Check pnpm
echo -e "${BLUE}Checking pnpm...${NC}"
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    MAJOR_VERSION=$(echo $PNPM_VERSION | cut -d. -f1)
    if [ "$MAJOR_VERSION" -ge 9 ]; then
        check_pass "pnpm v$PNPM_VERSION installed"
    else
        check_fail "pnpm v$PNPM_VERSION is too old (need v9+)"
        check_info "Run: corepack enable && corepack prepare pnpm@9.12.3 --activate"
    fi
else
    check_fail "pnpm not found. Run: corepack enable"
fi
echo ""

# 3. Check Docker
echo -e "${BLUE}Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    check_pass "Docker v$DOCKER_VERSION installed"
    
    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        check_pass "Docker daemon is running"
    else
        check_fail "Docker daemon is not running. Start Docker Desktop."
    fi
else
    check_fail "Docker not found. Install from https://www.docker.com/"
fi
echo ""

# 4. Check Docker Compose
echo -e "${BLUE}Checking Docker Compose...${NC}"
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version | awk '{print $4}' | sed 's/v//')
    check_pass "Docker Compose v$COMPOSE_VERSION installed"
else
    check_fail "Docker Compose not found or outdated"
fi
echo ""

# 5. Check Git
echo -e "${BLUE}Checking Git...${NC}"
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    check_pass "Git v$GIT_VERSION installed"
else
    check_fail "Git not found. Install from https://git-scm.com/"
fi
echo ""

# 6. Check Make
echo -e "${BLUE}Checking Make...${NC}"
if command -v make &> /dev/null; then
    MAKE_VERSION=$(make --version | head -n1 | awk '{print $3}')
    check_pass "Make v$MAKE_VERSION installed"
else
    check_warn "Make not found. Some commands may not work."
    check_info "Install build-essential (Linux) or Xcode Command Line Tools (macOS)"
fi
echo ""

# 7. Check Python (optional but recommended)
echo -e "${BLUE}Checking Python (optional)...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    check_pass "Python v$PYTHON_VERSION installed"
else
    check_warn "Python3 not found. Some features may not work."
fi
echo ""

# 8. Check environment file
echo -e "${BLUE}Checking environment configuration...${NC}"
if [ -f ".env" ]; then
    check_pass ".env file exists"
    
    # Check for required variables
    REQUIRED_VARS=("NODE_ENV" "DATABASE_URL" "NEO4J_URI")
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${VAR}=" .env; then
            check_pass "$VAR is set"
        else
            check_fail "$VAR is missing from .env"
        fi
    done
else
    check_fail ".env file not found. Run: cp .env.example .env"
fi
echo ""

# 9. Check node_modules
echo -e "${BLUE}Checking dependencies...${NC}"
if [ -d "node_modules" ]; then
    check_pass "node_modules exists"
else
    check_fail "node_modules not found. Run: pnpm install"
fi
echo ""

# 10. Check Husky hooks
echo -e "${BLUE}Checking Git hooks...${NC}"
if [ -d ".husky" ] && [ -f ".husky/pre-commit" ]; then
    check_pass "Husky hooks are installed"
else
    check_warn "Husky hooks not found. Run: pnpm install && pnpm run prepare"
fi
echo ""

# 11. Check Docker services (if running)
echo -e "${BLUE}Checking Docker services...${NC}"
if docker compose ps 2>/dev/null | grep -q "Up"; then
    check_pass "Docker services are running"
    
    # Check specific services
    SERVICES=("neo4j" "postgres" "redis")
    for SERVICE in "${SERVICES[@]}"; do
        if docker compose ps 2>/dev/null | grep -q "$SERVICE.*Up"; then
            check_pass "$SERVICE is running"
        else
            check_warn "$SERVICE is not running"
        fi
    done
else
    check_warn "Docker services are not running. Start with: make up"
fi
echo ""

# 12. Check ports
echo -e "${BLUE}Checking port availability...${NC}"
PORTS=(3000 4000 5432 6379 7474 7687)
PORT_NAMES=("Frontend" "API" "PostgreSQL" "Redis" "Neo4j HTTP" "Neo4j Bolt")

for i in "${!PORTS[@]}"; do
    PORT=${PORTS[$i]}
    NAME=${PORT_NAMES[$i]}
    
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        check_pass "Port $PORT ($NAME) is in use"
    else
        check_warn "Port $PORT ($NAME) is not in use"
    fi
done
echo ""

# 13. Check disk space
echo -e "${BLUE}Checking disk space...${NC}"
AVAILABLE=$(df -h . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "${AVAILABLE%.*}" -gt 10 ]; then
    check_pass "Sufficient disk space available (${AVAILABLE}G)"
else
    check_warn "Low disk space (${AVAILABLE}G available, recommend 10G+)"
fi
echo ""

# 14. Check memory
echo -e "${BLUE}Checking available memory...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    TOTAL_MEM=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
else
    # Linux
    TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
fi

if [ "$TOTAL_MEM" -ge 8 ]; then
    check_pass "Sufficient memory (${TOTAL_MEM}GB total)"
else
    check_warn "Limited memory (${TOTAL_MEM}GB total, recommend 8GB+)"
fi
echo ""

# Summary
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Total checks: $CHECKS"
echo -e "${GREEN}Passed: $((CHECKS - ERRORS - WARNINGS))${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}${CHECK} All checks passed! You're ready to develop.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. make up       # Start services"
    echo "  2. make smoke    # Run tests"
    echo "  3. pnpm dev      # Start development"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}${WARN} Some warnings found. Development should work but may have issues.${NC}"
    echo ""
    echo "Consider addressing warnings for best experience."
    exit 0
else
    echo -e "${RED}${CROSS} Critical errors found. Please fix errors before continuing.${NC}"
    echo ""
    echo "See documentation:"
    echo "  - docs/DEVELOPER_ONBOARDING.md"
    echo "  - docs/TROUBLESHOOTING.md"
    exit 1
fi
