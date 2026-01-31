#!/bin/bash
set -euo pipefail

# PR Preview Kubeconfig Configuration
# This script configures kubectl to interact with the preview cluster.

CLUSTER_NAME=${PREVIEW_CLUSTER_NAME:-"summit-preview"}
REGION=${AWS_REGION:-"us-east-2"}

echo "🔧 Configuring kubeconfig for cluster: $CLUSTER_NAME in $REGION..."

# Use AWS CLI to get credentials for the EKS cluster
if command -v aws &> /dev/null; then
    aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$REGION"
    echo "✅ Kubeconfig updated"
else
    echo "⚠️  aws CLI not found. Assuming kubeconfig is already configured or using existing context."
fi

# Verify connection
if kubectl cluster-info &> /dev/null; then
    echo "✅ Successfully connected to cluster"
else
    echo "❌ Failed to connect to cluster. Check AWS credentials and permissions."
    exit 1
fi