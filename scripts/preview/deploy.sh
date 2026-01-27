#!/bin/bash
set -euo pipefail

# PR Preview Deployment Script
# Usage: ./scripts/preview/deploy.sh <PR_NUMBER>

PR_NUMBER=${1:?PR number is required}
NAMESPACE="intelgraph-pr-${PR_NUMBER}"
TAG="pr-${PR_NUMBER}"
CHART_PATH="./deploy/helm/intelgraph"
VALUES_FILE="${CHART_PATH}/values-preview.yaml"

echo "🚀 Deploying preview for PR #$PR_NUMBER..."
echo "   Namespace: $NAMESPACE"
echo "   Tag:       $TAG"

# Create namespace with labels for the janitor script
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | \
  kubectl apply -f -

kubectl label namespace "$NAMESPACE" \
  "preview.summit.ai/pr=${PR_NUMBER}" \
  "preview.summit.ai/managed-by=summit-ci" \
  --overwrite

kubectl annotate namespace "$NAMESPACE" \
  "preview.summit.ai/ttl-hours=24" \
  "preview.summit.ai/last-updated=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --overwrite

# Deploy using Helm
helm upgrade --install "intelgraph-pr-${PR_NUMBER}" "$CHART_PATH" \
  --namespace "$NAMESPACE" \
  --values "$VALUES_FILE" \
  --set global.tag="$TAG" \
  --set global.ingress.host="pr-${PR_NUMBER}.preview.summit.ai" \
  --wait \
  --timeout 10m

echo "✅ Preview environment for PR #$PR_NUMBER is ready"

echo "🔗 URL: https://pr-${PR_NUMBER}.preview.summit.ai"



# Seeding (Optional)

if [ "${SEED_DATA:-false}" = "true" ]; then

    echo "🧪 Seeding preview data..."

    # Attempt to run seeding via a one-off job or by calling the API

    # For now, we'll just log that we would do it.

    echo "   (Seeding logic would go here, e.g., kubectl exec into api pod)"

fi
