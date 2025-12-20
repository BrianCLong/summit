#!/usr/bin/env bash
set -euo pipefail
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose "$@"
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose "$@"
else
  echo "Docker Compose is required (install Docker Desktop 4.x+)" >&2
  exit 1
fi
