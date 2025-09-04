#!/usr/bin/env bash
set -euo pipefail

# Preflight: verify image exists, resolve digest, and test cluster pull via a Job.
# Usage: ./scripts/preflight.sh [<tag>]

IMAGE_REPO="ghcr.io/brianclong/maestro-control-plane"
TAG="${1:-$(git rev-parse --short=12 HEAD 2>/dev/null || echo latest)}"
IMG="${IMAGE_REPO}:${TAG}"

echo "🔍 Checking image: $IMG"
if ! command -v crane >/dev/null 2>&1; then
  echo "❌ 'crane' is required (install go-containerregistry's crane)" >&2
  exit 1
fi

crane manifest "$IMG" >/dev/null || { echo "❌ Manifest not found for $IMG"; exit 1; }

DIGEST="$(crane digest "$IMG")"
IMMUTABLE_REF="${IMAGE_REPO}@${DIGEST}"
echo "✅ Manifest OK. Digest: $DIGEST"
echo "🔐 Use immutable reference: ${IMMUTABLE_REF}"

# Optional: test pull from cluster via a short Job (namespace can be overridden via KNS)
KNS="${KNS:-maestro-staging}"
JOB_NAME="maestro-pull-check-$(date +%s)"
cat <<EOF | kubectl -n "$KNS" apply -f -
apiVersion: batch/v1
kind: Job
metadata: { name: ${JOB_NAME} }
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: pull
        image: ${IMMUTABLE_REF}
        command: ["sh","-lc","echo ok"]
EOF
kubectl -n "$KNS" wait --for=condition=complete --timeout=120s job/${JOB_NAME}
echo "✅ Cluster can pull ${IMMUTABLE_REF}"

echo "IMMUTABLE_REF=${IMMUTABLE_REF}"
