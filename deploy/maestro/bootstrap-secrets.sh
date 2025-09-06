#!/usr/bin/env bash
# Bootstrap required K8s secrets for Maestro Helm installs
# - Creates namespaces (if missing)
# - Creates/updates `maestro-secrets` in dev, staging, prod
# - Idempotent: safe to re-run anytime

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DOMAIN="${ROOT_DOMAIN:-intelgraph.io}"

echo -e "${BLUE}🔐 Bootstrapping Maestro K8s secrets...${NC}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo -e "${RED}❌ Missing required tool: $1${NC}" >&2
    exit 1
  fi
}

need kubectl
need openssl

# Namespaces used by the main deploy script
DEV_NS="maestro-dev"
STAGE_NS="maestro-staging"
PROD_NS="maestro-prod"

echo -e "${BLUE}🧭 Ensuring namespaces exist...${NC}"
kubectl create namespace "$DEV_NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl create namespace "$STAGE_NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl create namespace "$PROD_NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

# Generate defaults if not provided
export MAESTRO_API_TOKEN_DEV="${MAESTRO_API_TOKEN_DEV:-$(openssl rand -hex 16)}"
export MAESTRO_API_TOKEN_STAGE="${MAESTRO_API_TOKEN_STAGE:-$(openssl rand -hex 16)}"
export MAESTRO_API_TOKEN_PROD="${MAESTRO_API_TOKEN_PROD:-$(openssl rand -hex 16)}"

# Optional extras; helm chart reads some via env when present
export BASE_URL_STAGE="${BASE_URL_STAGE:-https://staging.${ROOT_DOMAIN}}"
export BASE_URL_PROD="${BASE_URL_PROD:-https://maestro.${ROOT_DOMAIN}}"

# Helper to upsert a secret from literals
apply_secret() {
  local ns=$1; shift
  local name=$1; shift
  kubectl -n "$ns" create secret generic "$name" "$@" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
}

echo -e "${BLUE}🔑 Creating/Updating secrets...${NC}"

# Dev
apply_secret "$DEV_NS" maestro-secrets \
  --from-literal=MAESTRO_API_TOKEN="$MAESTRO_API_TOKEN_DEV"

# Staging
apply_secret "$STAGE_NS" maestro-secrets \
  --from-literal=MAESTRO_API_TOKEN="$MAESTRO_API_TOKEN_STAGE" \
  --from-literal=BASE_URL="$BASE_URL_STAGE"

# Production
apply_secret "$PROD_NS" maestro-secrets \
  --from-literal=MAESTRO_API_TOKEN="$MAESTRO_API_TOKEN_PROD" \
  --from-literal=BASE_URL="$BASE_URL_PROD"

echo -e "${GREEN}✅ Secrets ready in namespaces:${NC} $DEV_NS, $STAGE_NS, $PROD_NS"
echo -e "${YELLOW}Tokens:${NC}"
echo -e "  dev:     $MAESTRO_API_TOKEN_DEV"
echo -e "  staging: $MAESTRO_API_TOKEN_STAGE"
echo -e "  prod:    $MAESTRO_API_TOKEN_PROD"
echo -e "${BLUE}Next:${NC} run: bash deploy/go-live-now.sh"

