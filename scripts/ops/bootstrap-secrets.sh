#!/bin/bash
set -euo pipefail
source .env.maestro-dev

kubectl get ns "$NAMESPACE" >/dev/null 2>&1 || kubectl create ns "$NAMESPACE"

# App secrets (one secret for app, one for ops)
kubectl -n "$NAMESPACE" delete secret maestro-secrets >/dev/null 2>&1 || true
kubectl -n "$NAMESPACE" create secret generic maestro-secrets \
  --from-literal=NEO4J_URI="$NEO4J_URI" \
  --from-literal=NEO4J_USER="${NEO4J_USER:-}" \
  --from-literal=NEO4J_USERNAME="${NEO4J_USERNAME:-${NEO4J_USER:-}}" \
  --from-literal=NEO4J_PASSWORD="$NEO4J_PASSWORD" \
  --from-literal=POSTGRES_URI="$POSTGRES_URI" \
  --from-literal=REDIS_URL="$REDIS_URL" \
  --from-literal=JWT_ISSUER="$JWT_ISSUER" \
  --from-literal=JWT_AUDIENCE="$JWT_AUDIENCE" \
  --from-literal=JWT_PUBLIC_KEY="$JWT_PUBLIC_KEY" \
  --from-literal=LLM_LIGHT_BASE_URL="$LLM_LIGHT_BASE_URL" \
  --from-literal=LLM_LIGHT_API_KEY="$LLM_LIGHT_API_KEY" \
  --from-literal=LLM_HEAVY_BASE_URL="$LLM_HEAVY_BASE_URL" \
  --from-literal=LLM_HEAVY_API_KEY="$LLM_HEAVY_API_KEY" \
  --from-literal=CONDUCTOR_BUDGET_DAILY_USD="$CONDUCTOR_BUDGET_DAILY_USD" \
  --from-literal=CONDUCTOR_RPS_MAX="$CONDUCTOR_RPS_MAX" \
  --from-literal=ENABLE_API_KEYS="$ENABLE_API_KEYS" \
  --from-literal=API_KEYS="$API_KEYS"

kubectl -n monitoring delete secret pagerduty-routing-key >/dev/null 2>&1 || true
kubectl -n monitoring create secret generic pagerduty-routing-key \
  --from-literal=ROUTING_KEY="$PAGERDUTY_ROUTING_KEY"

echo "✅ Secrets created in $NAMESPACE and monitoring."
