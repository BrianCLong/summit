#!/usr/bin/env bash
set -euo pipefail

EPIC="global"
SUMMARY_ROOT="artifacts/quality-gates"
mkdir -p "$SUMMARY_ROOT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --epic)
      EPIC="$2"
      shift 2
      ;;
    --help|-h)
      cat <<USAGE
Usage: $0 [--epic <name>]
Runs lint, typecheck, unit, e2e, load, SBOM, and policy simulation gates.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SUMMARY_DIR="$SUMMARY_ROOT/$EPIC"
mkdir -p "$SUMMARY_DIR"
SUMMARY_FILE="$SUMMARY_DIR/summary.json"

declare -a COMMANDS=(
  "pnpm lint"
  "pnpm typecheck"
  "pnpm run -r test -- --coverage"
  "pnpm --filter server playwright test --grep @slo"
  "k6 run tests/load/health-p95.k6.js"
  "npm run sbom"
  "npm run policy:test"
  "node scripts/policy/run-quality-gates-eval.mjs"
)

results=()

run_command() {
  local cmd="$1"
  local start end status
  start=$(date +%s)
  echo "➡️  Running $cmd"
  if eval "$cmd"; then
    status="pass"
  else
    status="fail"
  fi
  end=$(date +%s)
  local duration=$((end - start))
  results+=("{\"command\":\"$cmd\",\"status\":\"$status\",\"durationSeconds\":$duration}")
  if [[ "$status" == "fail" ]]; then
    echo "❌ Quality gate failed: $cmd" >&2
    write_summary "fail"
    exit 1
  fi
}

write_summary() {
  local overall="$1"
  local joined
  local IFS=","; joined="${results[*]}"
  cat > "$SUMMARY_FILE" <<JSON
{
  "epic": "$EPIC",
  "timestamp": "$(date --iso-8601=seconds)",
  "overall": "$overall",
  "steps": [${joined}]
}
JSON
}

for cmd in "${COMMANDS[@]}"; do
  run_command "$cmd"
done

write_summary "pass"
echo "✅ Quality gates completed for epic '$EPIC'"
