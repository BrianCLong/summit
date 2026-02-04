#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <env_dir_a> <env_dir_b>" >&2
  exit 2
fi

env_a="$1"
env_b="$2"

if [[ ! -d "$env_a" ]]; then
  echo "ERROR: env directory not found: $env_a" >&2
  exit 1
fi
if [[ ! -d "$env_b" ]]; then
  echo "ERROR: env directory not found: $env_b" >&2
  exit 1
fi

exclude_opts=(
  "--exclude=.terraform"
  "--exclude=.terragrunt-cache"
  "--exclude=charts/.helm"
  "--exclude=values.generated.yaml"
)

printf "Intentionally constrained parity diff for %s vs %s\n" "$env_a" "$env_b" >&2

diff -ruN "${exclude_opts[@]}" "$env_a" "$env_b" || true
