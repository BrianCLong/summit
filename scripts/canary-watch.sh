#!/usr/bin/env bash
# Minimal SLO guard for canary. Exits non-zero on breach so the deploy workflow can rollback.

set -euo pipefail

PROM_URL="${PROM_URL:-""}"
WINDOW="${WINDOW:-10m}"          # Prometheus range window
SVC="${SVC:-summit}"             # service label selector
SLO_P95_MS="${SLO_P95_MS:-1500}" # latency threshold
ERR_RATE="${ERR_RATE:-0.01}"     # 1% error rate
SAT_MAX="${SAT_MAX:-0.80}"       # 80% saturation (CPU/mem)

if [[ -z "$PROM_URL" ]]; then
  echo "WARN: PROM_URL not set; soft-passing canary check (no metrics endpoint)."
  # Allow explicit failure for drills
  if [[ -n "${FORCE_BREACH:-}" ]]; then
    echo "FORCE_BREACH requested without PROM_URL; failing for drill."
    exit 1
  fi
  exit 0
fi

q() { curl -sS --fail --get "$PROM_URL/api/v1/query" --data-urlencode "query=$1"; }

# PromQL (adjust label keys to your metrics)
LAT_P95="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service=\"$SVC\",track=\"canary\"}[$WINDOW])) by (le)) * 1000"
ERR="sum(rate(http_requests_total{service=\"$SVC\",track=\"canary\",code=~\"5..\"}[$WINDOW])) / sum(rate(http_requests_total{service=\"$SVC\",track=\"canary\"}[$WINDOW]))"
CPU="avg(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_rate{namespace=~\"$SVC|$SVC-canary\"} )"
MEM="avg(container_memory_working_set_bytes{namespace=~\"$SVC|$SVC-canary\"}) / avg(kube_pod_container_resource_limits{resource=\"memory\",namespace=~\"$SVC|$SVC-canary\"})"

# helpers
val() { jq -r '.data.result[0].value[1]' 2>/dev/null || echo "NaN"; }

lat=$(q "$LAT_P95" | val)
err=$(q "$ERR"     | val)
cpu=$(q "$CPU"     | val)
mem=$(q "$MEM"     | val)

echo "canary metrics: p95_ms=$lat err_rate=$err cpu=$cpu mem_sat=$mem"

fail=0
# Force failure for chaos drill. Comma-separated reasons: latency,error,cpu,mem,all
if [[ -n "${FORCE_BREACH:-}" ]]; then
  echo "FORCE_BREACH=$FORCE_BREACH — simulating canary SLO breach."
  exit 1
fi
python3 - <<PY || fail=1
import math, sys
lat=${lat or 'float("nan")'}
err=${err or 'float("nan")'}
cpu=${cpu or 'float("nan")'}
mem=${mem or 'float("nan")'}
SLO_P95_MS=${SLO_P95_MS}
ERR_RATE=${ERR_RATE}
SAT_MAX=${SAT_MAX}
def breach(v, thr, kind):
    if math.isnan(v): return False
    return v > thr
bad=[]
if breach(lat, SLO_P95_MS, "latency"): bad.append("latency_p95")
if breach(err, ERR_RATE, "error"):     bad.append("error_rate")
if breach(cpu, SAT_MAX, "cpu"):        bad.append("cpu_saturation")
if breach(mem, SAT_MAX, "mem"):        bad.append("mem_saturation")
if bad:
    print("BREACH:", ",".join(bad))
    sys.exit(1)
print("OK: within SLOs")
PY

if [[ $fail -eq 1 ]]; then
  echo "Canary SLO breach detected."
  exit 1
fi

exit 0
