#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-up}"
PRESET="${2:-full}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
PROJECT_NAME="summit-onboarding"

usage() {
  cat <<'USAGE'
Usage: scripts/onboarding/compose-presets.sh <action> [preset]

Actions:
  up       Start the stack for the selected preset (default)
  down     Stop and remove the stack and volumes
  ps       Show container status
  logs     Tail logs for the stack

Presets:
  minimal  Datastores + migrations only
  full     Minimal preset plus app services for UI/API (default)
  obs      Minimal preset plus observability sidecars
USAGE
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "::error::$1 is required. Install it before continuing." >&2
    exit 1
  fi
}

ensure_env() {
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi

  if [[ ! -f "$ROOT_DIR/.env.example" ]]; then
    echo "::error::.env.example missing; cannot bootstrap environment." >&2
    exit 1
  fi

  cp "$ROOT_DIR/.env.example" "$ENV_FILE"
  echo "Created $ENV_FILE from .env.example"
}

preset_files() {
  case "$1" in
    minimal)
      printf '%s\n' "$ROOT_DIR/docker-compose.minimal.yml"
      ;;
    full)
      printf '%s\n' "$ROOT_DIR/docker-compose.minimal.yml"
      printf '%s\n' "$ROOT_DIR/docker-compose.dev.yaml"
      ;;
    obs)
      printf '%s\n' "$ROOT_DIR/docker-compose.minimal.yml"
      printf '%s\n' "$ROOT_DIR/docker-compose.observability.yml"
      ;;
    *)
      echo "::error::Unknown preset: $1" >&2
      usage
      ;;
  esac
}

run_compose() {
  local action="$1"
  shift
  local files=("$@")
  local compose_args=()

  for file in "${files[@]}"; do
    compose_args+=(-f "$file")
  done

  case "$action" in
    up)
      ensure_env
      docker compose -p "$PROJECT_NAME" "${compose_args[@]}" up --build -d
      ;;
    down)
      docker compose -p "$PROJECT_NAME" "${compose_args[@]}" down -v
      ;;
    ps)
      docker compose -p "$PROJECT_NAME" "${compose_args[@]}" ps
      ;;
    logs)
      docker compose -p "$PROJECT_NAME" "${compose_args[@]}" logs -f
      ;;
    *)
      usage
      ;;
  esac
}

require_command docker

if ! docker compose version >/dev/null 2>&1; then
  echo "::error::Docker Compose v2 plugin is required. Install Docker Desktop/Engine with compose-plugin enabled." >&2
  exit 1
fi

mapfile -t COMPOSE_FILES < <(preset_files "$PRESET")

if [[ ${#COMPOSE_FILES[@]} -eq 0 ]]; then
  usage
fi

run_compose "$ACTION" "${COMPOSE_FILES[@]}"
