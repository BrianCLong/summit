#!/bin/bash
set -euo pipefail

PR_NUMBER=${1:-}

if [ -z "$PR_NUMBER" ]; then
  echo "❌ Error: PR number required"
    exit 1
    fi

    NAMESPACE="preview-pr-${PR_NUMBER}"
    RELEASE_NAME="preview-${PR_NUMBER}"

    echo "🚀 Deploying preview stack for PR #$PR_NUMBER..."
    echo "📍 Namespace: $NAMESPACE"
    echo "📍 Release: $RELEASE_NAME"

    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

    # Label namespace for PR tracking
    kubectl label namespace "$NAMESPACE" \
      pr.number="$PR_NUMBER" \
        app.kubernetes.io/managed-by="summit-preview" \
          --overwrite

          # Add Helm repository
          helm repo add summit https://charts.example.com/summit || true
          helm repo update

          # Deploy using Helm
          helm upgrade --install "$RELEASE_NAME" summit/app \
            --namespace "$NAMESPACE" \
              --create-namespace \
                --values values.yaml \
                  --set image.tag="${IMAGE_TAG:-latest}" \
                    --set ingress.host="pr-${PR_NUMBER}.preview.example.com" \
                      --wait \
                        --timeout 5m

                        echo "✅ Preview deployment completed"
                        echo "🌐 Access at: https://pr-${PR_NUMBER}.preview.example.com"
                        
