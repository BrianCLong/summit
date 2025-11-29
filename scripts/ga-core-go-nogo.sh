#!/usr/bin/env bash
set -o pipefail

# GA Core go/no-go helper orchestrating validation, load, deploy, and air-gap bundle steps.

usage() {
  cat <<'USAGE'
Usage: ga-core-go-nogo.sh [options]

Options:
  --deploy-staging      Run staging upgrade and helm tests.
  --run-validate        Run GA Core validation suite (make validate-ga-core).
  --run-load            Execute k6 load test for GA Core (load/ga-core.js).
  --build-airgap        Produce and sign air-gap bundle (docker save + cosign sign).
  --dry-run             Show steps without executing commands.
  -h, --help            Show this help text.

Examples:
  ./scripts/ga-core-go-nogo.sh --deploy-staging --run-validate
  ./scripts/ga-core-go-nogo.sh --run-load --build-airgap --dry-run
USAGE
}

DRY_RUN=false
RUN_VALIDATE=false
RUN_LOAD=false
DEPLOY_STAGING=false
BUILD_AIRGAP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy-staging)
      DEPLOY_STAGING=true
      ;;
    --run-validate)
      RUN_VALIDATE=true
      ;;
    --run-load)
      RUN_LOAD=true
      ;;
    --build-airgap)
      BUILD_AIRGAP=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

if ! $RUN_VALIDATE && ! $RUN_LOAD && ! $DEPLOY_STAGING && ! $BUILD_AIRGAP; then
  echo "No actions selected; defaulting to --run-validate and --run-load." >&2
  RUN_VALIDATE=true
  RUN_LOAD=true
fi

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

run_step() {
  local description="$1"
  local command="$2"

  echo "\n=== $description ==="
  if $DRY_RUN; then
    echo "(dry-run) $command"
    return 0
  fi

  eval "$command"
}

if $RUN_VALIDATE; then
  require_cmd make
  run_step "Running GA Core validation" "make validate-ga-core"
fi

if $RUN_LOAD; then
  require_cmd k6
  run_step "Executing GA Core load test" "k6 run load/ga-core.js"
fi

if $DEPLOY_STAGING; then
  require_cmd helm
  run_step "Upgrading staging release" "helm upgrade summit staging/values.yaml"
  run_step "Running helm tests" "helm test summit --parallel"
fi

if $BUILD_AIRGAP; then
  require_cmd docker
  require_cmd cosign
  run_step "Building air-gap bundle" "docker save summit-* | cosign sign --yes summit-airgap.tar"
fi

cat <<SUMMARY

Completed GA Core go/no-go helper run.
  validate: $RUN_VALIDATE
  load: $RUN_LOAD
  deploy_staging: $DEPLOY_STAGING
  airgap_bundle: $BUILD_AIRGAP
  dry_run: $DRY_RUN
SUMMARY
