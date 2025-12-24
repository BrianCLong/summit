#!/usr/bin/env bash
set -euo pipefail

# Unified quickstart for Summit dev stack with optional AI/Kafka profiles.
# Usage: npm run quickstart [-- --ai] [-- --kafka] [-- --no-dev]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT_DIR"

ENABLE_AI=false
ENABLE_KAFKA=false
START_DEV=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ai)
      ENABLE_AI=true
      ;;
    --kafka)
      ENABLE_KAFKA=true
      ;;
    --no-dev)
      START_DEV=false
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: npm run quickstart [-- --ai] [-- --kafka] [-- --no-dev]" >&2
      exit 1
      ;;
  esac
  shift
done

# Path validation keeps users from running the script from the wrong directory.
required_paths=(
  "package.json"
  "docker-compose.dev.yml"
  "scripts/validate-env.sh"
  "Makefile"
)

if $ENABLE_AI || $ENABLE_KAFKA; then
  required_paths+=("docker-compose.ai.yml")
fi

for path in "${required_paths[@]}"; do
  if [[ ! -e "$ROOT_DIR/$path" ]]; then
    echo "❌ Required file missing: $path (expected under $ROOT_DIR)." >&2
    exit 1
  fi
done

echo "🔍 Validating local environment..."
"$ROOT_DIR/scripts/validate-env.sh"

echo "🧰 Installing dependencies (pnpm workspace)..."
pnpm install --frozen-lockfile || pnpm install

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "📄 Creating .env from .env.example"
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi

compose_args=(-f docker-compose.dev.yml)
if $ENABLE_AI || $ENABLE_KAFKA; then
  compose_args+=(-f docker-compose.ai.yml --profile ai)
fi
if $ENABLE_KAFKA; then
  compose_args+=(--profile kafka)
fi

echo "🚀 Starting infrastructure with Docker Compose (${compose_args[*]})"
docker compose "${compose_args[@]}" up -d --remove-orphans --wait

if $ENABLE_AI || $ENABLE_KAFKA; then
  echo "🔁 Kafka bootstrap check"
  docker compose "${compose_args[@]}" ps kafka || true
fi

echo "🗃️  Running migrations and seeds"
npm run db:migrate
npm run db:seed

if $START_DEV; then
  echo "🌐 Launching dev servers (Ctrl+C to stop)"
  exec pnpm run dev
else
  echo "✅ Quickstart finished. Dev servers not launched (--no-dev)."
fi
