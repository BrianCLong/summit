#!/bin/bash
# Summit Application - Local Deployment with Public Access
# This script sets up Summit locally and provides instructions for public access

set -e

echo "🏠 Summit Application - Local Deployment with Public Access"
echo "========================================================"

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

# Check for ngrok if available
if command -v ngrok &> /dev/null; then
    NGROK_AVAILABLE=true
    echo "✅ Ngrok is available for public access"
else
    NGROK_AVAILABLE=false
    echo "⚠️ Ngrok not found - you'll need to install it for public access"
    echo "   Install ngrok: https://ngrok.com/download"
fi

echo

# Create/update .env file
echo "📝 Setting up environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=4000

# Database configurations
DATABASE_URL=postgresql://intelgraph_user:summit_postgres_password@host.docker.internal:5432/intelgraph
NEO4J_URI=bolt://host.docker.internal:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=summit_neo4j_password
REDIS_URL=redis://host.docker.internal:6379

# Security settings
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Feature flags
CONFIG_VALIDATE_ON_START=false
HEALTH_ENDPOINTS_ENABLED=true
ENABLE_INSECURE_DEV_AUTH=false
AI_ENABLED=false

# CORS settings
CORS_ORIGIN=https://topicality.co,http://localhost:3000,http://localhost:5173
ALLOWED_ORIGINS=https://topicality.co,http://localhost:3000,http://localhost:5173
EOF
echo "✅ Environment configuration created"
echo

# Start infrastructure services
echo "🐳 Starting infrastructure services (Neo4j, PostgreSQL, Redis)..."
docker compose up neo4j postgres redis -d

echo "Waiting for services to start..."
sleep 30

# Check if services are running
echo "Checking service status..."
if docker ps | grep -q "summit-neo4j-1"; then
    echo "✅ Neo4j is running on localhost:7687 (browser: 7474)"
else
    echo "❌ Neo4j failed to start"
fi

if docker ps | grep -q "summit-postgres-1"; then
    echo "✅ PostgreSQL is running on localhost:5432"
else
    echo "❌ PostgreSQL failed to start"
fi

if docker ps | grep -q "summit-redis-1"; then
    echo "✅ Redis is running on localhost:6379"
else
    echo "❌ Redis failed to start"
fi

echo

# Build Summit server if possible
echo "🔨 Attempting to build Summit server..."
if [ -d "server" ] && [ -f "server/package.json" ]; then
    cd server
    if [ -f "Dockerfile" ]; then
        echo "Building Summit server container..."
        docker build -t summit-server-local .
        cd ..
    else
        echo "No Dockerfile found in server directory, checking for package.json scripts..."
        if grep -q "build" package.json 2>/dev/null; then
            npm run build || echo "⚠️ Build failed - this is OK for initial setup"
        fi
        cd ..
    fi
else
    echo "⚠️ Server directory not found - building from root Dockerfile if available..."
    if [ -f "Dockerfile" ]; then
        docker build -t summit-server-local .
    fi
fi
echo

echo "🎉 Local Summit Infrastructure is Running!"
echo
echo "Services are available at:"
echo "- Neo4j Browser: http://localhost:7474 (password: summit_neo4j_password)"
echo "- PostgreSQL: localhost:5432"
echo "- Redis: localhost:6379"
echo
echo "To access these services publicly, you have two options:"
echo
echo "OPTION 1: Using Ngrok (requires installation)"
echo "   1. Install ngrok from https://ngrok.com/download"
echo "   2. Sign up for a free account at https://dashboard.ngrok.com/signup"
echo "   3. Configure ngrok: ngrok config add-authtoken <your-auth-token>"
echo "   4. Expose services:"
echo "      - For API: ngrok http 4000"
echo "      - For Web: ngrok http 3000"
echo
echo "OPTION 2: Using Cloudflared (alternative tunnel)"
echo "   1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
echo "   2. Run: cloudflared tunnel --url http://localhost:4000"
echo
echo "OPTION 3: Port forwarding (if you have a public IP)"
echo "   Configure your router to forward ports 4000 (API) and 3000 (Web) to your machine"
echo
echo "After setting up public access:"
echo "1. Update your DNS records for topicality.co to point to the tunnel URL"
echo "2. For SSL, most tunnel services provide HTTPS by default"
echo
echo "To start the Summit application server:"
echo "1. cd server && npm run dev (if developing)"
echo "2. Or run the built container: docker run -p 4000:4000 summit-server-local"
echo
echo "To start the Summit web interface:"
echo "1. cd apps/web && npm run dev (if developing)"
echo "2. Or run the built container: docker run -p 3000:3000 summit-web-local"
echo
echo "For a production setup with your domain topicality.co, consider:"
echo "- Using a cloud platform like Fly.io (see FLY_IO_DEPLOYMENT.md)"
echo "- Setting up a proper Kubernetes cluster"
echo "- Using a cloud provider's managed services"
echo
echo "Local setup complete! The foundation for Summit is running on your machine."