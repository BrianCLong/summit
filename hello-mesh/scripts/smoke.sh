#!/usr/bin/env bash
set -euo pipefail

SERVICES=(
  prov-ledger:8101
  lac-compiler:8102
  nlq-engine:8103
  graphrag:8104
  zk-tx:8105
  disclosure-wallets:8106
  ops-guardian:8107
)

wait_for() {
  local url=$1 name=$2; echo -n "⏳ waiting for $name";
  for i in {1..60}; do
    if curl -fsS "$url" >/dev/null; then echo " — ready"; return 0; fi
    echo -n "."; sleep 2;
  done
  echo; echo "❌ $name not ready in time"; return 1
}

# 1) Ensure core infra is up
wait_for http://localhost:9090/-/ready Prometheus
wait_for http://localhost:16686 Jaeger

# 2) Ensure each service healthz responds
for svc in "${SERVICES[@]}"; do
  name=${svc%%:*}; port=${svc##*:};
  wait_for "http://localhost:${port}/healthz" "$name"
  curl -fsS "http://localhost:${port}/metrics" >/dev/null || {
    echo "❌ metrics missing for $name"; exit 1; }
  echo "✅ $name metrics scraped endpoint present"
done

# 3) Verify Prometheus sees targets as UP
UP=$(curl -fsS 'http://localhost:9090/api/v1/targets' | jq -r '.data.activeTargets[] | select(.health=="up") | .labels.instance' | wc -l)
if [[ "$UP" -lt 7 ]]; then
  echo "❌ Prometheus shows fewer than 7 UP service targets ($UP)"; exit 1;
fi
echo "✅ Prometheus shows all service targets UP"

# 4) Spot-check inter-service dependency wiring
curl -fsS http://localhost:8104/readyz >/dev/null && echo "✅ graphrag reachable"
# (When real code is in place) add: POST to lac-compiler, then answer through graphrag that calls LAC.

echo "🎉 Smoke test passed"
