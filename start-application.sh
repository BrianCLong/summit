#!/bin/bash
# Summit Application Startup Script
# This script starts the Summit application using the infrastructure services that are already running

set -e

echo "🚀 Starting Summit Application..."
echo

# Navigate to the server directory
cd /home/bcl/Summit/summit/server

# Create/update the .env file with the correct settings for our infrastructure
cat > .env << EOF
NODE_ENV=development
PORT=4000

# Database configurations matching our running infrastructure
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=test1234
REDIS_URL=redis://localhost:6379

# Security settings for development
JWT_SECRET=dev-secret-do-not-use-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-do-not-use-in-production
SESSION_SECRET=dev-session-secret-do-not-use-in-production

# Feature flags
CONFIG_VALIDATE_ON_START=false
HEALTH_ENDPOINTS_ENABLED=true

# Disable problematic features for initial startup
DISABLE_NEO4J=false
EOF

echo "✅ Environment configured"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    pnpm install --no-frozen-lockfile
else
    echo "✅ Dependencies already installed"
fi

echo
echo "🔍 Verifying infrastructure connectivity..."

# Test database connections
echo "Testing PostgreSQL connection..."
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -c "SELECT version();" > /dev/null 2>&1 && echo "✅ PostgreSQL accessible" || echo "❌ PostgreSQL not accessible"

echo "Testing Redis connection..."
redis-cli -h localhost -p 6379 ping > /dev/null 2>&1 && echo "✅ Redis accessible" || echo "❌ Redis not accessible"

echo "Testing Neo4j connection..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:7474/db/neo4j/tx/commit -H 'Authorization: Basic bmVvNGo6dGVzdDEyMzQ=' -H 'Content-Type: application/json' -d '{"statements": [{"statement": "RETURN 1"}]}' > /dev/null 2>&1 && echo "✅ Neo4j accessible" || echo "❌ Neo4j not accessible"

echo
echo "🎯 Starting Summit application server..."
echo "The application will be available at http://localhost:4000 when ready"
echo

# Start the application in the background
pnpm run dev &

# Store the PID of the background process
APP_PID=$!

# Wait for a few seconds to allow the server to start
sleep 10

# Check if the server is running
if kill -0 $APP_PID 2>/dev/null; then
    echo "✅ Summit application is running with PID $APP_PID"
    echo "🌐 Access the application at: http://localhost:4000"
    echo "📋 View logs with: docker logs -f summit-server-1"
else
    echo "⚠️ Summit application may not have started properly"
    echo " troubleshoot, check logs with: pnpm run dev"
fi

# Keep the script running
wait $APP_PID