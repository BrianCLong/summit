#!/bin/bash
set -e

echo "Deploying IntelGraph v1.0.0-canary to prod-canary..."

# Ensure we are in the right context (simulated)
# aws eks update-kubeconfig --name summit-prod --region us-west-2

# Deploy using Helm
helm upgrade --install intelgraph ./charts/intelgraph \
  --namespace intelgraph-canary \
  --create-namespace \
  --values ./charts/intelgraph/values.yaml \
  --set global.env=prod-canary \
  --wait

echo "Deployment complete! Access at https://intelgraph.acme.com"
