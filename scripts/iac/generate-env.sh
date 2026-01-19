#!/bin/bash
set -e

ENV=$1
if [ -z "$ENV" ]; then
  echo "Usage: $0 <environment>"
  echo "Available environments: dev, stage, prod"
  exit 1
fi

# Resolve directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE="$REPO_ROOT/iac/env/template.tfvars"
TARGET="$REPO_ROOT/iac/env/${ENV}.tfvars"

if [ ! -f "$TEMPLATE" ]; then
  echo "Template not found at $TEMPLATE"
  exit 1
fi

# Simple replacement
sed "s/ENV_PLACEHOLDER/$ENV/g" "$TEMPLATE" > "$TARGET"
echo "Generated $TARGET"
