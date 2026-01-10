#!/usr/bin/env bash
set -euo pipefail

# Multi-Cluster Deployment Script
# Usage: ./deploy.sh --env <env> [--tag <tag>] [--dry-run]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Defaults
ENV="dev"
TAG="latest"
DRY_RUN=""
NAMESPACE=""
CONTEXT=""
CHART_PATH="$REPO_ROOT/deploy/helm/intelgraph"

# Help message
usage() {
  echo "Usage: $0 --env <env> [options]"
  echo
  echo "Options:"
  echo "  --env <env>       Target environment (dev, staging, prod)"
  echo "  --tag <tag>       Image tag to deploy (default: latest)"
  echo "  --namespace <ns>  Kubernetes namespace (default: intelgraph-<env>)"
  echo "  --context <ctx>   Kubernetes context name (default: intelgraph-<env>)"
  echo "  --dry-run         Simulate the deployment"
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
    --dry-run) DRY_RUN="--dry-run"; ;;
    --help) usage ;;
    *) echo "Unknown parameter: $1"; usage ;;
  esac
  shift
done

# GA Gate Enforcement
if [[ "${DEPLOY_FORCE:-false}" != "true" && "${DRY_RUN}" != "--dry-run" ]]; then
  echo "🔒 Enforcing GA Gates..."
  # Run verification
  if ! "$REPO_ROOT/scripts/verify-ga.sh"; then
    echo "❌ GA Verification Failed. Use DEPLOY_FORCE=true to override (audit logged)."
    exit 1
  fi

  # Run policy check if it exists
  if [[ -f "$REPO_ROOT/scripts/check-ga-policy.sh" ]]; then
     echo "🔒 Checking GA Policy..."
     if ! "$REPO_ROOT/scripts/check-ga-policy.sh"; then
        echo "❌ GA Policy Check Failed. Use DEPLOY_FORCE=true to override."
        exit 1
     fi
  fi
else
  if [[ "${DEPLOY_FORCE:-false}" == "true" ]]; then
     echo "⚠️  BYPASSING GA GATES (DEPLOY_FORCE=true)"
     echo "    This action will be logged to audit trail."
  fi
fi

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
    # Map dev to preview if specific dev values don't exist, or just use values.yaml
    if [[ -f "$CHART_PATH/values-preview.yaml" ]]; then
        VALUES_FILE="$CHART_PATH/values-preview.yaml"
    elif [[ ! -f "$VALUES_FILE" ]]; then
        echo "Warning: No specific values file found for $ENV, using defaults."
        VALUES_FILE=""
    fi
fi

# Build Helm command
CMD="helm upgrade --install intelgraph $CHART_PATH \
  --namespace $NAMESPACE \
  --create-namespace \
  --kube-context $CONTEXT \
  --set global.tag=$TAG \
  $DRY_RUN"

if [[ -n "$VALUES_FILE" && -f "$VALUES_FILE" ]]; then
  CMD="$CMD -f $VALUES_FILE"
fi

# Execute
echo "🚀 Deploying to $ENV (Namespace: $NAMESPACE, Context: $CONTEXT)..."
echo "📦 Tag: $TAG"
echo "📄 Values: ${VALUES_FILE:-defaults}"
echo "Running: $CMD"

# Execute command
if $CMD; then
  echo "✅ Deployment successful!"
else
  echo "❌ Deployment failed."
  exit 1
fi
