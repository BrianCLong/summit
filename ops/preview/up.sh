#!/usr/bin/env bash
set -euo pipefail
ID="${1:?preview id}"
NS="${2:?namespace}"
PREVIEW_TTL_HOURS="${PREVIEW_TTL_HOURS:-72}"
CREATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

kubectl apply -f - <<EOF_NS
apiVersion: v1
kind: Namespace
metadata:
  name: "${NS}"
  labels:
    summit.sh/preview: "true"
    summit.sh/preview-id: "${ID}"
  annotations:
    summit.sh/preview-id: "${ID}"
    summit.sh/created-at: "${CREATED_AT}"
    summit.sh/ttl-hours: "${PREVIEW_TTL_HOURS}"
EOF_NS

kubectl apply -n "$NS" -f - <<EOF_QUOTA
apiVersion: v1
kind: ResourceQuota
metadata:
  name: preview-resources
spec:
  hard:
    pods: "20"
    services: "10"
    configmaps: "30"
    secrets: "30"
    persistentvolumeclaims: "4"
    requests.cpu: "4"
    limits.cpu: "6"
    requests.memory: 8Gi
    limits.memory: 12Gi
    requests.storage: 40Gi
    requests.ephemeral-storage: 8Gi
    limits.ephemeral-storage: 16Gi
EOF_QUOTA

kubectl apply -n "$NS" -f - <<EOF_LIMITS
apiVersion: v1
kind: LimitRange
metadata:
  name: preview-defaults
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "1Gi"
        ephemeral-storage: "2Gi"
      defaultRequest:
        cpu: "250m"
        memory: "512Mi"
        ephemeral-storage: "1Gi"
EOF_LIMITS

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
