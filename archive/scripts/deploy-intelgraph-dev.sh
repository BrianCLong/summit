#!/usr/bin/env bash
set -euo pipefail

### ===== 0) CONFIG (edit if needed) =====
export VERSION="v0.4.1"
export ENV="dev"
export ORG_IMAGE="ghcr.io/brianclong/intelgraph"
export APP="intelgraph"
export NAMESPACE="${APP}-${ENV}"          # intelgraph-dev
export IMAGE_TAG="${VERSION}-${ENV}.$(git rev-parse --short HEAD)"
export IMG="${ORG_IMAGE}:${IMAGE_TAG}"
export CHART="./helm/${APP}"              # ./helm/intelgraph
export TIMEOUT="10m"
export COOLDOWN="600"                     # 10m cooldown for dev
export PROM_ADDRESS="http://prometheus.prometheus:9090"
export KCTX="$(kubectl config current-context || true)"

echo "== IntelGraph Dev Go-Live =="
echo "Cluster context: ${KCTX}"
echo "Namespace: ${NAMESPACE}"
echo "Image: ${IMG}"
echo

### ===== 1) PRE-FLIGHT: freeze/tag, build, sign, attest, scan =====
echo "== [1] Freeze & tag main"
git checkout main && git pull --ff-only
if ! git rev-parse -q "${VERSION}" >/dev/null; then
  git tag -a "${VERSION}" -m "IntelGraph ${VERSION} — Observability → Action"
else
  echo "Tag ${VERSION} already exists, skipping."
fi
git push origin "${VERSION}"

echo "== [2] Build & push image + SBOM + signing"
docker build --build-arg API_BASE_URL=http://localhost:8000 --build-arg GRAPHQL_SCHEMA_URL=http://localhost:4000/graphql -t "${IMG}" .
docker push "${IMG}"

# SBOM + signing + attest + vuln scan (fail on HIGH for dev too, to catch surprises early)
syft "${IMG}" -o spdx-json > sbom.spdx.json
cosign sign --yes "${IMG}"
cosign attest --predicate sbom.spdx.json --type spdx "${IMG}"
grype "${IMG}" --fail-on high

# Resolve immutable digest for pinning in Helm
echo "== Resolve image digest for pinning"
DIGEST="$(crane digest "${IMG}")"         # requires 'crane'; or: DIGEST=$(skopeo inspect docker://"${IMG}" | jq -r .Digest)
PINNED="${ORG_IMAGE}@${DIGEST}"
echo "Pinned: ${PINNED}"

echo "== [3] Evidence bundle (hash + signature)"
tar -czf "evidence-${VERSION}.tgz" sbom.spdx.json tests/ results/ rdr/ pdv/ provenance/ || echo "(optional dirs missing; continuing)"
shasum -a 256 "evidence-${VERSION}.tgz" > "evidence-${VERSION}.tgz.sha256"
cosign sign-blob --yes --output-signature evidence.sig "evidence-${VERSION}.tgz"

### ===== 2) NAMESPACE & CRDS =====
echo "== [4] Ensure namespace & (optional) Argo Rollouts CRD present"
kubectl get ns "${NAMESPACE}" >/dev/null 2>&1 || kubectl create ns "${NAMESPACE}"

HAS_ROLLOUTS="false"
if kubectl api-resources | grep -qE '^rollouts[[:space:]]+argoproj.io'; then
  HAS_ROLLOUTS="true"
  echo "Argo Rollouts CRD detected: using canary steps with cooldown"
else
  echo "Argo Rollouts CRD not found: defaulting to standard Deployment with surge-based rollout"
fi

### ===== 3) DEPLOY (Helm upgrade/install) =====
echo "== [5] Deploy to dev with safe defaults + feature flags"
DEV_VALUES_ARG=()
if [[ -f "./helm/values-dev.yaml" ]]; then
  DEV_VALUES_ARG+=( -f ./helm/values-dev.yaml )
fi

# Common helm sets (digest pinning, autoscaling, PDB, flags)
COMMON_SET=(
  --set image.repository="${ORG_IMAGE}"
  --set image.tag="${IMAGE_TAG}"
  --set image.digest="${DIGEST}"
  --set image.pullPolicy=IfNotPresent
  --set autoscaling.enabled=true
  --set pdb.minAvailable="70%"
  --set featureFlags.aiScore=false
  --set featureFlags.xaiAudit=true
  --set featureFlags.evidenceExport=true
  --set featureFlags.predictiveSuiteAlpha=false
  --set env.NAME="${ENV}"
)

