#!/usr/bin/env bash
set -euo pipefail

# MC v0.3.2-mc Advanced Ops Pack - Quick Enable
# Usage: ./scripts/enable-advanced-ops.sh [siem-url] [siem-key]

SIEM_URL=${1:-""}
SIEM_KEY=${2:-""}

echo "🚀 Enabling MC Platform Advanced Ops Pack..."

# 1. Install Prometheus Adapter for custom metrics
echo "📊 Installing Prometheus Adapter for custom metrics HPA..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install prom-adapter prometheus-community/prometheus-adapter \
  -f deploy/custom-metrics/prom-adapter-values.yaml \
  --namespace monitoring \
  --create-namespace

# 2. Deploy/upgrade MC platform with advanced HPA
echo "⚙️ Deploying MC Platform with advanced HPA..."
helm upgrade --install agent-workbench charts/agent-workbench \
  -f charts/agent-workbench/values-prod.yaml \
  --set autoscaling.enabled=true \
  --set serviceMonitor.enabled=true \
  --set networkPolicy.enabled=true

# 3. Configure SIEM integration if provided
if [[ -n "$SIEM_URL" && -n "$SIEM_KEY" ]]; then
  echo "🔐 Configuring SIEM HTTP sink..."
  kubectl set env deploy/agent-workbench \
    AUDIT_SIEM_URL="$SIEM_URL" \
    AUDIT_SIEM_KEY="$SIEM_KEY" \
    AUDIT_SIEM_ENABLED=true \
    AUDIT_SIEM_FORMAT=json \
    AUDIT_SIEM_BATCH_SIZE=100 \
    AUDIT_SIEM_FLUSH_INTERVAL=30s

  echo "✅ SIEM sink configured: $SIEM_URL"
else
  echo "⚠️  SIEM configuration skipped (no URL/key provided)"
  echo "   To configure later: kubectl set env deploy/agent-workbench AUDIT_SIEM_URL=https://siem.example.com/ingest AUDIT_SIEM_KEY=\$SIEM_TOKEN"
fi

# 4. Wait for rollout
echo "⏳ Waiting for deployment rollout..."
kubectl rollout status deploy/agent-workbench --timeout=300s

# 5. Verify custom metrics
echo "🔍 Verifying custom metrics availability..."
sleep 30
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq -r '.resources[].name' | grep -E '^mc_platform_' || echo "⚠️  Custom metrics not yet available (may take a few minutes)"

echo ""
echo "🎉 Advanced Ops Pack enabled successfully!"
echo ""
echo "Available capabilities:"
echo "  ✅ Custom metrics HPA (QPS + P95 latency + A2A success rate + active tenants)"
echo "  ✅ Advanced scaling behaviors with stabilization windows"
echo "  ✅ NetworkPolicy security (deny-all + selective allow)"
echo "  ✅ Prometheus ServiceMonitor with metric relabeling"
if [[ -n "$SIEM_URL" ]]; then
  echo "  ✅ SIEM HTTP sink integration"
fi
echo ""
echo "Next steps:"
echo "  🔬 Run canary analysis: gh workflow run canary-analysis.yml -f baseline=https://blue.example.com -f candidate=https://green.example.com"
echo "  📈 Monitor HPA: kubectl get hpa agent-workbench -w"
echo "  📊 View metrics: kubectl get --raw '/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/mc_platform_requests_per_second'"