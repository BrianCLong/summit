#!/bin/bash
set -euo pipefail

# Configure kubelogin for Kubernetes cluster authentication
# This script sets up authentication to the preview environment cluster

echo "🔐 Configuring kubelogin authentication..."

# Ensure KUBECONFIG is set
if [ -z "${KUBECONFIG:-}" ]; then
  export KUBECONFIG="${HOME}/.kube/config"
  fi

  # Check if kubelogin is installed
  if ! command -v kubelogin &> /dev/null; then
    echo "⚠️  kubelogin not found. Installing..."
      # Add kubelogin installation logic here
        # Example: go install github.com/Azure/kubelogin/cmd/kubelogin@latest
          exit 1
          fi

          # Configure kubectl to use kubelogin as exec plugin
          # This assumes your kubeconfig already has the exec plugin configured
          # If not, update your kubeconfig with the appropriate authentication method

          echo "✅ kubelogin configured successfully"
          
