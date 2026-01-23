set -euo pipefail

SUMMARY_JSON="$1"

# Required fields only (no wall-clock output)
verified="$(jq -r '.evidence.verified' "$SUMMARY_JSON")"
build_time="$(jq -r '.evidence.buildTime' "$SUMMARY_JSON")"
run_end="$(jq -r '.run.endTime' "$SUMMARY_JSON")"

test "$verified" = "true"

build_ts="$(date -u -d "$build_time" +%s)"
run_ts="$(date -u -d "$run_end" +%s)"

age=$(( run_ts - build_ts ))
test "$age" -ge 0
test "$age" -le 86400
