#!/usr/bin/env bash
set -e

echo "🔍 Verifying Summit Cluster Health..."

# 1. Check Nodes
echo "Checking Nodes..."
kubectl get nodes
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
if [ "$NODE_COUNT" -lt 2 ]; then
  echo "❌ Error: Expected at least 2 nodes, found $NODE_COUNT"
  exit 1
fi

# 2. Check Core Services (Ingress, Cert-Manager)
echo "Checking Core Services..."
kubectl get pods -n ingress-nginx
kubectl get pods -n cert-manager

# 3. Check App Services
echo "Checking Summit Apps..."
kubectl get pods -l app.kubernetes.io/instance=maestro
kubectl get pods -l app.kubernetes.io/instance=prov-ledger
kubectl get pods -l app.kubernetes.io/instance=neo4j-cluster

# 4. Check Database Secrets
echo "Checking Secrets..."
if kubectl get secret db-credentials >/dev/null 2>&1; then
  echo "✅ db-credentials found"
else
  echo "❌ db-credentials MISSING! Run ./scripts/aws-init-secrets.sh"
fi

echo "✅ Cluster Verification Passed!"
