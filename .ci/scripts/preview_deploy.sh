#!/usr/bin/env bash
set -euo pipefail
: "${GITHUB_REF:?}"
PR_NUMBER=$(jq -r '.pull_request.number' <(echo "$GITHUB_EVENT_PATH" | xargs cat) 2>/dev/null || echo ${GITHUB_REF##*/})
NS=pr-${PR_NUMBER}
kubectl create ns "$NS" --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install summit ./helm -n "$NS" \
  --set image.tag=sha-${GITHUB_SHA} \
  --wait --timeout 15m