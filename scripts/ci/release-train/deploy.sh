#!/usr/bin/env bash
set -euo pipefail

env=""
strategy=""
percent=""
digest=""

for arg in "$@"; do
  case "$arg" in
    --env=*) env="${arg#*=}" ;;
    --strategy=*) strategy="${arg#*=}" ;;
    --percent=*) percent="${arg#*=}" ;;
    --digest=*) digest="${arg#*=}" ;;
  esac
 done

if [[ -z "$env" || -z "$digest" ]]; then
  echo "Usage: $0 --env=<env> --digest=<digest> [--strategy=canary|progressive] [--percent=N]" >&2
  exit 2
fi

root_dir="$(git rev-parse --show-toplevel)"
records_dir="${root_dir}/scripts/ci/records"
mkdir -p "$records_dir"
log_file="${records_dir}/deployments.log"

printf "Deploying digest %s to %s with strategy=%s percent=%s\n" "$digest" "$env" "$strategy" "$percent" | tee -a "$log_file"

printf "Intentionally constrained deploy hook: integrate with Helm/Argo via release pipeline.\n" | tee -a "$log_file"
