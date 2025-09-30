#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <environment> <service>" >&2
  exit 1
fi

environment=$1
service=$2
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
compose_file="${repo_root}/docker-compose.env-tests.yml"
project_name="envtests"

if [[ ! -f "${compose_file}" ]]; then
  echo "Docker Compose file not found at ${compose_file}" >&2
  exit 1
fi

container_service="${service}-tests"
if [[ "${service}" != "node" && "${service}" != "python" ]]; then
  echo "Unsupported service '${service}'. Expected 'node' or 'python'." >&2
  exit 1
fi

export TEST_ENVIRONMENT="${environment}"
export SYNTHETIC_DATA_PATH="${repo_root}/scripts/tests/data/synthetic-test-data.json"
export COMPOSE_PROJECT_NAME="${project_name}-${service}-${environment}"

cleanup() {
  docker compose -f "${compose_file}" down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT

printf 'Running %s synthetic checks for %s using Docker Compose...\n' "${service}" "${environment}"
docker compose -f "${compose_file}" run --rm "${container_service}"
