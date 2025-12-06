#!/usr/bin/env bash
set -euo pipefail

# Multi-Cluster Management Wrapper
# Usage: ./manage.sh <action> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Help message
usage() {
  echo "Usage: $0 <action> [options]"
  echo
  echo "Actions:"
  echo "  deploy   Deploy to clusters"
  echo "  diff     Diff changes for clusters"
  echo
  echo "Options:"
  echo "  --all             Apply to all environments (dev, staging, prod)"
  echo "  --env <env>       Target specific environment"
  echo "  --tag <tag>       Image tag (default: latest)"
  echo "  --dry-run         Simulate deployment (deploy action only)"
  echo "  --help            Show this help message"
  exit 1
}

if [[ $# -eq 0 ]]; then
  usage
fi

ACTION=$1
shift

ENV=""
ALL=false
TAG="latest"
DRY_RUN=""

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift ;;
    --all) ALL=true ;;
    --tag) TAG="$2"; shift ;;
    --dry-run) DRY_RUN="--dry-run" ;;
    --help) usage ;;
    *) echo "Unknown parameter: $1"; usage ;;
  esac
  shift
done

if [[ "$ALL" == "true" ]]; then
  ENVS=("dev" "staging" "prod")
elif [[ -n "$ENV" ]]; then
  ENVS=("$ENV")
else
  echo "Error: Must specify --env <env> or --all"
  usage
fi

for TARGET_ENV in "${ENVS[@]}"; do
  echo "---------------------------------------------------"
  echo "Targeting Environment: $TARGET_ENV"
  echo "---------------------------------------------------"

  case $ACTION in
    deploy)
      "$SCRIPT_DIR/deploy.sh" --env "$TARGET_ENV" --tag "$TAG" $DRY_RUN
      ;;
    diff)
      "$SCRIPT_DIR/diff.sh" --env "$TARGET_ENV" --tag "$TAG"
      ;;
    *)
      echo "Unknown action: $ACTION"
      usage
      ;;
  esac
  echo
done
