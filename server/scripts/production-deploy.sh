#!/bin/bash

# IntelGraph Production Deployment Script
# Automated deployment for production environments

set -e

echo "🚀 IntelGraph Production Deployment"
echo "====================================="

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm is required but not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create production environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating production environment file..."
    cp .env.production .env
    echo "⚠️  Please update .env with your production credentials before continuing"
    read -p "Press Enter after updating .env file..."
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Start production database stack
echo "🗄️  Starting production databases..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 30

# Verify database health
echo "🔍 Checking database health..."
timeout 60 bash -c 'until docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U intelgraph; do sleep 2; done' || echo "⚠️  PostgreSQL may not be ready"
timeout 60 bash -c 'until docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping; do sleep 2; done' || echo "⚠️  Redis may not be ready"
timeout 60 bash -c 'until docker-compose -f docker-compose.prod.yml exec -T neo4j cypher-shell -u neo4j -p $(cat .env | grep NEO4J_PASSWORD | cut -d= -f2) "RETURN 1"; do sleep 2; done' || echo "⚠️  Neo4j may not be ready"

# Optional: Start monitoring stack
read -p "Start monitoring stack (Prometheus/Grafana)? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Starting monitoring stack..."
    docker-compose -f docker-compose.monitoring.yml up -d
    echo "📊 Grafana available at: http://localhost:3001 (admin/admin)"
    echo "📊 Prometheus available at: http://localhost:9090"
fi

# Start the application
echo "🚀 Starting IntelGraph application..."
npm start &
APP_PID=$!

# Wait for application to start
echo "⏳ Waiting for application startup..."
sleep 10

# Health check
echo "🔍 Performing health checks..."
if curl -f -s http://localhost:4000/health > /dev/null; then
    echo "✅ Application health check passed"
else
    echo "❌ Application health check failed"
    echo "🔍 Checking application logs..."
    tail -n 20 logs/app.log || echo "No logs available"
    exit 1
fi

# Display deployment summary
echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "========================="
echo "📊 Application: http://localhost:4000"
echo "🔍 Health Check: http://localhost:4000/health"
echo "📈 GraphQL: http://localhost:4000/graphql"
echo "📊 System Stats: http://localhost:4000/api/system/stats"
echo ""
echo "📋 Management Commands:"
echo "   Health Check: curl http://localhost:4000/health"
echo "   Stop App: kill $APP_PID"
echo "   Stop Databases: docker-compose -f docker-compose.prod.yml down"
echo "   View Logs: tail -f logs/app.log"
echo ""
echo "✅ IntelGraph is now running in production mode"

# Keep script running to show live health status
while true; do
    echo "⏱️  $(date): Checking system health..."
    
    if curl -f -s http://localhost:4000/api/system/stats > /dev/null; then
        MEMORY=$(curl -s http://localhost:4000/api/system/stats | jq -r '.process.memory.rss')
        UPTIME=$(curl -s http://localhost:4000/api/system/stats | jq -r '.process.uptimeSec')
        echo "   📊 Memory: $(($MEMORY / 1024 / 1024))MB, Uptime: ${UPTIME}s"
    else
        echo "   ❌ Application health check failed"
        break
    fi
    
    sleep 60
done