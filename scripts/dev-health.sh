#!/bin/bash
# scripts/dev-health.sh - Development environment health check
# Provides quick diagnostics for local development setup
#
# Usage: ./scripts/dev-health.sh [--verbose|-v]
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERBOSE=${1:-""}
ERRORS=0
WARNINGS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_ok() {
    echo -e "  ${GREEN}✅${NC} $1"
}

print_warn() {
    echo -e "  ${YELLOW}⚠️${NC}  $1"
    ((WARNINGS++))
}

print_fail() {
    echo -e "  ${RED}❌${NC} $1"
    ((ERRORS++))
}

print_info() {
    echo -e "  ${BLUE}ℹ️${NC}  $1"
}

# ═══════════════════════════════════════════════════════════════════════════
# Version Checks
# ═══════════════════════════════════════════════════════════════════════════
check_versions() {
    print_header "Version Checks"

    # Expected versions
    EXPECTED_NODE="20.19.0"
    EXPECTED_PNPM="10.0.0"

    # Node.js
    if command -v node &> /dev/null; then
        ACTUAL_NODE=$(node -v | tr -d 'v')
        if [[ "$ACTUAL_NODE" == "$EXPECTED_NODE" ]]; then
            print_ok "Node.js: $ACTUAL_NODE"
        else
            print_warn "Node.js: $ACTUAL_NODE (expected: $EXPECTED_NODE)"
        fi
    else
        print_fail "Node.js: NOT INSTALLED"
    fi

    # pnpm
    if command -v pnpm &> /dev/null; then
        ACTUAL_PNPM=$(pnpm -v)
        if [[ "$ACTUAL_PNPM" == "$EXPECTED_PNPM" ]]; then
            print_ok "pnpm: $ACTUAL_PNPM"
        else
            print_warn "pnpm: $ACTUAL_PNPM (expected: $EXPECTED_PNPM)"
        fi
    else
        print_fail "pnpm: NOT INSTALLED"
    fi

    # Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
        print_ok "Docker: $DOCKER_VERSION"
    else
        print_warn "Docker: NOT INSTALLED (optional for local dev)"
    fi

    # Docker Compose
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
        if docker compose version &> /dev/null 2>&1; then
            COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "v2+")
        else
            COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f4 | tr -d ',')
        fi
        print_ok "Docker Compose: $COMPOSE_VERSION"
    else
        print_warn "Docker Compose: NOT INSTALLED (optional for local dev)"
    fi

    # Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        print_ok "Git: $GIT_VERSION"
    else
        print_fail "Git: NOT INSTALLED"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Service Health Checks
# ═══════════════════════════════════════════════════════════════════════════
check_services() {
    print_header "Service Health"

    # Define services to check
    declare -A SERVICES=(
        ["PostgreSQL"]=5434
        ["Redis"]=6379
        ["Neo4j HTTP"]=7474
        ["Neo4j Bolt"]=7687
        ["API Server"]=4000
        ["UI Server"]=3000
        ["OPA"]=8181
    )

    for service in "${!SERVICES[@]}"; do
        port=${SERVICES[$service]}
        if nc -z localhost "$port" 2>/dev/null; then
            print_ok "$service (port $port)"
        else
            print_info "$service (port $port) - not running"
        fi
    done
}

