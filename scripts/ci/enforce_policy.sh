#!/usr/bin/env bash
# CI Signal Gate - Enforce policy thresholds
# Usage: enforce_policy.sh [metrics_file] [policy_file]
set -euo pipefail

METRICS="${1:-runs_metrics.json}"
POLICY="${2:-.ci/policy.json}"

if [[ ! -f "$METRICS" ]]; then
  echo "Error: Metrics file not found: $METRICS" >&2
  exit 1
fi

if [[ ! -f "$POLICY" ]]; then
  echo "Error: Policy file not found: $POLICY" >&2
  exit 1
fi

echo "=== CI Signal Gate Enforcement ==="
echo "Metrics: $METRICS"
echo "Policy: $POLICY"
echo ""

# Display current metrics
echo "Current Metrics:"
jq -r '
  "  Sample Size: \(.sample_size)",
  "  Success Rate: \(.success_rate_pct)%",
  "  Queue P50: \(.queue_s.p50 // "N/A")s",
  "  Queue P95: \(.queue_s.p95 // "N/A")s",
  "  Run P50: \(.run_s.p50 // "N/A")s",
  "  Run P95: \(.run_s.p95 // "N/A")s"
' "$METRICS"
echo ""

echo "Policy Thresholds:"
jq -r '
  "  Max Queue P50: \(.max_queue_p50_s)s",
  "  Min Success Rate: \(.min_success_rate_pct)%",
  "  Material Drop: \(.material_drop_pct)%"
' "$POLICY"
echo ""

# Enforce policy
RESULT=$(jq -e --slurpfile p "$POLICY" '
  . as $m | $p[0] as $policy |
  {
    queue_check: (
      if ($m.queue_s.p50 != null and $m.queue_s.p50 > $policy.max_queue_p50_s) then
        { pass: false, reason: "Queue P50 (\($m.queue_s.p50)s) exceeds threshold (\($policy.max_queue_p50_s)s)" }
      else
        { pass: true, reason: "Queue P50 within threshold" }
      end
    ),
    success_check: (
      if ($m.success_rate_pct < $policy.min_success_rate_pct) then
        { pass: false, reason: "Success rate (\($m.success_rate_pct)%) below minimum (\($policy.min_success_rate_pct)%)" }
      else
        { pass: true, reason: "Success rate meets threshold" }
      end
    )
  } |
  {
    checks: .,
    overall_pass: (.queue_check.pass and .success_check.pass)
  }
' "$METRICS" 2>&1) || {
  echo "Error evaluating policy: $RESULT" >&2
  exit 1
}

echo "Enforcement Results:"
echo "$RESULT" | jq -r '
  "  Queue Check: \(if .checks.queue_check.pass then "PASS" else "FAIL" end) - \(.checks.queue_check.reason)",
  "  Success Check: \(if .checks.success_check.pass then "PASS" else "FAIL" end) - \(.checks.success_check.reason)"
'
echo ""

PASS=$(echo "$RESULT" | jq -r '.overall_pass')
if [[ "$PASS" == "true" ]]; then
  echo "=== CI Signal Gate: PASS ==="
  exit 0
else
  echo "=== CI Signal Gate: FAIL ==="
  exit 1
fi
