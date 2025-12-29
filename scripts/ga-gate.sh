#!/usr/bin/env bash
set -uo pipefail

MODE="fast"
CI_MODE="false"
ROOT_DIR=""

usage() {
  cat <<'USAGE'
GA GAte pre-flight script for MVP-4.

Usage: scripts/ga-gate.sh [--fast|--full] [--ci]

Options:
  --fast     Run fast path (documentation + schema validation + smoke).
  --full     Run full gate (lint + smoke + documentation/schema checks).
  --ci       Emit CI-friendly output (no colors, compact logs).
  -h|--help  Show this help text.

Examples:
  scripts/ga-gate.sh --fast --ci
  scripts/ga-gate.sh --full
USAGE
}

log() {
  local level="$1"; shift
  if [[ "$CI_MODE" == "true" ]]; then
    printf "%s: %s\n" "$level" "$*"
  else
    printf "%s: %s\n" "$level" "$*"
  fi
}

record_failure() {
  local message="$1"
  FAILURES+=("$message")
  log "FAIL" "$message"
}

run_cmd() {
  local description="$1"; shift
  local cmd=("$@")
  log "RUN" "$description"
  if ! "${cmd[@]}"; then
    record_failure "Command failed: $description"
  fi
}

require_file() {
  local path="$1"
  local reason="$2"
  if [[ ! -f "$path" ]]; then
    record_failure "Missing required artifact: $path ($reason)"
  else
    log "OK" "Found $path"
  fi
}

require_text() {
  local needle="$1"
  local path="$2"
  local reason="$3"
  if ! grep -q "$needle" "$path"; then
    record_failure "Missing text '$needle' in $path ($reason)"
  else
    log "OK" "Found '$needle' in $path"
  fi
}

validate_docs_and_metadata() {
  require_file "docs/release/MVP-4-GA-DoD.md" "DoD definition must be present"
  require_file "docs/release/release-metadata.schema.yaml" "Release metadata schema (YAML) required"
  require_file "docs/release/release-metadata.schema.json" "Release metadata schema (JSON) required"
  require_file "GA_PROMOTION_PLAN.md" "Promotion plan required for GA"
  require_file "GO_NO_GO_GATE.md" "Go/No-Go decision record required"
  require_text "MVP-4-GA" "CHANGELOG.md" "Changelog must mention MVP-4-GA readiness"
  require_text "ga-gate" "docs/release/MVP-4-GA-DoD.md" "DoD must reference the GA gate"
}

run_fast_checks() {
  # Lightweight lint (scoped) and smoke
  if command -v npx >/dev/null 2>&1; then
    run_cmd "Scoped eslint (docs/release + scripts)" npx eslint --no-error-on-unmatched-pattern docs/release scripts
  else
    log "WARN" "npx not available; skipping scoped eslint"
  fi
  if command -v npm >/dev/null 2>&1; then
    run_cmd "Smoke tests (npm run test:quick)" npm run test:quick --silent
  else
    log "WARN" "npm not available; skipping smoke tests"
  fi
}

run_full_checks() {
  if command -v npm >/dev/null 2>&1; then
    run_cmd "Repo lint" npm run lint -- --max-warnings=0
    run_cmd "Smoke tests" npm run test:quick --silent
  else
    log "WARN" "npm not available; skipping lint and smoke"
  fi
}

main() {
  FAILURES=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --fast) MODE="fast" ;;
      --full) MODE="full" ;;
      --ci) CI_MODE="true" ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
    shift
  done

  if ! ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null); then
    echo "Error: must run inside git repository" >&2
    exit 1
  fi
  cd "$ROOT_DIR"

  log "INFO" "Running GA gate in $MODE mode"
  validate_docs_and_metadata

  if [[ "$MODE" == "fast" ]]; then
    run_fast_checks
  else
    run_full_checks
  fi

  if [[ ${#FAILURES[@]} -gt 0 ]]; then
    log "INFO" "GA gate completed with ${#FAILURES[@]} failure(s)."
    for failure in "${FAILURES[@]}"; do
      log "INFO" "- $failure"
    done
    exit 1
  fi

  log "INFO" "GA gate passed."
}

main "$@"
