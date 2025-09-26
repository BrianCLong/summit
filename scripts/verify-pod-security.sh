#!/usr/bin/env bash
set -euo pipefail

# MC v0.3.2-mc Pod Security Verification
echo "🛡️ MC Platform Pod Security Verification"

DEPLOYMENT="agent-workbench"
NAMESPACE="default"

echo "🔍 Verifying pod security configuration for $DEPLOYMENT..."

# Get pod YAML for security analysis
POD_YAML=$(kubectl get pod -l app.kubernetes.io/name=$DEPLOYMENT -o yaml --namespace=$NAMESPACE)

# Check runAsNonRoot
echo -n "✓ runAsNonRoot: "
if echo "$POD_YAML" | grep -q "runAsNonRoot: true"; then
    echo "✅ PASS"
else
    echo "❌ FAIL - runAsNonRoot not set to true"
fi

# Check readOnlyRootFilesystem
echo -n "✓ readOnlyRootFilesystem: "
if echo "$POD_YAML" | grep -q "readOnlyRootFilesystem: true"; then
    echo "✅ PASS"
else
    echo "❌ FAIL - readOnlyRootFilesystem not set to true"
fi

# Check allowPrivilegeEscalation
echo -n "✓ allowPrivilegeEscalation: "
if echo "$POD_YAML" | grep -q "allowPrivilegeEscalation: false"; then
    echo "✅ PASS"
else
    echo "❌ FAIL - allowPrivilegeEscalation not set to false"
fi

# Check capabilities dropped
echo -n "✓ capabilities drop ALL: "
if echo "$POD_YAML" | grep -A2 "capabilities:" | grep -q "drop.*ALL"; then
    echo "✅ PASS"
else
    echo "❌ FAIL - capabilities ALL not dropped"
fi

# Check user ID (should not be 0)
echo -n "✓ runAsUser (non-root): "
USER_ID=$(echo "$POD_YAML" | grep "runAsUser:" | head -1 | awk '{print $2}')
if [[ "$USER_ID" != "0" && "$USER_ID" != "" ]]; then
    echo "✅ PASS (UID: $USER_ID)"
else
    echo "❌ FAIL - running as root or UID not set"
fi

# kubectl auth can-i verification
echo ""
echo "🔐 Permission verification (should all be 'no' for security):"
kubectl auth can-i create pods --as=system:serviceaccount:$NAMESPACE:$DEPLOYMENT || echo "✅ Cannot create pods"
kubectl auth can-i get secrets --as=system:serviceaccount:$NAMESPACE:$DEPLOYMENT || echo "✅ Cannot get secrets"
kubectl auth can-i '*' '*' --as=system:serviceaccount:$NAMESPACE:$DEPLOYMENT || echo "✅ No wildcard permissions"

# Generate security attestation
echo ""
echo "📋 Generating security attestation..."
cat > out/pod-security-attestation.json <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployment": "$DEPLOYMENT",
  "namespace": "$NAMESPACE",
  "security_checks": {
    "runAsNonRoot": $(echo "$POD_YAML" | grep -q "runAsNonRoot: true" && echo "true" || echo "false"),
    "readOnlyRootFilesystem": $(echo "$POD_YAML" | grep -q "readOnlyRootFilesystem: true" && echo "true" || echo "false"),
    "allowPrivilegeEscalation": $(echo "$POD_YAML" | grep -q "allowPrivilegeEscalation: false" && echo "false" || echo "true"),
    "capabilitiesDroppedAll": $(echo "$POD_YAML" | grep -A2 "capabilities:" | grep -q "drop.*ALL" && echo "true" || echo "false"),
    "runAsUser": "$USER_ID"
  },
  "verification_method": "kubectl_yaml_analysis",
  "attestor": "mc-platform-hardening-script"
}
EOF

echo "✅ Security attestation saved to out/pod-security-attestation.json"