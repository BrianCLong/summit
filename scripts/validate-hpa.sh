#!/usr/bin/env bash
set -euo pipefail

# MC v0.3.2-mc HPA Validation
echo "📈 MC Platform HPA Validation"

DEPLOYMENT="agent-workbench"

echo "🔍 Analyzing HPA configuration..."

# Get HPA status
HPA_STATUS=$(kubectl describe hpa $DEPLOYMENT 2>/dev/null || echo "HPA not found")

echo "📊 HPA Status Analysis:"
echo "$HPA_STATUS"

echo ""
echo "✅ Checking HPA targets:"

# Check CPU target
echo -n "  🖥️ CPU target: "
if echo "$HPA_STATUS" | grep -q "cpu.*[0-9]\+%"; then
    CPU_TARGET=$(echo "$HPA_STATUS" | grep "cpu" | awk '{print $3}')
    echo "✅ SET ($CPU_TARGET)"
else
    echo "❌ NOT CONFIGURED"
fi

# Check Memory target
echo -n "  💾 Memory target: "
if echo "$HPA_STATUS" | grep -q "memory.*[0-9]\+%"; then
    MEM_TARGET=$(echo "$HPA_STATUS" | grep "memory" | awk '{print $3}')
    echo "✅ SET ($MEM_TARGET)"
else
    echo "❌ NOT CONFIGURED"
fi

# Check custom metrics
echo -n "  ⚡ QPS target: "
if echo "$HPA_STATUS" | grep -q "mc_platform_requests_per_second"; then
    QPS_TARGET=$(echo "$HPA_STATUS" | grep "mc_platform_requests_per_second" | awk '{print $3}' | head -1)
    echo "✅ SET ($QPS_TARGET)"
else
    echo "❌ NOT CONFIGURED"
fi

echo -n "  ⏱️ P95 Latency target: "
if echo "$HPA_STATUS" | grep -q "mc_platform_p95_latency_ms"; then
    P95_TARGET=$(echo "$HPA_STATUS" | grep "mc_platform_p95_latency_ms" | awk '{print $3}' | head -1)
    echo "✅ SET ($P95_TARGET)"
else
    echo "❌ NOT CONFIGURED"
fi

# Check current metrics values
echo ""
echo "📊 Current Metrics Values:"
kubectl get hpa $DEPLOYMENT -o=custom-columns="TARGETS:.spec.metrics[*].target" --no-headers 2>/dev/null || echo "Unable to get current targets"

# Check if Prometheus Adapter is working
echo ""
echo "🔌 Custom Metrics API Availability:"
echo -n "  📡 Custom metrics API: "
if kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" >/dev/null 2>&1; then
    echo "✅ AVAILABLE"

    echo -n "  🎯 MC platform metrics: "
    CUSTOM_METRICS=$(kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" 2>/dev/null | jq -r '.resources[].name' | grep "mc_platform" | wc -l)
    if [[ $CUSTOM_METRICS -gt 0 ]]; then
        echo "✅ FOUND ($CUSTOM_METRICS metrics)"
    else
        echo "❌ NO MC PLATFORM METRICS FOUND"
    fi
else
    echo "❌ NOT AVAILABLE - Prometheus Adapter may not be installed"
fi

# Check HPA events for scaling decisions
echo ""
echo "🎬 Recent HPA Events:"
kubectl get events --field-selector involvedObject.name=$DEPLOYMENT --sort-by='.lastTimestamp' | tail -5

# Generate HPA validation report
echo ""
echo "📋 Generating HPA validation report..."

cat > out/hpa-validation-report.json <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployment": "$DEPLOYMENT",
  "hpa_configuration": {
    "cpu_target_configured": $(echo "$HPA_STATUS" | grep -q "cpu.*[0-9]\+%" && echo "true" || echo "false"),
    "memory_target_configured": $(echo "$HPA_STATUS" | grep -q "memory.*[0-9]\+%" && echo "true" || echo "false"),
    "qps_target_configured": $(echo "$HPA_STATUS" | grep -q "mc_platform_requests_per_second" && echo "true" || echo "false"),
    "p95_target_configured": $(echo "$HPA_STATUS" | grep -q "mc_platform_p95_latency_ms" && echo "true" || echo "false")
  },
  "custom_metrics_api": {
    "available": $(kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" >/dev/null 2>&1 && echo "true" || echo "false"),
    "mc_platform_metrics_count": $CUSTOM_METRICS
  },
  "verification_method": "kubectl_describe_hpa",
  "attestor": "mc-platform-hardening-script"
}
EOF

echo "✅ HPA validation report saved to out/hpa-validation-report.json"

# Export HPA YAML for evidence
kubectl get hpa $DEPLOYMENT -o yaml > out/hpa-${DEPLOYMENT}.yaml 2>/dev/null && echo "✅ HPA YAML exported to out/hpa-${DEPLOYMENT}.yaml"