#!/usr/bin/env bash
set -euo pipefail
ID="${1:?preview id}"
NS="${2:?namespace}"

kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"

# Render and deploy Helm chart with preview-specific values
helm upgrade --install "${ID}" charts/app \
  --namespace "$NS" \
  -f charts/app/values.yaml \
  -f charts/app/values.preview.yaml \
  --set image.tag="${GITHUB_SHA:-preview}" \
  --set env.PREVIEW_ID="$ID" \
  --wait --timeout 10m

# Output basic endpoints (customize selectors)
APP_SVC=$(kubectl -n "$NS" get svc -l app.kubernetes.io/name=app -o jsonpath='{.items[0].metadata.name}')
PORT=$(kubectl -n "$NS" get svc "$APP_SVC" -o jsonpath='{.spec.ports[0].port}')
HOST="${ID}.${PREVIEW_BASE_DOMAIN:-preview.local}"

echo "http://$HOST:$PORT" > "/tmp/${ID}_url.txt"
