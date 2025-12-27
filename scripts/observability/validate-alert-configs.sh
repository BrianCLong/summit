#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RULE_FILES=(
  "$ROOT_DIR/k8s/monitoring/rules/intelgraph-rules.yaml"
  "$ROOT_DIR/infra/observability/prometheus-rules.yaml"
)
ALERTMANAGER_CONFIG="$ROOT_DIR/infra/k8s/monitoring/alert-manager-config.yaml"

warn() {
  echo "⚠️  $*"
}

check_prom_rules() {
  if ! command -v promtool >/dev/null 2>&1; then
    warn "promtool not available - skipping PrometheusRule validation"
    return 0
  fi

  for rule_file in "${RULE_FILES[@]}"; do
    if [ -f "$rule_file" ]; then
      echo "🔍 promtool check rules $rule_file"
      promtool check rules "$rule_file"
    else
      warn "Missing rule file: $rule_file"
    fi
  done
}

check_alertmanager_config() {
  if ! command -v amtool >/dev/null 2>&1; then
    warn "amtool not available - skipping Alertmanager config validation"
    return 0
  fi

  if [ -f "$ALERTMANAGER_CONFIG" ]; then
    echo "🔍 amtool check-config $ALERTMANAGER_CONFIG"
    amtool check-config "$ALERTMANAGER_CONFIG"
  else
    warn "Missing Alertmanager config: $ALERTMANAGER_CONFIG"
  fi
}

main() {
  echo "✅ Validating alerting configuration"
  check_prom_rules
  check_alertmanager_config
  echo "✅ Alerting configuration checks complete"
}

main "$@"
