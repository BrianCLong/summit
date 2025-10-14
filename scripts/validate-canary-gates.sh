#!/usr/bin/env bash
# MC Platform v0.3.4 - Canary Gates Validator
# Ensures gate consistency and prevents configuration drift

set -euo pipefail

CANARY_CONFIG="config/canary-params-v0.3.4.json"

echo "🔒 Validating canary gates consistency..."
echo "Config file: $CANARY_CONFIG"

# Validate core gate structure and values
jq -e '
  .slo_gates.p95_latency_regression_pct == 5 and
  .slo_gates.error_rate_non_worse == true and
  .rollback_triggers.graphql_p95_ms_30m == 350 and
  .rollback_triggers.aa_replication_lag_s_10m == 120 and
  .rollback_triggers.autonomy_comp_pct_24h == 0.5 and
  .rollback_triggers.siem_delivery_pct_15m == 95 and
  (.waves | length == 3) and
  (.waves[0].name == "canary_20" and .waves[0].traffic_pct == 20 and .waves[0].bake_minutes == 60) and
  (.waves[1].name == "canary_50" and .waves[1].traffic_pct == 50 and .waves[1].bake_minutes == 60) and
  (.waves[2].name == "production" and .waves[2].traffic_pct == 100 and .waves[2].bake_minutes == 0)
' "$CANARY_CONFIG" >/dev/null

# Validate feature flags
jq -e '
  .feature_flags.differential_privacy_enabled == true and
  .feature_flags.config_auto_remediation_enabled == true and
  .feature_flags.budget_guard_enforcement == true and
  .feature_flags.provenance_query_api_enabled == true and
  .feature_flags.autonomy_tier3_tenant_004 == true and
  .feature_flags.autonomy_tier3_tenant_005 == true
' "$CANARY_CONFIG" >/dev/null

# Extract and validate key thresholds
P95_THRESHOLD=$(jq -r '.rollback_triggers.graphql_p95_ms_30m' "$CANARY_CONFIG")
REGRESSION_PCT=$(jq -r '.slo_gates.p95_latency_regression_pct' "$CANARY_CONFIG")
AUTONOMY_COMP=$(jq -r '.rollback_triggers.autonomy_comp_pct_24h' "$CANARY_CONFIG")

echo "✅ Gate validation passed:"
echo "   • p95 latency regression: ${REGRESSION_PCT}%"
echo "   • GraphQL p95 rollback: ${P95_THRESHOLD}ms"
echo "   • Autonomy compensation: ${AUTONOMY_COMP}%"
echo "   • Wave configuration: 20% → 50% → 100%"
echo "   • All 5 epic features enabled"

echo "🔒 Canary gate consistency LOCKED ✅"