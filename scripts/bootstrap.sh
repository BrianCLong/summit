#!/usr/bin/env bash

set -euo pipefail

# IntelGraph Platform - Environment Bootstrap
# Implements the "Golden Path" for preparing the development environment.

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

NODE_VERSION=18
PY_VERSION=3.11
ENV_FILE=".env"

# Preflight Checks
log_info "Running preflight checks..."

if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker not found. Please install Docker Desktop."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running. Start Docker Desktop and try again."
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

CURRENT_NODE_VER=$(node -v | sed 's/v//;s/\..*//')
if [ "$CURRENT_NODE_VER" -lt "$NODE_VERSION" ]; then
    log_error "Node.js v$NODE_VERSION+ required (found v$CURRENT_NODE_VER)"
    exit 1
fi

log_success "Preflight checks passed."

# 1. Environment Configuration
log_info "Setting up environment configuration..."
if [ ! -f "$ENV_FILE" ]; then
    cp .env.example "$ENV_FILE"
    log_success "Created $ENV_FILE from .env.example"
    log_info "NOTE: Update secrets in $ENV_FILE for production/custom deployments."
else
    log_info "$ENV_FILE already exists. Skipping creation."
fi

# 2. Node.js Dependencies
log_info "Installing Node.js dependencies..."
if [ -f package.json ]; then
    if command -v corepack >/dev/null 2>&1; then
        corepack enable || true
    fi

    if [ -f pnpm-lock.yaml ]; then
        if ! command -v pnpm >/dev/null 2>&1; then
            npm install -g pnpm
        fi
        pnpm install --frozen-lockfile || pnpm install
    elif [ -f package-lock.json ]; then
        npm ci || npm install
    else
        npm install || true
    fi
    log_success "Node.js dependencies installed."
fi

# 3. Python Virtual Environment
log_info "Setting up Python environment..."
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi

    # Activate venv for installation
    source .venv/bin/activate

    python -m pip install -U pip wheel

    if [ -f requirements.txt ]; then
        pip install -r requirements.txt || true
    fi

    if [ -f pyproject.toml ]; then
        pip install -e . || pip install . || true
    fi

    # Install additional tooling
    pip install ruamel.yaml==0.18.* pip-audit==2.* || true

    log_success "Python environment ready."
fi

# 4. Dev Tooling Scaffolding
log_info "Setting up helper tools..."
mkdir -p scripts/tools
cat > scripts/tools/yq_json.py << 'EOF'
#!/usr/bin/env python3
from ruamel.yaml import YAML; import sys,json
y=YAML(); doc=y.load(sys.stdin.read()); print(json.dumps(doc))
EOF
chmod +x scripts/tools/yq_json.py

log_success "Bootstrap complete! You are ready to run './scripts/start.sh'."
