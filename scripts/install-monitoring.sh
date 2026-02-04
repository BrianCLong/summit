#!/usr/bin/env bash
set -e

echo "📊 Deploying Monitoring Stack (Prometheus + Grafana)..."

# Add Prometheus Community Repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube_prometheus_stack
# This includes: Prometheus, Grafana, Node Exporter, Kube State Metrics, and AlertManager
helm upgrade --install monitoring prometheus-community/kube_prometheus_stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword="admin" \
  --set grafana.service.type=LoadBalancer \
  --set prometheus.prometheusSpec.retention=14d \
  --set prometheus.prometheusSpec.resources.requests.memory=512Mi \
  --set prometheus.prometheusSpec.resources.requests.cpu=500m

echo "✅ Monitoring Stack Deployed!"
echo "   - Grafana URL: (Check AWS Load Balancer for 'monitoring-grafana' service)"
echo "   - Username: admin"
echo "   - Password: admin (Please change this immediately!)"
