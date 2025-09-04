#!/usr/bin/env bash
# Start Maestro development environment

set -euo pipefail

echo "🚀 Starting Maestro development environment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start services
echo "📦 Building and starting services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

services=("postgres" "redis" "neo4j" "maestro-server")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.dev.yml ps "$service" | grep -q "healthy\|Up"; then
        echo "✅ $service is ready"
    else
        echo "⚠️  $service is not ready yet"
    fi
done

echo ""
echo "🎉 Development environment started!"
echo ""
echo "🌐 Access URLs:"
echo "   Web UI:       http://localhost:3000"
echo "   API:          http://localhost:8080"
echo "   Prometheus:   http://localhost:9090"
echo "   Grafana:      http://localhost:3001 (admin/admin)"
echo "   Jaeger:       http://localhost:16686"
echo "   Neo4j:        http://localhost:7474 (neo4j/maestro_dev_password)"
echo ""
echo "📊 Health endpoints:"
echo "   API Health:   curl http://localhost:8080/healthz"
echo "   API Metrics:  curl http://localhost:8080/metrics"
echo ""
echo "🔧 Development commands:"
echo "   View logs:    docker-compose -f docker-compose.dev.yml logs -f [service]"
echo "   Stop all:     docker-compose -f docker-compose.dev.yml down"
echo "   Restart:      docker-compose -f docker-compose.dev.yml restart [service]"
echo ""
