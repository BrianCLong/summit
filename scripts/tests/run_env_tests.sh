#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <environment> <service>" >&2
  exit 1
fi

environment=$1
service=$2

case "${environment}" in
  dev|prod)
    "$(dirname "${BASH_SOURCE[0]}")/run_local_env_tests.sh" "${environment}" "${service}"
    ;;
  staging)
    "$(dirname "${BASH_SOURCE[0]}")/run_k8s_env_tests.sh" "${environment}" "${service}"
    ;;
  *)
    echo "Unsupported environment '${environment}'. Expected dev, staging, or prod." >&2
    exit 1
    ;;
esac
