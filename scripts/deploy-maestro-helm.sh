#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${NAMESPACE:-intelgraph-prod}
HOST=${HOST:?Set HOST, e.g. maestro.dev.intelgraph.local}
IMAGE_REPO=${IMAGE_REPO:-ghcr.io/BrianCLong/intelgraph/maestro-control-plane}
IMAGE_TAG=${IMAGE_TAG:?Set IMAGE_TAG, e.g. sha-<GITHUB_SHA>}
ALLOWLIST_CIDRS=${ALLOWLIST_CIDRS:-}

echo "🚀 Deploying Maestro via Helm to namespace ${NAMESPACE}"

CMD=(helm upgrade --install maestro charts/maestro \
  --namespace ${NAMESPACE} \
  --create-namespace \
  -f charts/maestro/values-maestro-system.yaml \
  --set image.repository=${IMAGE_REPO} \
  --set image.tag=${IMAGE_TAG} \
  --set ingress.hosts[0].host=${HOST})

if [ -n "${ALLOWLIST_CIDRS}" ]; then
  CMD+=(--set ingress.annotations.nginx\.ingress\.kubernetes\.io/whitelist-source-range=${ALLOWLIST_CIDRS})
fi

"${CMD[@]}"

echo "✅ Helm deployment command submitted. Use kubectl to watch status."
