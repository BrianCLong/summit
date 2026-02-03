#!/bin/bash
set -e

# Usage: gate_check.sh <METRICS_FILE> <POLICY_FILE> [DIFF_FILE]
METRICS_FILE="${1:-runs_metrics.json}"
POLICY_FILE="${2:-.ci/policy.json}"
DIFF_FILE="$3"

if [ ! -f "$POLICY_FILE" ]; then
  echo "Error: Policy file $POLICY_FILE not found."
  exit 2
fi

if [ ! -f "$METRICS_FILE" ]; then
  echo "Error: Metrics file $METRICS_FILE not found."
  exit 2
fi

echo "Checking gate against policy..."

STATUS=$(jq -r --argjson policy "$(cat "$POLICY_FILE")" '
  def bad(msg): {ok:false, reason: msg};

  . as $m
  | if ($m.sample_size < 1)
      then {ok:true, reason:"insufficient data (0 runs)"}
    elif ($m.queue_s.p50 != null and $m.queue_s.p50 > $policy.max_queue_p50_s)
      then bad("Queue p50 exceeds threshold: \($m.queue_s.p50)s > \($policy.max_queue_p50_s)s")
    elif ($m.success_rate_pct < $policy.min_success_rate_pct)
      then bad("Success rate below min: \($m.success_rate_pct)% < \($policy.min_success_rate_pct)%")
    else {ok:true, reason:"within policy"}
    end
' "$METRICS_FILE")

echo "$STATUS" > gate_status.json
REASON=$(jq -r '.reason' gate_status.json)
OK=$(jq -r '.ok' gate_status.json)

echo "Gate Result: $OK ($REASON)"

if [ "$OK" != "true" ]; then
  echo "Gate failed."
  exit 1
fi

# Optional material drop check
if [ -n "$DIFF_FILE" ] && [ -f "$DIFF_FILE" ]; then
  echo "Checking for material drop..."
  DROP=$(jq -r '.deltas.success_rate_pct // 0' "$DIFF_FILE")
  THRESH=$(jq -r '.material_drop_pct' "$POLICY_FILE")

  # Bash doesn't do float math easily, using python or jq
  FAIL=$(jq -n --argjson drop "$DROP" --argjson thresh "$THRESH" '
    if $drop < 0 and ($drop * -1) >= $thresh then "yes" else "no" end
  ')

  if [ "$FAIL" == "yes" ]; then
    echo "Material success-rate drop: ${DROP}% (Threshold: -${THRESH}%)"
    exit 1
  fi
  echo "No material drop detected."
fi
