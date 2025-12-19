#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${GOLDEN_CONFIG:-.ci/config/golden_paths.yml}"
SLO_FILE="${SLO_CONFIG:-.ci/config/slo.yml}"
PROMETHEUS_BASE_URL="${PROMETHEUS_BASE_URL:-http://localhost:9090}"
LOOKBACK_WINDOW="${PROM_LOOKBACK:-10m}"
CURL_BIN=$(command -v curl)
JQ_BIN=$(command -v jq)

if [[ -z "${CURL_BIN}" ]]; then
  echo "curl is required" >&2
  exit 1
fi

if [[ -z "${JQ_BIN}" ]]; then
  echo "jq is required" >&2
  exit 1
fi

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "Golden path config ${CONFIG_FILE} not found" >&2
  exit 1
fi

if [[ ! -f "${SLO_FILE}" ]]; then
  echo "SLO config ${SLO_FILE} not found" >&2
  exit 1
fi

SERVICES_JSON=$(python - <<'PY'
import json
import os
import pathlib
import sys
import yaml

config_path = pathlib.Path(os.environ.get("CONFIG_FILE", ".ci/config/golden_paths.yml"))
with config_path.open() as handle:
    data = yaml.safe_load(handle) or {}
services = data.get("services", {})
print(json.dumps(services))
PY
)

failures=0
probe_count=0

while IFS= read -r entry; do
  service=$(echo "${entry}" | ${JQ_BIN} -r '.key')
  base_url_template=$(echo "${entry}" | ${JQ_BIN} -r '.value.base_url')
  base_url=$(echo "${base_url_template}" | envsubst)

  echo "\n🔍 Probing ${service} (${base_url})"
  probes=$(echo "${entry}" | ${JQ_BIN} -c '.value.probes[]')
  while IFS= read -r probe; do
    name=$(echo "${probe}" | ${JQ_BIN} -r '.name')
    method=$(echo "${probe}" | ${JQ_BIN} -r '.method // "GET"')
    path=$(echo "${probe}" | ${JQ_BIN} -r '.path')
    expected=$(echo "${probe}" | ${JQ_BIN} -r '.expected_status')
    latency_budget=$(echo "${probe}" | ${JQ_BIN} -r '.latency_p95_ms')
    err_budget=$(echo "${probe}" | ${JQ_BIN} -r '.error_budget_percent')
    attempts=$(echo "${probe}" | ${JQ_BIN} -r '.attempts // 5')
    body=$(echo "${probe}" | ${JQ_BIN} -r '.body // empty')
    headers=$(echo "${probe}" | ${JQ_BIN} -r '.headers // {}')

    url="${base_url}${path}"
    echo "  - ${name} (${method} ${url})"

    tmpfile=$(mktemp)
    errors=0
    latencies=()

    for i in $(seq 1 "${attempts}"); do
      header_args=()
      if [[ "${headers}" != "{}" ]]; then
        while IFS= read -r hdr; do
          key=$(echo "${hdr}" | ${JQ_BIN} -r 'keys[0]')
          val=$(echo "${hdr}" | ${JQ_BIN} -r '.[]')
          header_args+=("-H" "${key}: ${val}")
        done < <(echo "${headers}" | ${JQ_BIN} -c 'to_entries[]')
      fi

      if [[ -n "${body}" && "${body}" != "null" ]]; then
        response=$(${CURL_BIN} -s -o /dev/null -w "%{http_code} %{time_total}" -X "${method}" "${header_args[@]}" -d "${body}" --max-time 30 "${url}")
      else
        response=$(${CURL_BIN} -s -o /dev/null -w "%{http_code} %{time_total}" -X "${method}" "${header_args[@]}" --max-time 30 "${url}")
      fi

      status=$(echo "${response}" | awk '{print $1}')
      latency=$(echo "${response}" | awk '{print $2}')
      probe_count=$((probe_count + 1))
      latencies+=("${latency}")
      if [[ "${status}" != "${expected}" ]]; then
        errors=$((errors + 1))
        echo "    attempt ${i}/${attempts} FAILED (status ${status}, expected ${expected})"
      else
        echo "    attempt ${i}/${attempts} ok (status ${status}, ${latency}s)"
      fi
    done

    error_pct=$(python - <<'PY'
import json
import sys
payload = json.loads(sys.stdin.read())
errors = payload["errors"]
attempts = payload["attempts"]
print((errors / attempts) * 100 if attempts else 0)
PY
<<< "$(jq -n --argjson errors "${errors}" --argjson attempts "${attempts}" '{errors:$errors,attempts:$attempts}')")

    p95=$(python - <<'PY'
import json
import sys
import statistics
payload = json.loads(sys.stdin.read())
values = payload["latencies"]
if not values:
    print(0)
    sys.exit(0)
values = [float(v) * 1000 for v in values]
values.sort()
index = int(0.95 * (len(values) - 1))
print(values[index])
PY
<<< "$(jq -n --argjson latencies "$(printf '%s\n' "${latencies[@]}" | ${JQ_BIN} -Rsc 'split("\n")[:-1]' )" '{latencies:$latencies}')")

    if (( $(echo "${error_pct} > ${err_budget}" | bc -l) )); then
      echo "    ❌ error budget exceeded (${error_pct}% > ${err_budget}%)"
      failures=$((failures + 1))
    fi

    if (( $(echo "${p95} > ${latency_budget}" | bc -l) )); then
      echo "    ❌ latency budget exceeded (${p95}ms > ${latency_budget}ms)"
      failures=$((failures + 1))
    else
      echo "    ✅ latency within budget (${p95}ms <= ${latency_budget}ms)"
    fi
  done < <(echo "${probes}")
