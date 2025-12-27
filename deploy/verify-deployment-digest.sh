#!/usr/bin/env bash
set -euo pipefail

K8S_NAMESPACE="${K8S_NAMESPACE:-default}"
K8S_DEPLOYMENT="${K8S_DEPLOYMENT:-}"
K8S_CONTAINER="${K8S_CONTAINER:-}"
SIGNED_ARTIFACT_DIGEST="${SIGNED_ARTIFACT_DIGEST:-}"
SIGNED_ARTIFACT_PATH="${SIGNED_ARTIFACT_PATH:-release-artifacts/provenance.json}"
EVIDENCE_DIR="${EVIDENCE_DIR:-evidence-bundles}"

if [[ -z "$K8S_DEPLOYMENT" ]]; then
  echo "❌ K8S_DEPLOYMENT is required." >&2
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "❌ kubectl is required to fetch deployed image digest." >&2
  exit 1
fi

image_ref=$(kubectl -n "$K8S_NAMESPACE" get deployment "$K8S_DEPLOYMENT" -o json | python - <<'PY'
import json
import os
import sys

payload = json.load(sys.stdin)
containers = payload.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
if not containers:
    sys.exit(1)
container_name = os.environ.get("K8S_CONTAINER")
if container_name:
    for container in containers:
        if container.get("name") == container_name:
            print(container.get("image", ""))
            sys.exit(0)
print(containers[0].get("image", ""))
PY
)

if [[ -z "$image_ref" ]]; then
  echo "❌ Unable to resolve deployed image reference." >&2
  exit 1
fi

if [[ "$image_ref" == *@sha256:* ]]; then
  deployed_digest="${image_ref##*@}"
else
  echo "❌ Deployed image is not digest-pinned: $image_ref" >&2
  exit 1
fi

if [[ -z "$SIGNED_ARTIFACT_DIGEST" ]]; then
  if [[ ! -f "$SIGNED_ARTIFACT_PATH" ]]; then
    echo "❌ Signed artifact digest not provided and ${SIGNED_ARTIFACT_PATH} not found." >&2
    exit 1
  fi
  SIGNED_ARTIFACT_DIGEST=$(python - <<PY
import json
import sys

path = "${SIGNED_ARTIFACT_PATH}"
with open(path, "r", encoding="utf-8") as handle:
    data = json.load(handle)
subjects = data.get("subject", [])
if not subjects:
    sys.exit(1)
digest = subjects[0].get("digest", {}).get("sha256")
if not digest:
    sys.exit(1)
print(digest)
PY
)
fi

if [[ -z "$SIGNED_ARTIFACT_DIGEST" ]]; then
  echo "❌ Signed artifact digest could not be resolved." >&2
  exit 1
fi

if [[ "$SIGNED_ARTIFACT_DIGEST" != sha256:* ]]; then
  SIGNED_ARTIFACT_DIGEST="sha256:${SIGNED_ARTIFACT_DIGEST}"
fi

match="false"
if [[ "$deployed_digest" == "$SIGNED_ARTIFACT_DIGEST" ]]; then
  match="true"
fi

mkdir -p "$EVIDENCE_DIR"
record_path="$EVIDENCE_DIR/deploy-verify-${GITHUB_RUN_ID:-local}-$(date -u +%Y%m%dT%H%M%SZ).json"
cat <<JSON > "$record_path"
{
  "service": "${K8S_DEPLOYMENT}",
  "namespace": "${K8S_NAMESPACE}",
  "container": "${K8S_CONTAINER:-${K8S_DEPLOYMENT}}",
  "deployed_image": "${image_ref}",
  "deployed_digest": "${deployed_digest}",
  "signed_artifact_digest": "${SIGNED_ARTIFACT_DIGEST}",
  "match": ${match},
  "verified_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "workflow_run": "${GITHUB_RUN_ID:-local}"
}
JSON

echo "🧾 Evidence record written to ${record_path}"

echo "Deployed digest: ${deployed_digest}"
echo "Signed artifact digest: ${SIGNED_ARTIFACT_DIGEST}"

if [[ "$match" != "true" ]]; then
  echo "❌ Deployment digest mismatch." >&2
  exit 1
fi

echo "✅ Deployment digest matches signed artifact."
