#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '\n[pr-gate] %s\n' "$*"
}

select_runner() {
  if [[ -x "$ROOT_DIR/dev" ]]; then
    printf '%s' "$ROOT_DIR/dev"
    return 0
  fi

  if command -v pnpm >/dev/null 2>&1; then
    printf '%s' "pnpm"
    return 0
  fi

  log "pnpm is required for CI runs."
  exit 1
}

RUNNER=$(select_runner)

run_cmd() {
  log "$*"
  $RUNNER "$@"
}

BASE_REF=${GITHUB_BASE_REF:-main}
TARGET_REF="origin/${BASE_REF}"
if ! git show-ref --verify --quiet "refs/remotes/${TARGET_REF}" && ! git show-ref --verify --quiet "refs/heads/${BASE_REF}"; then
  TARGET_REF="${BASE_REF}"
fi

log "Using runner: ${RUNNER}"
log "Comparing changes against: ${TARGET_REF}"

run_cmd install --frozen-lockfile

log "Validating severity ledger zero-tolerance gate"
run_cmd exec tsx scripts/ci/validate-severity-ledger.ts --ledger governance/severity-ledger.yaml --base "${TARGET_REF}" --report artifacts/severity-ledger-report.json

if ! run_cmd run lint; then
  log "lint script unavailable; falling back to eslint ."
  run_cmd exec eslint .
fi

if ! run_cmd run typecheck; then
  log "typecheck script unavailable; running tsc -b tsconfig.build.json"
  run_cmd exec tsc -b tsconfig.build.json
fi

# Run marketplace sandbox tests
log "Running marketplace sandbox tests"
run_cmd --filter intelgraph-server run test:marketplace

run_targeted_tests() {
  if command -v pnpm >/dev/null 2>&1 && pnpm dlx turbo --version >/dev/null 2>&1; then
    log "Running targeted tests for changes since ${TARGET_REF}"
    pnpm dlx turbo run test --filter="...[${TARGET_REF}]" --cache-dir=.turbo --continue
    return 0
  fi

  return 1
}

if ! run_targeted_tests; then
  log "Running minimal core test suite"
  if ! run_cmd run test:quick; then
    log "Fallback minimal tests failed or unavailable; running full test script"
    run_cmd run test
  fi
fi
