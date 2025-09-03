#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${NAMESPACE:-maestro-system}

echo "[Readiness] Checking required secrets..."
kubectl -n "$NAMESPACE" get secret maestro-secrets 1>/dev/null
kubectl -n monitoring get secret pagerduty-routing-key 1>/dev/null

echo "[Readiness] Checking Rollout health..."
if command -v kubectl-argo-rollouts >/dev/null 2>&1; then
  kubectl-argo-rollouts -n "$NAMESPACE" status rollout/maestro-server-rollout --timeout 10m
else
  echo "kubectl-argo-rollouts not found; using rollout pods readiness check"
  kubectl -n "$NAMESPACE" rollout status deploy/maestro-server --timeout=600s || true
fi

echo "[Readiness] Sending test alert to Alertmanager..."
kubectl -n monitoring run curl-tmp --rm -i --restart=Never --image=curlimages/curl:8.8.0 --overrides='{"spec":{"serviceAccountName":"default"}}' -- \
  sh -lc '
    set -e; \
    data="[{\"labels\":{\"alertname\":\"TestPage\",\"severity\":\"critical\"},\"annotations\":{\"summary\":\"Readiness test alert\"}}]"; \
    curl -sS -XPOST -H "Content-Type: application/json" http://alertmanager.monitoring.svc.cluster.local:9093/api/v2/alerts -d "$data" -o /dev/stderr -w "HTTP %{http_code}\n" | grep -q "HTTP 202"'

echo "[Readiness] Verifying Prometheus blackbox metrics present..."
kubectl -n monitoring run curl-tmp --rm -i --restart=Never --image=curlimages/curl:8.8.0 --overrides='{"spec":{"serviceAccountName":"default"}}' -- \
  sh -lc '
    curl -sS "http://kube-prometheus-stack-prometheus.monitoring.svc:9090/api/v1/series?match[]=probe_success{job=\"blackbox\"}" | jq -e ".data | length > 0"'

echo "✅ Readiness checks passed"
