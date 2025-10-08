#!/usr/bin/env bash
# Verify that all Maestro Conductor services are running and responding

set -euo pipefail

echo "🔍 Verifying Maestro Conductor Docker GA Release Services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is up
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "✅ ${service_name}: ${GREEN}UP${NC}"
        return 0
    else
        echo -e "❌ ${service_name}: ${RED}DOWN${NC}"
        return 1
    fi
}

# Function to check if a port is listening
check_port() {
    local service_name=$1
    local port=$2
    
    if nc -z localhost "$port" 2>/dev/null; then
        echo -e "✅ ${service_name}: ${GREEN}LISTENING${NC}"
        return 0
    else
        echo -e "❌ ${service_name}: ${RED}NOT LISTENING${NC}"
        return 1
    fi
}

# Counter for failed services
failed=0

# Check HTTP services
echo "Checking HTTP services..."
check_service "API Health" "http://localhost:4000/healthz" || ((failed++))
check_service "Frontend" "http://localhost:3000/" || ((failed++))
check_service "OPA Health" "http://localhost:8181/health" || ((failed++))
check_service "Jaeger UI" "http://localhost:16686/" || ((failed++))
check_service "Prometheus" "http://localhost:9090/-/healthy" || ((failed++))
check_service "Grafana" "http://localhost:3001/api/health" || ((failed++))

# Check ports for services that don't have HTTP endpoints
echo "Checking ports..."
check_port "PostgreSQL" 5432 || ((failed++))
check_port "Redis" 6379 || ((failed++))
check_port "Neo4j Bolt" 7687 || ((failed++))
check_port "Neo4j HTTP" 7474 || ((failed++))
check_port "Ingest (Redpanda)" 9092 || ((failed++))
check_port "OTEL Collector gRPC" 4317 || ((failed++))
check_port "OTEL Collector HTTP" 4318 || ((failed++))

# Summary
echo ""
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All services are UP and running!${NC}"
    echo "Maestro Conductor Docker GA Release is ready for use."
    exit 0
else
    echo -e "${RED}❌ $failed service(s) are DOWN${NC}"
    echo "Please check the output above and ensure all services are running."
    exit 1
fi