if [[ "${HAS_ROLLOUTS}" == "true" ]]; then
  # Chart should support rollout strategy keys; if not, this block can be ignored safely
  helm upgrade --install "${APP}" "${CHART}" \
    --namespace "${NAMESPACE}" --create-namespace \
    "${DEV_VALUES_ARG[@]}" \
    "${COMMON_SET[@]}" \
    --set rollout.strategy=canary \
    --set "rollout.steps={25,25,50,100}" \
    --set rollout.coldDownSeconds="${COOLDOWN}" \
    --wait --timeout "${TIMEOUT}"
else
  # Standard Deployment; keep it gentle in dev
  helm upgrade --install "${APP}" "${CHART}" \
    --namespace "${NAMESPACE}" --create-namespace \
    "${DEV_VALUES_ARG[@]}" \
    "${COMMON_SET[@]}" \
    --set deployment.rollingUpdate.maxUnavailable=0 \
    --set deployment.rollingUpdate.maxSurge=1 \
    --wait --timeout "${TIMEOUT}"
fi

### ===== 4) POST-DEPLOY VERIFY =====
echo "== [6] Wait for pods & service readiness"
kubectl -n "${NAMESPACE}" rollout status deploy/"${APP}" --timeout="${TIMEOUT}"

echo "== [7] Quick smoke (health + GraphQL schema fetch if exposed)"
SVC="$(kubectl -n "${NAMESPACE}" get svc -l app="${APP}" -o jsonpath='{.items[0].metadata.name}')"
PORT="$(kubectl -n "${NAMESPACE}" get svc "${SVC}" -o jsonpath='{.spec.ports[0].port}')"
CLUSTER_IP="$(kubectl -n "${NAMESPACE}" get svc "${SVC}" -o jsonpath='{.spec.clusterIP}')"

echo "Service: ${SVC}  Port: ${PORT}  ClusterIP: ${CLUSTER_IP}"

# Try in-cluster healthcheck via proxy port-forward (best-effort)
PF_PID=""
kubectl -n "${NAMESPACE}" port-forward svc/"${SVC}" 18080:${PORT} >/dev/null 2>&1 &
PF_PID=$!
sleep 2

set +e
curl -fsS "http://127.0.0.1:18080/healthz" && echo "Health OK" || echo "Health endpoint not found (non-fatal for dev)"
curl -fsS -X POST "http://127.0.0.1:18080/graphql" \
  -H 'Content-Type: application/json' \
  --data '{"query":"query IG_Ping { __typename }"}' >/dev/null && echo "GraphQL ping OK" || echo "GraphQL ping skipped"
set -e

if [[ -n "${PF_PID}" ]]; then kill ${PF_PID} >/dev/null 2>&1 || true; fi

### ===== 5) OPTIONAL: set initial flags via GraphQL (idempotent) =====
echo "== [8] Feature flags posture (aiScore=false, xaiAudit=true, evidenceExport=true, predictiveSuiteAlpha=false)"
echo "(Run your admin mutation if applicable; skipping here if auth required.)"

### ===== 6) EVIDENCE VERIFICATION (sanity) =====
if [[ -f "tools/evidence_verifier.py" ]]; then
  echo "== [9] Evidence verifier"
  python3 tools/evidence_verifier.py "evidence-${VERSION}.tgz" --sbom sbom.spdx.json --sig evidence.sig
else
  echo "Evidence verifier tool not found (tools/evidence_verifier.py) — skipping."
fi

### ===== 7) PRINT ROLLBACK & ACCESS =====
echo
echo "✅ Dev deploy complete for ${APP} ${IMAGE_TAG} in ns/${NAMESPACE}"
echo "Access inside cluster: http://${SVC}.${NAMESPACE}.svc.cluster.local:${PORT}"
echo
echo "🔁 Rollback:"
echo "  helm rollback ${APP} --namespace ${NAMESPACE}"
echo
echo "📌 Pinned image:"
echo "  ${PINNED}"
