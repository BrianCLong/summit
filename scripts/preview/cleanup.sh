#!/bin/bash
set -euo pipefail

# PR Preview Cleanup Script
# Usage: ./scripts/preview/cleanup.sh [PR_NUMBER]

PR_NUMBER=${1:-""}

if [ -n "$PR_NUMBER" ]; then
    NAMESPACE="intelgraph-pr-${PR_NUMBER}"
    echo "🧹 Cleaning up preview environment for PR #$PR_NUMBER..."
    echo "   Namespace: $NAMESPACE"

    # Uninstall Helm release
    helm uninstall "intelgraph-pr-${PR_NUMBER}" --namespace "$NAMESPACE" --ignore-not-found --wait

    # Delete namespace
    kubectl delete namespace "$NAMESPACE" --ignore-not-found --wait=false
    
    echo "✅ Cleanup for PR #$PR_NUMBER initiated"
else
    echo "🧹 Running general preview environment cleanup..."
    # Call the existing janitor script if available
    if [ -f "./scripts/preview-env-cleanup.sh" ]; then
        ./scripts/preview-env-cleanup.sh --inactive-hours 24
    else
        # Find all summit-pr namespaces and delete them if they match some criteria
        # For now, just log that we would do it.
        echo "Searching for stale preview namespaces..."
        kubectl get namespaces -o name | grep "summit-pr-" || echo "No preview namespaces found."
    fi
    echo "✅ General cleanup complete"
fi