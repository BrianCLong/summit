#!/usr/bin/env bash
set -euo pipefail

# Multi-Cluster Diff Script
# Usage: ./diff.sh --env <env> [--tag <tag>]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Defaults
ENV="dev"
TAG="latest"
NAMESPACE=""
CONTEXT=""
CHART_PATH="$REPO_ROOT/deploy/helm/intelgraph"

# Help message
usage() {
  echo "Usage: $0 --env <env> [options]"
  echo
  echo "Options:"
  echo "  --env <env>       Target environment (dev, staging, prod)"
  echo "  --tag <tag>       Image tag to diff (default: latest)"
  echo "  --namespace <ns>  Kubernetes namespace (default: intelgraph-<env>)"
  echo "  --context <ctx>   Kubernetes context name (default: intelgraph-<env>)"
  echo "  --help            Show this help message"
  exit 1
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift ;;
    --tag) TAG="$2"; shift ;;
    --namespace) NAMESPACE="$2"; shift ;;
    --context) CONTEXT="$2"; shift ;;
    --help) usage ;;
    *) echo "Unknown parameter: $1"; usage ;;
  esac
  shift
done

# Validate environment
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
  echo "Error: Invalid environment '$ENV'. Must be dev, staging, or prod."
  exit 1
fi

# Set environment-specific defaults
if [[ -z "$NAMESPACE" ]]; then
  NAMESPACE="intelgraph-${ENV}"
fi

if [[ -z "$CONTEXT" ]]; then
  CONTEXT="intelgraph-${ENV}"
fi

# Determine values file
VALUES_FILE="$CHART_PATH/values-${ENV}.yaml"
if [[ "$ENV" == "dev" ]]; then
    if [[ -f "$CHART_PATH/values-preview.yaml" ]]; then
        VALUES_FILE="$CHART_PATH/values-preview.yaml"
    elif [[ ! -f "$VALUES_FILE" ]]; then
         VALUES_FILE=""
    fi
fi

echo "🔍 Diffing $ENV (Namespace: $NAMESPACE, Context: $CONTEXT)..."

# Check if helm-diff is installed
if ! helm plugin list | grep -q "diff"; then
  echo "⚠️  helm-diff plugin not found. Falling back to 'helm template' diff."

  # Fetch current manifest
  echo "   Fetching current manifest..."
  CURRENT_MANIFEST=$(mktemp)
  helm get manifest intelgraph --namespace "$NAMESPACE" --kube-context "$CONTEXT" > "$CURRENT_MANIFEST" || { echo "   No release found."; rm "$CURRENT_MANIFEST"; exit 0; }

  # Generate new manifest
  echo "   Generating new manifest..."
  NEW_MANIFEST=$(mktemp)
  CMD="helm template intelgraph $CHART_PATH --namespace $NAMESPACE --kube-context $CONTEXT --set global.tag=$TAG"
  if [[ -n "$VALUES_FILE" && -f "$VALUES_FILE" ]]; then
    CMD="$CMD -f $VALUES_FILE"
  fi
  $CMD > "$NEW_MANIFEST"

  # Diff
  echo "   Comparing..."
  diff -u "$CURRENT_MANIFEST" "$NEW_MANIFEST" || true

  rm "$CURRENT_MANIFEST" "$NEW_MANIFEST"
else
  # Use helm diff
  CMD="helm diff upgrade intelgraph $CHART_PATH \
    --namespace $NAMESPACE \
    --kube-context $CONTEXT \
    --set global.tag=$TAG \
    --allow-unreleased"

  if [[ -n "$VALUES_FILE" && -f "$VALUES_FILE" ]]; then
    CMD="$CMD -f $VALUES_FILE"
  fi

  echo "Running: $CMD"
  $CMD
fi
