#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: simulate_canary_rollout.sh --phase <canary|promote|rollback> [--version vX.Y.Z] [--simulate <true|false>]

Simulates the deploy pipeline lifecycle:
  --phase canary   : executes smoke checks and returns non-zero if simulated failure requested
  --phase promote  : promotes the canary to full production after success
  --phase rollback : rolls back to the previous stable release
  --simulate       : when 'true', forces the canary phase to fail to exercise rollback logic
USAGE
}

phase=""
version="v0.0.0"
simulate="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase)
      phase="${2:-}"
      shift 2
      ;;
    --version)
      version="${2:-}"
      shift 2
      ;;
    --simulate)
      simulate="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$phase" ]]; then
  echo "--phase is required" >&2
  usage
  exit 1
fi

log() {
  local level="$1"
  shift
  printf '[%(%Y-%m-%dT%H:%M:%S%z)T] [%s] %s\n' -1 "$level" "$*"
}

render_table() {
  printf '\n%-25s %-12s %-12s %-12s\n' "Metric" "Canary" "Baseline" "Guardrail"
  printf '%-25s %-12s %-12s %-12s\n' "-------------------------" "------------" "------------" "------------"
  printf '%-25s %-12s %-12s %-12s\n' "API error rate" "0.08%%" "0.05%%" "0.10%%"
  printf '%-25s %-12s %-12s %-12s\n' "Ingest error rate" "0.40%%" "0.30%%" "0.50%%"
  printf '%-25s %-12s %-12s %-12s\n' "P95 latency" "280ms" "250ms" "350ms"
  printf '%-25s %-12s %-12s %-12s\n' "Cost burn" "78%%" "65%%" "80%%"
  printf '\n'
}

case "$phase" in
  canary)
    log INFO "Starting canary analysis for $version"
    render_table
    if [[ "$simulate" == "true" ]]; then
      log ERROR "Simulated canary failure triggered (error budget projection breached)."
      log WARN "Initiating rollback to last stable release."
      exit 1
    fi
    log INFO "Canary metrics within guardrails; ready for promotion."
    ;;
  promote)
    log INFO "Promoting $version canary to 100% traffic."
    log INFO "Updating service mesh weights and finalizing deployment."
    ;;
  rollback)
    log WARN "Rolling back from $version to previous stable tag."
    log INFO "Traffic shifted back to stable release; feature flags reverted."
    ;;
  *)
    echo "Unsupported phase: $phase" >&2
    usage
    exit 1
    ;;
esac

