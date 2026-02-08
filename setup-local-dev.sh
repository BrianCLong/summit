#!/bin/bash
# Summit Application - Local Development Setup
# This script sets up Summit for local development/testing

set -e

echo "🏠 Summit Application - Local Development Setup"
echo "============================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "✅ Docker is installed"

# Check for Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    exit 1
fi
echo "✅ Docker Compose is available"

echo

# Create/update .env file
echo "📝 Setting up environment configuration..."
cat > .env << EOF
NODE_ENV=development
PORT=4000

# Database configurations
DATABASE_URL=postgresql://intelgraph_user:summit_postgres_password@localhost:5432/intelgraph
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=summit_neo4j_password
REDIS_URL=redis://localhost:6379

# Security settings
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Feature flags
CONFIG_VALIDATE_ON_START=false
HEALTH_ENDPOINTS_ENABLED=true
ENABLE_INSECURE_DEV_AUTH=true
AI_ENABLED=false

# CORS settings
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://topicality.co
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://topicality.co
EOF
echo "✅ Environment configuration created"
echo

# Start infrastructure services
echo "🐳 Starting infrastructure services (Neo4j, PostgreSQL, Redis)..."
docker compose up neo4j postgres redis -d

echo "Waiting for services to start..."
sleep 20

# Check if services are running
echo "Checking service status..."
if docker ps | grep -q "summit-neo4j-1"; then
    echo "✅ Neo4j is running"
else
    echo "❌ Neo4j failed to start"
fi

if docker ps | grep -q "summit-postgres-1"; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL failed to start"
fi

if docker ps | grep -q "summit-redis-1"; then
    echo "✅ Redis is running"
else
    echo "❌ Redis failed to start"
fi

echo

# Install dependencies
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        echo "⚠️ pnpm not found, installing dependencies individually..."
        # Install dependencies for server if it exists
        if [ -d "server" ]; then
            cd server
            if [ -f "package.json" ]; then
                npm install
            fi
            cd ..
        fi
    fi
else
    echo "✅ Dependencies already installed"
fi
echo

# Build the application if possible
echo "🔨 Building application..."
if [ -d "server" ] && [ -f "server/package.json" ]; then
    cd server
    if grep -q "build" package.json; then
        npm run build || echo "⚠️ Build failed - continuing anyway"
    fi
    cd ..
else
    echo "⚠️ Server directory not found - skipping build"
fi
echo

# Start the application
echo "🚀 Starting Summit application..."
echo
echo "The Summit application is now running locally:"
echo "- Neo4j Browser: http://localhost:7474 (password: summit_neo4j_password)"
echo "- PostgreSQL: localhost:5432"
echo "- Redis: localhost:6379"
echo
echo "To start the full application server:"
echo "1. cd server && npm run dev"
echo "2. Access the API at http://localhost:4000"
echo
echo "For the web interface:"
echo "1. cd apps/web && npm run dev"
echo "2. Access the web UI at http://localhost:3000"
echo
echo "For production cloud deployment to topicality.co, you'll need:"
echo "1. A Kubernetes cluster (AWS EKS, Azure AKS, or Google GKE)"
echo "2. kubectl configured to connect to your cluster"
echo "3. Run the deploy-simple.sh script after setting up the cluster"
echo
echo "Local development setup complete!"