done < <(echo "${SERVICES_JSON}" | ${JQ_BIN} -c 'to_entries[]')

if [[ ${failures} -gt 0 ]]; then
  echo "Golden path verification failed with ${failures} budget breaches after ${probe_count} probes."
  exit 1
fi

echo "\n✅ HTTP golden path probes passed. Running Prometheus SLO checks..."

python - <<'PY'
import json
import os
import pathlib
import subprocess
import sys
import yaml

slo_path = pathlib.Path(os.environ.get("SLO_FILE", ".ci/config/slo.yml"))
window = os.environ.get("LOOKBACK_WINDOW", "10m")
namespace = os.environ.get("PROM_NAMESPACE")
prom_base_url = os.environ.get("PROMETHEUS_BASE_URL", "http://localhost:9090")

with slo_path.open() as handle:
    slo = yaml.safe_load(handle) or {}

def render(template: str) -> str:
    rendered = template.replace("{{window}}", window)
    ns_value = namespace or str(slo.get("namespace", "preview"))
    return rendered.replace("{{namespace}}", ns_value)

services = slo.get("services", {})
failures = []

for name, cfg in services.items():
    prom = cfg.get("prometheus", {})
    base_url = os.environ.get(f"PROM_BASE_{name.upper()}", prom.get("base_url", prom_base_url))
    for query in prom.get("queries", []):
        rendered_query = render(query["query"])
        threshold = float(query.get("threshold", 0))
        comparison = query.get("comparison", "lte")
        result = subprocess.run(
            ["python", ".ci/scripts/prom_query.py", rendered_query, "--base-url", base_url, "--window", window],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            failures.append(f"{name}:{query['name']} prom query failed: {result.stderr or result.stdout}")
            continue
        try:
            value = float(json.loads(result.stdout)["value"])
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{name}:{query['name']} parse failure: {exc}; output={result.stdout}")
            continue

        if comparison == "lte" and not value <= threshold:
            failures.append(f"{name}:{query['name']} value {value} exceeds {threshold}")
        elif comparison == "gte" and not value >= threshold:
            failures.append(f"{name}:{query['name']} value {value} is below {threshold}")
        else:
            print(f"✅ {name}:{query['name']} => {value} (threshold {threshold}, cmp {comparison})")

if failures:
    for failure in failures:
        print(f"❌ {failure}")
    sys.exit(1)
PY
