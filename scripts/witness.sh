#!/usr/bin/env bash
set -euo pipefail

# Witness bundle: prove policy denial, snapshot rollout/SLOs, optional PD test.
# Usage: NS=maestro-prod GRAFANA_URL=... GRAFANA_API_TOKEN=... PAGERDUTY_ROUTING_KEY=... ./scripts/witness.sh

OUT="witness_$(date -u +%Y%m%dT%H%M%SZ)"
NS="${NS:-maestro-prod}"
ART_DIR="artifacts/${OUT}"
mkdir -p "${ART_DIR}"

echo "📦 Capturing versions / digests"
kubectl -n "$NS" get deploy,rollout,svc,ing -o wide > "${ART_DIR}/k8s_objects.txt" || true
kubectl -n "$NS" get po -owide > "${ART_DIR}/pods.txt" || true

echo "🛡️ Gatekeeper deny test (expect DENY)"
set +e
kubectl -n "$NS" apply -f - > "${ART_DIR}/deny-test.out" 2>&1 <<'EOT'
apiVersion: v1
kind: Pod
metadata: { name: digest-deny-test }
spec:
  containers:
  - name: bad
    image: ghcr.io/library/busybox:latest   # tag, not digest => should be denied
    command: ["sh","-lc","sleep 5"]
  restartPolicy: Never
EOT
DENY_RC=$?
set -e
if grep -qi "required-image-digest" "${ART_DIR}/deny-test.out"; then
  echo "✅ Deny policy enforced"
else
  echo "❌ Deny evidence missing (check Gatekeeper constraint/logs)"
fi
if [ $DENY_RC -eq 0 ]; then
  echo "❌ Pod applied but should be denied"; exit 1
fi

echo "🛡️ Gatekeeper annotations test (expect DENY)"
set +e
kubectl -n "$NS" apply -f - > "${ART_DIR}/deny-annotations.out" 2>&1 <<'EOT'
apiVersion: v1
kind: Pod
metadata: { name: annotations-deny-test }
spec:
  containers:
  - name: ok
    image: ghcr.io/library/busybox@sha256:f9b6f0636f2a728b9b0acc... # placeholder digest
    command: ["sh","-lc","sleep 5"]
  restartPolicy: Never
EOT
ANN_RC=$?
set -e
if grep -qi "missing or invalid pod annotations" "${ART_DIR}/deny-annotations.out"; then
  echo "✅ Required annotations policy enforced"
else
  echo "❌ Annotation policy evidence missing"; fi
if [ $ANN_RC -eq 0 ]; then echo "❌ Pod applied but should be denied by annotations policy"; exit 1; fi

echo "📊 Snapshot rollout + SLO"
kubectl argo rollouts get rollout maestro-server-rollout -n "$NS" -o yaml > "${ART_DIR}/rollout.yaml" 2>/dev/null || true

if [ -n "${GRAFANA_URL:-}" ] && [ -n "${GRAFANA_API_TOKEN:-}" ]; then
  if ! command -v jq >/dev/null 2>&1; then
    echo "⚠️ 'jq' not found; skipping Grafana snapshot"
  else
    curl -sS -H "Authorization: Bearer $GRAFANA_API_TOKEN" \
      "$GRAFANA_URL/api/search?query=Maestro" | jq '.' > "${ART_DIR}/grafana_search.json" || true
  fi
fi

echo "🚨 Synthetic PagerDuty alert (event v2)"
if [ -n "${PAGERDUTY_ROUTING_KEY:-}" ]; then
  curl -sS -X POST "https://events.pagerduty.com/v2/enqueue" \
    -H "Content-Type: application/json" \
    -d @- <<JSON > "${ART_DIR}/pd_enq.json"
{"routing_key":"${PAGERDUTY_ROUTING_KEY}","event_action":"trigger",
 "payload":{"summary":"Maestro synthetic alert","severity":"warning",
 "source":"witness.sh","component":"maestro","group":"prod","class":"synthetic"}}
JSON
fi

tar -czf "artifacts/${OUT}.tar.gz" -C artifacts "${OUT}"
echo "🧾 Evidence bundle at artifacts/${OUT}.tar.gz"
