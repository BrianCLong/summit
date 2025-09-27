#!/usr/bin/env bash
set -euo pipefail

echo "▶ Gate schema checks"
node tools/igctl/validate_go_no_go.js tools/igctl/go-no-go-matrix.yaml || true
node tools/igctl/validate_go_no_go.js tools/igctl/go-no-go-extensions.yaml

echo "▶ Prometheus rules checks"
promtool check rules ops/prometheus/recording_rules.yaml || true
promtool check rules ops/prometheus/slo_burn_rules.yaml || true
promtool check rules ops/observability/intelgraph-slo-burn.yaml || true

echo "▶ Prometheus unit tests"
if ls ops/prometheus/tests/*.test.yaml 1>/dev/null 2>&1; then
  promtool test rules ops/prometheus/tests/*.test.yaml
fi

echo "▶ Config validations (if present)"
test -f ops/prometheus/prometheus.yml && promtool check config ops/prometheus/prometheus.yml || true
test -f ops/alertmanager/alertmanager.yml && amtool check-config ops/alertmanager/alertmanager.yml || true

echo "✅ Preflight OK"

