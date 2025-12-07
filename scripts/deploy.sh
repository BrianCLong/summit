#!/usr/bin/env bash
set -euo pipefail

STRATEGY="rolling"
WEIGHT="100"

while [[ $# -gt 0 ]]; do
  case $1 in
    --strategy)
      STRATEGY="$2"
      shift 2
      ;;
    --weight)
      WEIGHT="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      shift
      ;;
  esac
done

echo "🚀 Deploying with strategy=${STRATEGY} weight=${WEIGHT}"
echo "Namespace: ${NAMESPACE:-intelgraph-prod}"

# Placeholder for actual deployment logic (Helm/Kubectl)
# e.g., helm upgrade ...

echo "✅ Deployment simulation complete."
