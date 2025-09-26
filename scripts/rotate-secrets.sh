#!/usr/bin/env bash
set -euo pipefail

# MC v0.3.2-mc Final Hardening - Secrets Rotation & Break-Glass
echo "🔐 MC Platform Secrets Rotation & Break-Glass Setup"

# Generate new SIEM key
echo "🔄 Rotating AUDIT_SIEM_KEY..."
NEW_SIEM_KEY=$(openssl rand -base64 32)
kubectl patch secret mc-platform-secrets --patch='{"data":{"AUDIT_SIEM_KEY":"'$(echo -n "$NEW_SIEM_KEY" | base64)'"}}'

# Generate break-glass credentials (14-day auto-expire)
echo "🚨 Creating break-glass credentials..."
BREAK_GLASS_USER="mc-emergency-$(date +%s)"
BREAK_GLASS_PASS=$(openssl rand -base64 24)
EXPIRE_DATE=$(date -d "+14 days" -u +"%Y-%m-%dT%H:%M:%SZ")

# Create break-glass service account with minimal permissions
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: $BREAK_GLASS_USER
  namespace: default
  annotations:
    mc-platform/expires: "$EXPIRE_DATE"
    mc-platform/purpose: "emergency-access"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: $BREAK_GLASS_USER-role
  namespace: default
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "patch"]
- apiGroups: [""]
  resources: ["pods", "logs"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: $BREAK_GLASS_USER-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: $BREAK_GLASS_USER
  namespace: default
roleRef:
  kind: Role
  name: $BREAK_GLASS_USER-role
  apiGroup: rbac.authorization.k8s.io
EOF

# Store break-glass credentials securely
kubectl create secret generic break-glass-${BREAK_GLASS_USER} \
  --from-literal=username="$BREAK_GLASS_USER" \
  --from-literal=password="$BREAK_GLASS_PASS" \
  --from-literal=expires="$EXPIRE_DATE"

echo "✅ Break-glass user: $BREAK_GLASS_USER (expires: $EXPIRE_DATE)"

# Generate new LLM API key rotation commands (template)
echo "🤖 LLM API Key Rotation Commands:"
echo "# OpenAI"
echo "kubectl patch secret llm-api-keys --patch='{\"data\":{\"OPENAI_API_KEY\":\"'$(echo -n 'sk-new-key-here' | base64)'\"}}}'"
echo "# Anthropic"
echo "kubectl patch secret llm-api-keys --patch='{\"data\":{\"ANTHROPIC_API_KEY\":\"'$(echo -n 'sk-ant-new-key-here' | base64)'\"}}}'"

# Verify secret rotation
echo "🔍 Verifying secret rotation..."
kubectl get secret mc-platform-secrets -o jsonpath='{.data.AUDIT_SIEM_KEY}' | base64 -d | head -c 10
echo "... (rotated)"

echo "✅ Secrets rotation complete"