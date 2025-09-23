#!/bin/bash

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting IntelGraph Development Environment${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Setup environment file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from template...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
    else
        echo -e "${YELLOW}⚠️  No .env.example found, creating basic .env${NC}"
        cat > .env << EOF
NODE_ENV=development
JWT_SECRET=dev_jwt_secret_12345_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_67890_change_in_production
CORS_ORIGIN=http://localhost:3000
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
POSTGRES_HOST=localhost
POSTGRES_USER=intelgraph
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=intelgraph_dev
REDIS_HOST=localhost
REDIS_PASSWORD=devpassword
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
EOF
    fi
fi

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping any existing containers...${NC}"
docker-compose -f docker-compose.dev.yml down --remove-orphans || true

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose -f docker-compose.dev.yml up -d --build

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"

# Function to wait for service health
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.dev.yml ps $service | grep -q "healthy"; then
            echo -e "${GREEN}✅ $service is healthy${NC}"
            return 0
        fi
        echo -e "${YELLOW}⏳ Waiting for $service... (attempt $attempt/$max_attempts)${NC}"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service failed to become healthy${NC}"
    return 1
}

# Wait for core services
wait_for_service "postgres"
wait_for_service "neo4j"
wait_for_service "redis"

# Run migrations and seed demo data
echo -e "${YELLOW}🗄 Applying database migrations...${NC}"
docker-compose -f docker-compose.dev.yml exec -T server npm run migrate >/dev/null

echo -e "${YELLOW}🌱 Seeding database...${NC}"
docker-compose -f docker-compose.dev.yml exec -T server npm run seed:demo >/dev/null
cat server/db/seeds/neo4j/sample_graph.cypher | docker-compose -f docker-compose.dev.yml exec -T neo4j cypher-shell -u neo4j -p devpassword >/dev/null

# Give the app services a bit more time
sleep 10

# Check if application services are running
echo -e "${YELLOW}🔍 Checking application services...${NC}"
if docker-compose -f docker-compose.dev.yml ps server | grep -q "Up"; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Server may still be starting up${NC}"
fi

if docker-compose -f docker-compose.dev.yml ps client | grep -q "Up"; then
    echo -e "${GREEN}✅ Client is running${NC}"
else
    echo -e "${YELLOW}⚠️  Client may still be starting up${NC}"
fi

echo ""
echo -e "${GREEN}🎉 IntelGraph Development Environment Started!${NC}"
echo ""
echo -e "${YELLOW}📍 Service URLs:${NC}"
echo "   Frontend:    http://localhost:3000"
echo "   Backend:     http://localhost:4000"
echo "   GraphQL:     http://localhost:4000/graphql"
echo "   Neo4j:       http://localhost:7474"
echo "   Admin:       http://localhost:8080"
echo ""
echo -e "${YELLOW}📋 Useful Commands:${NC}"
echo "   View logs:    docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop all:     ./scripts/dev-down.sh"
echo "   Restart:      ./scripts/dev-down.sh && ./scripts/dev-up.sh"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
