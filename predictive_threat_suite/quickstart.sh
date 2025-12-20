#!/bin/bash
# Predictive Threat Suite - Quick Start Script

set -e

echo "======================================================================"
echo "  Predictive Threat Suite - Quick Start"
echo "======================================================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# Navigate to directory
cd "$(dirname "$0")"

# Generate sample dataset
echo "Generating sample dataset..."
if python3 test_e2e.py > /dev/null 2>&1; then
    echo "✅ Sample dataset generated"
else
    echo "⚠️  Could not generate sample dataset (non-critical)"
fi
echo ""

# Start services
echo "Starting Predictive Threat Suite services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check API health
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:8091/health > /dev/null 2>&1; then
        echo "✅ API service is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo ""
    echo "❌ API service did not become healthy in time"
    echo "Check logs with: docker-compose logs predictive-forecasting"
    exit 1
fi

# Check Prometheus
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "✅ Prometheus is healthy"
else
    echo "⚠️  Prometheus may not be ready yet"
fi

# Check Grafana
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Grafana is healthy"
else
    echo "⚠️  Grafana may not be ready yet"
fi

echo ""
echo "======================================================================"
echo "  Deployment Complete!"
echo "======================================================================"
echo ""
echo "Services are running:"
echo ""
echo "  📊 Predictive API:   http://localhost:8091"
echo "     - API Docs:       http://localhost:8091/docs"
echo "     - Health:         http://localhost:8091/health"
echo "     - Metrics:        http://localhost:8091/metrics"
echo ""
echo "  📈 Prometheus:       http://localhost:9090"
echo "     - Targets:        http://localhost:9090/targets"
echo "     - Alerts:         http://localhost:9090/alerts"
echo ""
echo "  📉 Grafana:          http://localhost:3001"
echo "     - Username:       admin"
echo "     - Password:       admin"
echo ""
echo "======================================================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Open Grafana: http://localhost:3001"
echo "  2. Navigate to Dashboards → Predictive Suite"
echo "  3. Try the API: curl -X POST http://localhost:8091/api/forecast \\"
echo "                   -H 'Content-Type: application/json' \\"
echo "                   -d '{...}'"
echo "  4. View logs: docker-compose logs -f"
echo ""
echo "To stop services: docker-compose down"
echo "For help: cat README.md"
echo ""
