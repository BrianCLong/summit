#!/bin/bash

# AI Copilot Setup Script
# Configures and deploys the AI Copilot MVP

set -e

echo "======================================"
echo "  Summit AI Copilot Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

info() {
    echo "  $1"
}

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 18+ and try again."
fi
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js version must be 18 or higher. Current: $(node --version)"
fi
success "Node.js $(node --version)"

# Check npm/pnpm
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    success "pnpm $(pnpm --version)"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
    success "npm $(npm --version)"
else
    error "No package manager (npm/pnpm) found"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    success "PostgreSQL available"
else
    warning "PostgreSQL not found in PATH (may be remote)"
fi

# Check Neo4j (may be remote)
info "Neo4j connection will be verified after configuration"

echo ""
echo "======================================"
echo "  Environment Configuration"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f "server/.env" ]; then
    warning ".env file not found. Creating from template..."

    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        info "Created server/.env from template"
    else
        info "Creating basic .env file..."
        cat > server/.env <<EOF
# AI Copilot Configuration

# LLM Service
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Alternative: Anthropic
# ANTHROPIC_API_KEY=
# ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# Redis Configuration
REDIS_URL=redis://localhost:6379

# PostgreSQL Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/summit

# Copilot Configuration
COPILOT_MAX_COST_PER_QUERY=10.0
COPILOT_COMPLEXITY_THRESHOLD_ROWS=10000
COPILOT_DAILY_COST_BUDGET_USD=100.0

# Security
COPILOT_ENABLE_GUARDRAILS=true
COPILOT_ENABLE_PROMPT_INJECTION_DETECTION=true
COPILOT_ENABLE_PII_DETECTION=true

# Monitoring
PROMETHEUS_PORT=9090
COPILOT_METRICS_ENABLED=true

# Feature Flags
COPILOT_ENABLE_HYPOTHESES=true
COPILOT_ENABLE_NARRATIVE=true
COPILOT_ENABLE_QUERY_HISTORY=true
COPILOT_ENABLE_TEMPLATES=true
EOF
        success "Created basic .env file"
    fi

    echo ""
    warning "IMPORTANT: You must configure the following in server/.env:"
    info "  - OPENAI_API_KEY or ANTHROPIC_API_KEY"
    info "  - NEO4J_PASSWORD"
    info "  - DATABASE_URL (if not using defaults)"
    echo ""
    read -p "Press Enter after configuring .env to continue..."
fi

# Verify critical env vars
echo "Verifying environment configuration..."

if [ -f "server/.env" ]; then
    source server/.env

    if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
        error "No LLM API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in server/.env"
    fi
    success "LLM API key configured"

    if [ -z "$NEO4J_PASSWORD" ]; then
        warning "NEO4J_PASSWORD not set - using default 'neo4j' (not recommended for production)"
    else
        success "Neo4j password configured"
    fi
else
    error "server/.env file not found"
fi

echo ""
echo "======================================"
echo "  Installing Dependencies"
echo "======================================"
echo ""

# Install server dependencies
echo "Installing server dependencies..."
cd server
$PACKAGE_MANAGER install
success "Server dependencies installed"
cd ..

# Install client dependencies
echo "Installing client dependencies..."
cd client
$PACKAGE_MANAGER install
success "Client dependencies installed"
cd ..

# Install additional copilot dependencies
echo "Installing copilot-specific dependencies..."
cd client
$PACKAGE_MANAGER add react-syntax-highlighter @types/react-syntax-highlighter
success "Copilot UI dependencies installed"
cd ..

cd server
$PACKAGE_MANAGER add prom-client
success "Copilot monitoring dependencies installed"
cd ..

echo ""
echo "======================================"
echo "  Database Setup"
echo "======================================"
echo ""

# Run database migrations (if applicable)
echo "Checking database migrations..."
if [ -f "server/migrations/copilot-setup.sql" ]; then
    info "Database migration file found"
    read -p "Run database migrations? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd server
        $PACKAGE_MANAGER run migrate:up
        success "Database migrations applied"
        cd ..
    fi
else
    info "No copilot migrations found (may not be required)"
fi

echo ""
echo "======================================"
echo "  Testing Configuration"
echo "======================================"
echo ""

echo "Running configuration tests..."

# Test Neo4j connection
echo "Testing Neo4j connection..."
cd server
if $PACKAGE_MANAGER run test:connection:neo4j 2>/dev/null; then
    success "Neo4j connection successful"
else
    warning "Neo4j connection test skipped or failed (will be verified at runtime)"
fi

# Test LLM API
echo "Testing LLM API connection..."
if $PACKAGE_MANAGER run test:connection:llm 2>/dev/null; then
    success "LLM API connection successful"
else
    warning "LLM API connection test skipped or failed (will be verified at runtime)"
fi

cd ..

echo ""
echo "======================================"
echo "  Running Tests"
echo "======================================"
echo ""

read -p "Run copilot unit tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd server
    $PACKAGE_MANAGER test -- NLToCypherService.test.ts
    success "Unit tests passed"
    cd ..
fi

echo ""
echo "======================================"
echo "  Building Application"
echo "======================================"
echo ""

# Build server
echo "Building server..."
cd server
$PACKAGE_MANAGER run build
success "Server build successful"
cd ..

# Build client
echo "Building client..."
cd client
$PACKAGE_MANAGER run build
success "Client build successful"
cd ..

echo ""
echo "======================================"
echo "  Deployment Checklist"
echo "======================================"
echo ""

echo "✓ Prerequisites verified"
echo "✓ Dependencies installed"
echo "✓ Environment configured"
echo "✓ Application built"
echo ""

echo "Next steps:"
info "1. Review server/.env and adjust settings as needed"
info "2. Ensure Neo4j is running and accessible"
info "3. Ensure Redis is running (for caching)"
info "4. Start the server: cd server && $PACKAGE_MANAGER start"
info "5. Start the client: cd client && $PACKAGE_MANAGER start"
info "6. Navigate to investigation and open AI Copilot"
echo ""

echo "Monitoring:"
info "- Metrics endpoint: http://localhost:9090/metrics"
info "- Health check: http://localhost:4000/health"
echo ""

echo "Documentation:"
info "- User Guide: docs/USER_GUIDE_AI_COPILOT.md"
info "- Implementation: docs/COPILOT_MVP_IMPLEMENTATION.md"
info "- API Reference: server/src/graphql/schema/copilot-mvp.graphql"
echo ""

success "AI Copilot setup complete!"

echo ""
echo "======================================"
echo "  Quick Start Commands"
echo "======================================"
echo ""
echo "Start development servers:"
echo "  Terminal 1: cd server && $PACKAGE_MANAGER run dev"
echo "  Terminal 2: cd client && $PACKAGE_MANAGER run dev"
echo ""
echo "Run tests:"
echo "  Unit tests: cd server && $PACKAGE_MANAGER test"
echo "  E2E tests: $PACKAGE_MANAGER run test:e2e -- copilot-mvp.spec.ts"
echo ""
echo "View metrics:"
echo "  curl http://localhost:9090/metrics"
echo ""
