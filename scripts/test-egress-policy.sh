#!/usr/bin/env bash
set -euo pipefail

# MC v0.3.2-mc NetworkPolicy Egress Verification
echo "🌐 MC Platform NetworkPolicy Egress Testing"

DEPLOYMENT="agent-workbench"
TIMEOUT="10s"

# Get a running pod
POD=$(kubectl get pod -l app.kubernetes.io/name=$DEPLOYMENT -o jsonpath='{.items[0].metadata.name}')
echo "📦 Testing with pod: $POD"

echo ""
echo "🚫 Testing DENIED egress (should timeout/fail):"

# Test blocked IPs (should fail)
BLOCKED_IPS=("8.8.8.8" "1.1.1.1" "192.168.1.1")
for ip in "${BLOCKED_IPS[@]}"; do
    echo -n "  ❌ Testing blocked IP $ip: "
    if timeout $TIMEOUT kubectl exec $POD -- curl -s --connect-timeout 5 http://$ip >/dev/null 2>&1; then
        echo "⚠️  UNEXPECTED SUCCESS - NetworkPolicy may not be working"
    else
        echo "✅ BLOCKED (expected)"
    fi
done

echo ""
echo "✅ Testing ALLOWED egress (should succeed):"

# Test allowed LLM provider endpoints
declare -A ALLOWED_ENDPOINTS=(
    ["OpenAI"]="api.openai.com"
    ["Anthropic"]="api.anthropic.com"
    ["Google"]="googleapis.com"
    ["Hugging Face"]="huggingface.co"
)

for provider in "${!ALLOWED_ENDPOINTS[@]}"; do
    endpoint="${ALLOWED_ENDPOINTS[$provider]}"
    echo -n "  ✅ Testing $provider ($endpoint): "
    if timeout $TIMEOUT kubectl exec $POD -- curl -s -I --connect-timeout 5 https://$endpoint >/dev/null 2>&1; then
        echo "✅ ALLOWED (expected)"
    else
        echo "❌ BLOCKED (unexpected - check NetworkPolicy)"
    fi
done

# Test internal Kubernetes services
echo ""
echo "🔒 Testing internal service access:"
echo -n "  🏛️ Kubernetes API: "
if timeout $TIMEOUT kubectl exec $POD -- curl -s -k --connect-timeout 5 https://kubernetes.default.svc.cluster.local >/dev/null 2>&1; then
    echo "✅ ALLOWED (expected)"
else
    echo "❌ BLOCKED (may indicate overly restrictive policy)"
fi

echo -n "  📊 Prometheus (if available): "
if timeout $TIMEOUT kubectl exec $POD -- curl -s --connect-timeout 5 http://prometheus-server.monitoring.svc.cluster.local:80/api/v1/targets >/dev/null 2>&1; then
    echo "✅ ALLOWED (expected)"
else
    echo "⚠️ BLOCKED/NOT_AVAILABLE (check if monitoring namespace exists)"
fi

# Generate NetworkPolicy attestation
echo ""
echo "📋 Generating NetworkPolicy attestation..."

# Get NetworkPolicy YAML
NETPOL_YAML=$(kubectl get networkpolicy $DEPLOYMENT -o yaml 2>/dev/null || echo "NetworkPolicy not found")

cat > out/networkpolicy-attestation.json <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployment": "$DEPLOYMENT",
  "pod_tested": "$POD",
  "egress_tests": {
    "blocked_ips": $(printf '%s\n' "${BLOCKED_IPS[@]}" | jq -R . | jq -s .),
    "allowed_endpoints": $(echo '{}' | jq --argjson endpoints "$(for k in "${!ALLOWED_ENDPOINTS[@]}"; do echo "{\"$k\":\"${ALLOWED_ENDPOINTS[$k]}\"}"; done | jq -s add)" '$endpoints'),
    "internal_services": {
      "kubernetes_api": "tested",
      "prometheus": "tested"
    }
  },
  "networkpolicy_applied": $(echo "$NETPOL_YAML" | grep -q "kind: NetworkPolicy" && echo "true" || echo "false"),
  "verification_method": "kubectl_exec_curl",
  "attestor": "mc-platform-hardening-script"
}
EOF

echo "✅ NetworkPolicy attestation saved to out/networkpolicy-attestation.json"

# Export NetworkPolicy YAML for evidence
if kubectl get networkpolicy $DEPLOYMENT -o yaml > out/networkpolicy-${DEPLOYMENT}.yaml 2>/dev/null; then
    echo "✅ NetworkPolicy YAML exported to out/networkpolicy-${DEPLOYMENT}.yaml"
else
    echo "⚠️ NetworkPolicy not found or not accessible"
fi