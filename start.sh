#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
AI_PROFILE=0
SKIP_SMOKE=0
SKIP_BOOTSTRAP=0
usage() {
  cat <<USAGE
Summit bootstrapper

Usage: ./start.sh [options]
Options:
  --ai             Include docker-compose.ai.yml services (make up-ai)
  --skip-smoke     Skip make smoke (not recommended)
  --skip-bootstrap Skip make bootstrap (assumes deps are installed)
  -h, --help       Show this help message
USAGE
}
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ai)
      AI_PROFILE=1
      shift
      ;;
    --skip-smoke)
      SKIP_SMOKE=1
      shift
      ;;
    --skip-bootstrap)
      SKIP_BOOTSTRAP=1
      shift
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
done
require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[start] $1 is required" >&2
    exit 1
  fi
}
require docker
require make
require curl
require nc
if ! docker info >/dev/null 2>&1; then
  echo "[start] Docker daemon is not running" >&2
  exit 1
fi
run_make() {
  (cd "$ROOT_DIR" && make "$@")
}
if [[ $SKIP_BOOTSTRAP -eq 0 ]]; then
  echo "[start] running make bootstrap"
  run_make bootstrap
else
  echo "[start] skipping bootstrap"
fi
if [[ $AI_PROFILE -eq 1 ]]; then
  echo "[start] bringing up stack with AI profile"
  run_make up-ai
else
  echo "[start] bringing up core stack"
  run_make up
fi
if [[ $SKIP_SMOKE -eq 0 ]]; then
  echo "[start] running make smoke"
  run_make smoke
else
  echo "[start] smoke tests skipped"
fi
cat <<'DONE'
✅ Summit stack is ready.
- Client:   http://localhost:3000
- GraphQL:  http://localhost:4000/graphql
- Metrics:  http://localhost:4000/metrics
- Grafana:  http://localhost:3001 (admin / see docs)

Run `make down` when you're finished.
DONE
