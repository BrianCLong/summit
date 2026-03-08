#!/bin/bash
set -e

# Start the observability stack
echo "Starting Summit Observability Stack..."
docker-compose -f docker-compose.observability.yml up -d

echo "Observability stack started successfully."
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3001"
echo "Alertmanager: http://localhost:9093"
echo "Jaeger: http://localhost:16686"
