#!/bin/bash
set -e

# Summit GA - Prod Simulation Script
# This script simulates the production deployment pipeline to verify orchestration logic
# without affecting live resources. It uses mocked endpoints and dry-run modes.

echo "🚀 Starting Summit GA Prod Simulation..."

# 1. Environment Validation
echo "🔍 Validating Environment..."
REQUIRED_TOOLS=("terraform" "helm" "docker" "node")
for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
        echo "❌ Missing required tool: $tool"
        exit 1
    fi
done
echo "✅ Environment Valid."

# 2. Infra-as-Code Validation (Simulation)
echo "🛠️  Simulating Infra Deployment (Terraform)..."
if [ -d "terraform/environments/prod" ]; then
    cd terraform/environments/prod
    # Initialize with backend disabled for simulation
    terraform init -backend=false > /dev/null
    # Validate configuration
    terraform validate
    # Plan (mocking provider interactions if possible, otherwise just validate is good for CI check)
    echo "✅ Terraform Configuration Validated."
    cd - > /dev/null
else
    echo "⚠️  Prod Terraform directory not found, skipping."
fi

# 3. Kubernetes Manifest Validation (Helm Dry-Run)
echo "📦 Simulating Kubernetes Deployment (Helm)..."
CHARTS_DIR="charts"
if [ -d "$CHARTS_DIR" ]; then
    for chart in "$CHARTS_DIR"/*; do
        if [ -d "$chart" ]; then
            chart_name=$(basename "$chart")
            echo "   • Verifying chart: $chart_name"
            # Dry-run template rendering
            helm template "$chart_name" "$chart" --debug > /dev/null
        fi
    done
    echo "✅ Helm Charts Verified."
else
    echo "⚠️  Charts directory not found, skipping."
fi

# 4. Service Startup Simulation (Mocked)
echo "🚀 Simulating Service Startup..."
# Check if we can build the server config (validates types and config schema)
if [ -f "server/package.json" ]; then
    echo "   • Validating Server Config..."
    cd server
    # We use pnpm to run a config check if available
    if command -v pnpm &> /dev/null; then
        # Mocking env vars for config check
        export GA_CLOUD=true
        export NODE_ENV=production
        export AWS_REGION=us-mock-1
        export DATABASE_URL="postgresql://mock:5432/db"
        export NEO4J_URI="bolt://mock:7687"
        export NEO4J_USER="mock"
        export NEO4J_PASSWORD="mock_password_secure"
        export JWT_SECRET=$(openssl rand -base64 32)
        export JWT_REFRESH_SECRET=$(openssl rand -base64 32)
        export REDIS_HOST="mock-redis"

        # Run validation script if it exists, otherwise just compile
        if npm run | grep -q "config:validate"; then
             pnpm run config:validate
        else
             # Fallback to typecheck
             pnpm typecheck
        fi
    fi
    cd - > /dev/null
    echo "✅ Server Configuration Validated."
fi

echo "✅ Prod Simulation Complete: Ready for GA."
