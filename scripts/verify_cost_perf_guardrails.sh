#!/usr/bin/env bash
set -euo pipefail

METRICS_FILE=${1:-artifacts/cost_perf/latest.json}
BUDGET_FILE=docs/optimization/guardrail-budgets.json
ALLOW_DISABLE=${GUARDRAILS_DISABLED:-false}
RECORD=false

if [[ "${1:-}" == "--record" ]]; then
  RECORD=true
  METRICS_FILE=artifacts/cost_perf/latest.json
fi

if [[ "$ALLOW_DISABLE" == "true" ]]; then
  echo "Guardrails disabled via GUARDRAILS_DISABLED=true; skipping checks." >&2
  exit 0
fi

if [[ ! -f "$METRICS_FILE" ]]; then
  echo "Metrics file not found: $METRICS_FILE" >&2
  exit 1
fi

if [[ ! -f "$BUDGET_FILE" ]]; then
  echo "Budget file not found: $BUDGET_FILE" >&2
  exit 1
fi

# Validate required fields in metrics payload
required_fields=(timestamp environment workload sample_size collection_window collector metrics)
for field in "${required_fields[@]}"; do
  if ! jq -e --arg field "$field" 'has($field)' "$METRICS_FILE" >/dev/null; then
    echo "Metrics file missing required field: $field" >&2
    exit 1
  fi
done

if ! jq -e '.sample_size | type == "number" and . > 0' "$METRICS_FILE" >/dev/null; then
  echo "Metrics file has invalid sample_size (must be positive number)" >&2
  exit 1
fi

if ! jq -e '.metrics | type == "object"' "$METRICS_FILE" >/dev/null; then
  echo "Metrics file metrics field must be an object" >&2
  exit 1
fi

# Refresh timestamp when recording
if [[ "$RECORD" == "true" ]]; then
  NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  TMP=$(mktemp)
  jq --arg ts "$NOW" '.timestamp = $ts' "$METRICS_FILE" > "$TMP" && mv "$TMP" "$METRICS_FILE"
  echo "Recorded new timestamp: $NOW in $METRICS_FILE"
fi

METRIC_TS=$(jq -r '.timestamp' "$METRICS_FILE")
if [[ "$METRIC_TS" == "null" ]]; then
  echo "Metrics file missing timestamp" >&2
  exit 1
fi

# Check staleness (14 days)
NOW_SECS=$(date -u +%s)
TS_SECS=$(date -u -d "$METRIC_TS" +%s || true)
STALE_THRESHOLD=$((14*24*3600))
STALE=false
if [[ -n "$TS_SECS" ]]; then
  AGE=$((NOW_SECS - TS_SECS))
  if [[ $AGE -gt $STALE_THRESHOLD ]]; then
    STALE=true
    echo "WARNING: Metrics are stale by $AGE seconds (>14 days). Refresh recommended." >&2
  fi
fi

calc_limit_ratio() {
  python - "$@" <<'PY'
import sys
budget=float(sys.argv[1])
ratio=float(sys.argv[2])
print(budget * (1 + ratio))
PY
}

calc_limit_abs() {
  python - "$@" <<'PY'
import sys
budget=float(sys.argv[1])
abs_tol=float(sys.argv[2])
print(budget + abs_tol)
PY
}

check_metric() {
  local name=$1
  local budget=$2
  local tolerance_ratio=$3
  local tolerance_abs=$4
  local direction=${5:-max}
  local value
  value=$(jq -r --arg name "$name" '.metrics[$name]' "$METRICS_FILE")
  if [[ "$value" == "null" ]]; then
    echo "Metric $name missing from $METRICS_FILE" >&2
    return 1
  fi
  if ! jq -e --arg name "$name" '.metrics[$name] | type == "number"' "$METRICS_FILE" >/dev/null; then
    echo "Metric $name must be numeric" >&2
    return 1
  fi
  if [[ -z "$budget" || "$budget" == "null" ]]; then
    echo "Budget missing for metric $name" >&2
    return 1
  fi

  if [[ "$direction" == "min" ]]; then
    if awk -v v="$value" -v b="$budget" 'BEGIN {exit !(v < b)}'; then
      echo "FAIL: $name=$value below budget $budget" >&2
      return 1
    fi
    return 0
  fi

  local limit=$budget
  if [[ -n "$tolerance_ratio" && "$tolerance_ratio" != "null" ]]; then
    limit=$(calc_limit_ratio "$budget" "$tolerance_ratio")
  fi

  if [[ -n "$tolerance_abs" && "$tolerance_abs" != "null" ]]; then
    limit=$(calc_limit_abs "$budget" "$tolerance_abs")
  fi

  if awk -v v="$value" -v l="$limit" 'BEGIN {exit !(v > l)}'; then
    echo "FAIL: $name=$value exceeds limit $limit (budget $budget)" >&2
    return 1
  fi
  return 0
}

STATUS=0
for key in $(jq -r 'keys[]' "$BUDGET_FILE"); do
  budget=$(jq -r --arg k "$key" '.[$k].budget' "$BUDGET_FILE")
  tol_ratio=$(jq -r --arg k "$key" '.[$k].tolerance_ratio // ""' "$BUDGET_FILE")
  tol_abs=$(jq -r --arg k "$key" '.[$k].tolerance_absolute // ""' "$BUDGET_FILE")
  direction=$(jq -r --arg k "$key" '.[$k].direction // "max"' "$BUDGET_FILE")
  if ! jq -e --arg k "$key" '.[$k].budget | type == "number"' "$BUDGET_FILE" >/dev/null; then
    echo "Budget for $key must be numeric" >&2
    STATUS=1
    continue
  fi
  if [[ -n "$tol_ratio" && "$tol_ratio" != "null" ]]; then
    if ! jq -e --arg k "$key" '.[$k].tolerance_ratio | type == "number"' "$BUDGET_FILE" >/dev/null; then
      echo "Tolerance ratio for $key must be numeric" >&2
      STATUS=1
      continue
    fi
  fi
  if [[ -n "$tol_abs" && "$tol_abs" != "null" ]]; then
    if ! jq -e --arg k "$key" '.[$k].tolerance_absolute | type == "number"' "$BUDGET_FILE" >/dev/null; then
      echo "Tolerance absolute for $key must be numeric" >&2
      STATUS=1
      continue
    fi
  fi
  check_metric "$key" "$budget" "$tol_ratio" "$tol_abs" "$direction" || STATUS=1
done

if [[ "$STALE" == "true" ]]; then
  echo "Metrics are stale; guardrail passes with warning. Refresh metrics before release." >&2
fi

if [[ $STATUS -eq 0 ]]; then
  echo "Guardrail checks passed for $METRICS_FILE"
else
  echo "Guardrail checks failed" >&2
fi

exit $STATUS