# ═══════════════════════════════════════════════════════════════════════════
# Git Status
# ═══════════════════════════════════════════════════════════════════════════
check_git() {
    print_header "Git Status"

    if [ -d ".git" ]; then
        BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
        print_ok "Branch: $BRANCH"

        # Count uncommitted changes
        UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
        if [ "$UNCOMMITTED" -eq 0 ]; then
            print_ok "Working tree: clean"
        else
            print_info "Working tree: $UNCOMMITTED uncommitted changes"
        fi

        # Check if up to date with remote
        git fetch origin --dry-run 2>/dev/null || true
        LOCAL=$(git rev-parse HEAD 2>/dev/null)
        REMOTE=$(git rev-parse "@{u}" 2>/dev/null || echo "")
        if [ -n "$REMOTE" ]; then
            if [ "$LOCAL" == "$REMOTE" ]; then
                print_ok "Up to date with remote"
            else
                BEHIND=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
                AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
                if [ "$BEHIND" -gt 0 ]; then
                    print_warn "Behind remote by $BEHIND commits"
                fi
                if [ "$AHEAD" -gt 0 ]; then
                    print_info "Ahead of remote by $AHEAD commits"
                fi
            fi
        fi
    else
        print_fail "Not a git repository"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Dependencies Check
# ═══════════════════════════════════════════════════════════════════════════
check_dependencies() {
    print_header "Dependencies"

    if [ -d "node_modules" ]; then
        MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
        print_ok "node_modules: $MODULE_COUNT packages installed"
    else
        print_warn "node_modules: not installed (run 'pnpm install')"
    fi

    # Check for lockfile
    if [ -f "pnpm-lock.yaml" ]; then
        print_ok "pnpm-lock.yaml: present"
    else
        print_fail "pnpm-lock.yaml: missing"
    fi

    # Check for outdated dependencies (quick check)
    if [ "$VERBOSE" == "--verbose" ] || [ "$VERBOSE" == "-v" ]; then
        print_info "Checking for outdated dependencies..."
        pnpm outdated 2>/dev/null | head -10 || true
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Environment Configuration
# ═══════════════════════════════════════════════════════════════════════════
check_environment() {
    print_header "Environment Configuration"

    # Check for .env file
    if [ -f ".env" ]; then
        print_ok ".env file: present"
    elif [ -f ".env.example" ]; then
        print_warn ".env file: missing (copy from .env.example)"
    else
        print_info ".env file: not required or missing template"
    fi

    # Check key environment variables
    if [ -n "${DATABASE_URL:-}" ]; then
        print_ok "DATABASE_URL: set"
    else
        print_info "DATABASE_URL: not set"
    fi

    if [ -n "${REDIS_URL:-}" ]; then
        print_ok "REDIS_URL: set"
    else
        print_info "REDIS_URL: not set"
    fi

    if [ -n "${NEO4J_URI:-}" ]; then
        print_ok "NEO4J_URI: set"
    else
        print_info "NEO4J_URI: not set"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Disk Space
# ═══════════════════════════════════════════════════════════════════════════
check_disk() {
    print_header "Disk Space"

    # Repository size
    if command -v du &> /dev/null; then
        REPO_SIZE=$(du -sh . 2>/dev/null | cut -f1)
        print_info "Repository size: $REPO_SIZE"
    fi

    # Available disk space
    AVAILABLE=$(df -h . 2>/dev/null | tail -1 | awk '{print $4}')
    print_info "Available disk space: $AVAILABLE"

    # Docker disk usage
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        DOCKER_SPACE=$(docker system df 2>/dev/null | grep "Images" | awk '{print $4}' || echo "unknown")
        print_info "Docker images: $DOCKER_SPACE reclaimable"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Quick Tests
# ═══════════════════════════════════════════════════════════════════════════
check_quick_tests() {
    print_header "Quick Validation"

    # TypeScript compilation check
    if [ -f "tsconfig.json" ]; then
        if command -v tsc &> /dev/null || [ -f "node_modules/.bin/tsc" ]; then
            print_info "Running quick typecheck..."
            if timeout 30 pnpm typecheck 2>/dev/null; then
                print_ok "TypeScript: compiles successfully"
            else
                print_warn "TypeScript: compilation issues detected"
            fi
        else
            print_info "TypeScript: tsc not available"
        fi
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════
print_summary() {
    print_header "Summary"

    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo -e "  ${GREEN}All checks passed!${NC} Your development environment is ready."
    elif [ $ERRORS -eq 0 ]; then
        echo -e "  ${YELLOW}$WARNINGS warning(s)${NC} - environment is usable but may have issues."
    else
        echo -e "  ${RED}$ERRORS error(s)${NC} and ${YELLOW}$WARNINGS warning(s)${NC} - please fix errors before proceeding."
    fi

    echo ""
    echo "  Run 'make dev-up' to start development services"
    echo "  Run 'pnpm install' if dependencies are missing"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           Summit Development Environment Health Check         ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    check_versions
    check_services
    check_git
    check_dependencies
    check_environment
    check_disk

    if [ "$VERBOSE" == "--verbose" ] || [ "$VERBOSE" == "-v" ]; then
        check_quick_tests
    fi

    print_summary

    if [ $ERRORS -gt 0 ]; then
        exit 1
    fi
    exit 0
}

main "$@"
