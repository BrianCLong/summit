#!/usr/bin/env bash
set -euo pipefail

env=""
digest=""

for arg in "$@"; do
  case "$arg" in
    --env=*) env="${arg#*=}" ;;
    --digest=*) digest="${arg#*=}" ;;
  esac
 done

if [[ -z "$env" || -z "$digest" ]]; then
  echo "Usage: $0 --env=<env> --digest=<digest>" >&2
  exit 2
fi

for percent in 25 50 100; do
  scripts/ci/release-train/deploy.sh --env="$env" --strategy=progressive --percent="$percent" --digest="$digest"
  scripts/ci/release-train/probes.sh --env="$env" --mode=post --timeout=10m
  scripts/ci/release-train/error_budget_gate.sh --env="$env" --window=10m
  echo "OK: rollout advanced to ${percent}%"
 done
