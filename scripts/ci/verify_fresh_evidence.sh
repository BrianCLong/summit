#!/usr/bin/env bash
set -euo pipefail

SUMMARY_JSON="${1:?usage: verify_fresh_evidence.sh path/to/summary.json}"

# Required fields only (no wall-clock output)
verified="$(jq -r '.evidence.verified // empty' "$SUMMARY_JSON")"
build_time="$(jq -r '.evidence.buildTime // empty' "$SUMMARY_JSON")"
run_end="$(jq -r '.run.endTime // empty' "$SUMMARY_JSON")"

test "$verified" = "true"
test -n "$build_time"
test -n "$run_end"

build_ts="$(date -u -d "$build_time" +%s)"
run_ts="$(date -u -d "$run_end" +%s)"

# Evidence must be contemporaneous with the run (prevents stale/replay bundles)
age=$(( run_ts - build_ts ))
test "$age" -ge 0
test "$age" -le 86400
