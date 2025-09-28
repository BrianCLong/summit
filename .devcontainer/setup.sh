#!/bin/bash
# DevContainer Post-Create Setup Script
# Sprint 27A: Fast containerized development environment setup

set -euo pipefail

echo "🚀 Setting up IntelGraph development environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Install dependencies
log_info "Installing Node.js dependencies..."
npm ci

log_info "Installing server dependencies..."
pushd server >/dev/null
npm install
popd >/dev/null

log_info "Installing client dependencies..."
pushd client >/dev/null
npm install
popd >/dev/null

# Install global development tools
log_info "Installing global development tools..."
npm install -g \
    typescript \
    ts-node \
    nodemon \
    concurrently \
    wait-on

# Set up pre-commit hooks if available
if [ -f ".pre-commit-config.yaml" ]; then
    log_info "Installing pre-commit hooks..."
    pre-commit install
    pre-commit install --hook-type commit-msg
fi

# Create necessary directories
log_info "Creating project directories..."
mkdir -p dist reports logs tmp .env.local

# Copy environment configuration
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    log_info "Creating .env from template..."
    cp .env.example .env
    log_warning "Please review and update .env file with your configuration"
fi

# Wait for services to be ready
log_info "Waiting for services to be ready..."

# Wait for PostgreSQL
if command -v pg_isready >/dev/null 2>&1; then
    log_info "Waiting for PostgreSQL..."
    for i in {1..30}; do
        if pg_isready -h postgres -p 5432 -U intelgraph >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi
        sleep 2
    done
fi

# Wait for Redis
if command -v redis-cli >/dev/null 2>&1; then
    log_info "Waiting for Redis..."
    for i in {1..30}; do
        if redis-cli -h redis ping >/dev/null 2>&1; then
            log_success "Redis is ready"
            break
        fi
        sleep 2
    done
fi

# Wait for Neo4j
log_info "Waiting for Neo4j..."
for i in {1..60}; do
    if curl -s http://neo4j:7474 >/dev/null 2>&1; then
        log_success "Neo4j is ready"
        break
    fi
    sleep 3
done

# Run initial database setup if scripts exist
if [ -f "scripts/db/setup.sh" ]; then
    log_info "Running database setup..."
    bash scripts/db/setup.sh
fi

# Run TypeScript compilation check
if [ -f "tsconfig.json" ]; then
    log_info "Running TypeScript compilation check..."
    npx tsc --noEmit
fi

# Run linting check
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
    log_info "Running ESLint check..."
    npx eslint . --ext .ts,.tsx,.js,.jsx --fix || true
fi

# Run formatting
if [ -f ".prettierrc" ] || [ -f "prettier.config.js" ]; then
    log_info "Running Prettier format..."
    npx prettier --write "**/*.{ts,tsx,js,jsx,json,md,yml,yaml}" || true
fi

if command -v docker >/dev/null 2>&1; then
    log_info "Validating compose parity..."
    if ! node scripts/devkit/check-parity.js >/dev/null 2>&1; then
        log_warning "Compose parity check reported drift; run npm run devkit:parity after Docker finishes starting."
    fi
fi

# Install browser dependencies for Playwright if configured
if grep -q "@playwright" package.json; then
    log_info "Installing Playwright browsers..."
    npx playwright install --with-deps
fi

# Verify installation
log_info "Verifying installation..."

# Check Node.js and npm
node_version=$(node --version)
npm_version=$(npm --version)
log_success "Node.js: $node_version, npm: $npm_version"

# Check key development tools
for tool in git docker gh yq jq; do
    if command -v $tool >/dev/null 2>&1; then
        version=$($tool --version 2>/dev/null | head -n1 || echo "unknown")
        log_success "$tool: $version"
    else
        log_warning "$tool not found"
    fi
done

# Generate helpful aliases and shortcuts
cat >> ~/.bashrc << 'EOF'

# IntelGraph Development Aliases
alias dc='docker-compose'
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'
alias npm-reset='rm -rf node_modules package-lock.json && npm install'
alias test-all='npm run test && npm run test:e2e'
alias dev='npm run dev'
alias build='npm run build'
alias lint-fix='npm run lint -- --fix && npm run format'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gco='git checkout'
alias gb='git branch'
alias gm='git merge'

# Useful functions
function psql-dev() {
    PGPASSWORD=dev_password psql -h postgres -U intelgraph -d intelgraph_dev "$@"
}

function redis-dev() {
    redis-cli -h redis "$@"
}

function neo4j-dev() {
    cypher-shell -a bolt://neo4j:7687 -u neo4j -p dev_password "$@"
}

function logs() {
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

function restart() {
    if [ -z "$1" ]; then
        docker-compose restart
    else
        docker-compose restart "$1"
    fi
}

# Environment info
function env-info() {
    echo "🌍 IntelGraph Development Environment"
    echo "📍 Node.js: $(node --version)"
    echo "📦 npm: $(npm --version)"
    echo "🐳 Docker: $(docker --version)"
    echo "🔧 Git: $(git --version)"
    echo "🚀 Services:"
    echo "  - Web App: http://localhost:3000"
    echo "  - API Gateway: http://localhost:4000"
    echo "  - Mock Services: http://localhost:4010"
    echo "  - Worker Health: http://localhost:4100/health"
    echo "  - Neo4j Browser: http://localhost:7474"
    echo "  - Grafana: http://localhost:8080"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - OPA: http://localhost:8181"
    echo "  - OTEL Collector: grpc://localhost:4317"
    echo "  - Jaeger UI: http://localhost:16686"
}

EOF

# Source the updated bashrc
source ~/.bashrc

# Setup completion
log_success "DevContainer setup complete!"
echo
echo "🎉 IntelGraph development environment is ready!"
echo
echo "Available services:"
echo "  - PostgreSQL: postgres:5432 (user: intelgraph, password: dev_password)"
echo "  - Redis: redis:6379"
echo "  - Neo4j: neo4j:7474/7687 (user: neo4j, password: dev_password)"
echo "  - Prometheus: prometheus:9090"
echo "  - Grafana: grafana:3000 (admin/dev_password)"
echo "  - OPA: opa:8181"
echo "  - OTEL Collector: otel-collector:4317/4318"
echo "  - Jaeger UI: jaeger:16686"
echo "  - Mock Services: mock-services:4010"
echo "  - Worker Health: worker:4100"
echo
echo "Quick start:"
echo "  npm run dev      # Start development server"
echo "  npm test         # Run tests"
echo "  npm run build    # Build project"
echo "  env-info         # Show environment information"
echo
echo "Database connections:"
echo "  psql-dev         # Connect to PostgreSQL"
echo "  redis-dev        # Connect to Redis"
echo "  neo4j-dev        # Connect to Neo4j"

echo
log_success "Happy hacking!"

echo
