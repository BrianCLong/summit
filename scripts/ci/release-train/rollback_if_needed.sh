#!/usr/bin/env bash
set -euo pipefail

env=""

for arg in "$@"; do
  case "$arg" in
    --env=*) env="${arg#*=}" ;;
  esac
 done

if [[ -z "$env" ]]; then
  echo "Usage: $0 --env=<env>" >&2
  exit 2
fi

root_dir="$(git rev-parse --show-toplevel)"
records_file="${root_dir}/scripts/ci/records/artifacts.json"
if [[ ! -f "$records_file" ]]; then
  echo "ERROR: records/artifacts.json not found" >&2
  exit 1
fi

previous_digest=$(jq -r '.previous.digest // empty' "$records_file")
if [[ -z "$previous_digest" || "$previous_digest" == "null" ]]; then
  echo "ERROR: previous digest missing in records/artifacts.json" >&2
  exit 1
fi

if [[ "${ROLLBACK_REQUIRED:-false}" != "true" ]]; then
  echo "OK: rollback not required"
  exit 0
fi

scripts/ci/release-train/deploy.sh --env="$env" --strategy=rollback --digest="$previous_digest"

echo "OK: rollback executed to $previous_digest"
