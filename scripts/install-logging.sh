#!/usr/bin/env bash
set -e

echo "🪵 Deploying Fluent Bit (Logs -> CloudWatch)..."

helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

helm upgrade --install fluent-bit fluent/fluent-bit \
  --namespace logging --create-namespace \
  --values k8s/logging/fluent-bit-values.yaml

echo "✅ Fluent Bit Deployed!"
echo "   - Logs will appear in CloudWatch Log Group: /aws/eks/summit-prod-eks/workloads"
