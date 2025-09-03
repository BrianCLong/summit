#!/usr/bin/env bash
set -Eeuo pipefail

: "${NAMESPACE:?Set NAMESPACE (k8s namespace)}"
: "${ROLLOUT:?Set ROLLOUT (Argo Rollouts name)}"
: "${APP_LABEL:=app=maestro}"

: "${ALERTMANAGER_URL:=}"
: "${GRAFANA_URL:=}"
: "${GRAFANA_API_TOKEN:=}"
: "${PROM_URL:=}"
: "${BURN_QUERY:=sum(rate(http_requests_total{job=\"maestro\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"maestro\"}[5m]))}"
: "${P95_QUERY:=histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job=\"maestro\"}[5m])))}"

UTC_NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP="${STAMP_OVERRIDE:-$(date -u +%Y%m%d-%H%M%SZ)}"
EVID_DIR="${EVID_DIR_OVERRIDE:-evidence-${STAMP}}"
mkdir -p "${EVID_DIR}"

env | sort > "${EVID_DIR}/env.txt"
pass_count=0; fail_count=0
mark_pass(){ echo "PASS: $1" | tee -a "${EVID_DIR}/SUMMARY.txt"; pass_count=$((pass_count+1)); }
mark_fail(){ echo "FAIL: $1" | tee -a "${EVID_DIR}/SUMMARY.txt"; fail_count=$((fail_count+1)); }

# 1) Gatekeeper deny test
GK_DIR="${EVID_DIR}/gatekeeper"; mkdir -p "$GK_DIR"
cat > "${GK_DIR}/deny-test-pod.yaml" <<'YAML'
apiVersion: v1
kind: Pod
metadata:
  name: gatekeeper-deny-test
spec:
  containers:
    - name: c
      image: nginx:latest
      command: ["sleep","3600"]
  restartPolicy: Never
YAML
set +e
GK_OUT="$(kubectl -n "${NAMESPACE}" apply -f "${GK_DIR}/deny-test-pod.yaml" 2>&1)"; GK_RC=$?
set -e
echo "$GK_OUT" > "${GK_DIR}/kubectl_output.txt"
if [[ $GK_RC -ne 0 ]] && grep -qiE 'denied|gatekeeper|required-image-digest' "${GK_DIR}/kubectl_output.txt"; then
  mark_pass "Gatekeeper denied unpinned image (as expected)"
else
  mark_fail "Gatekeeper did NOT deny unpinned image; verify constraint"
fi

# 2) Synthetic alert (optional)
if [[ -n "${ALERTMANAGER_URL}" ]]; then
  AM_DIR="${EVID_DIR}/alertmanager"; mkdir -p "$AM_DIR"
  cat > "${AM_DIR}/alert.json" <<JSON
[{
  "labels": { "alertname":"SyntheticMaestroWitness","severity":"critical","service":"maestro","witness":"true" },
  "annotations": { "summary":"Synthetic alert fired by witness script","description":"Validates PD routing." },
  "startsAt": "${UTC_NOW}"
}]
JSON
  set +e
  AM_RESP="$(curl -sS -X POST -H "Content-Type: application/json" --data @"${AM_DIR}/alert.json" "${ALERTMANAGER_URL%/}/api/v1/alerts" -w "\nHTTP_STATUS:%{http_code}\n")"; AM_RC=$?
  set -e
  echo "$AM_RESP" > "${AM_DIR}/response.txt"
  if [[ $AM_RC -eq 0 ]] && grep -q 'HTTP_STATUS:200' "${AM_DIR}/response.txt"; then
    mark_pass "Alertmanager accepted synthetic alert"
  else
    mark_fail "Alertmanager did not accept synthetic alert"
  fi
fi

# 3) Snapshots
SNAP_DIR="${EVID_DIR}/snapshots"; mkdir -p "$SNAP_DIR"
set +e
kubectl argo rollouts -n "${NAMESPACE}" get rollout "${ROLLOUT}" > "${SNAP_DIR}/rollout_get.txt" 2>&1
kubectl argo rollouts -n "${NAMESPACE}" status "${ROLLOUT}" > "${SNAP_DIR}/rollout_status.txt" 2>&1
kubectl -n "${NAMESPACE}" get rollout "${ROLLOUT}" -o yaml > "${SNAP_DIR}/rollout.yaml" 2>&1
set -e
kubectl -n "${NAMESPACE}" get pods   -l "${APP_LABEL}" -o wide > "${SNAP_DIR}/pods.txt" || true
kubectl -n "${NAMESPACE}" get svc    -l "${APP_LABEL}" -o wide > "${SNAP_DIR}/svc.txt"  || true
kubectl -n "${NAMESPACE}" get deploy -l "${APP_LABEL}" -o wide > "${SNAP_DIR}/deploy.txt" || true

if [[ -n "${PROM_URL}" ]]; then
  curl -sS --get --data-urlencode "query=${BURN_QUERY}" "${PROM_URL%/}/api/v1/query" > "${SNAP_DIR}/prom_burn_rate.json" || true
  curl -sS --get --data-urlencode "query=${P95_QUERY}"  "${PROM_URL%/}/api/v1/query" > "${SNAP_DIR}/prom_p95.json" || true
fi
if [[ -n "${GRAFANA_URL}" && -n "${GRAFANA_API_TOKEN}" ]]; then
  curl -sS -H "Authorization: Bearer ${GRAFANA_API_TOKEN}" "${GRAFANA_URL%/}/api/health" > "${SNAP_DIR}/grafana_health.json" || true
  curl -sS -H "Authorization: Bearer ${GRAFANA_API_TOKEN}" "${GRAFANA_URL%/}/api/search?query=Maestro" > "${SNAP_DIR}/grafana_search.json" || true
fi

{
  echo "Time (UTC): ${UTC_NOW}"
  echo "Namespace : ${NAMESPACE}"
  echo "Rollout   : ${ROLLOUT}"
  echo "PASS: ${pass_count}  FAIL: ${fail_count}"
} >> "${EVID_DIR}/SUMMARY.txt"

tar -czf "${EVID_DIR}.tar.gz" "${EVID_DIR}"
echo "Evidence archived: ${EVID_DIR}.tar.gz"
