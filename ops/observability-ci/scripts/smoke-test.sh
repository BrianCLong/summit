#!/usr/bin/env bash
set -euo pipefail

docker compose -f "$(dirname "$0")/../docker-compose.yml" config >/dev/null
echo "docker-compose configuration OK"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

python "$SCRIPT_DIR/alert_runbook_generator.py"
python "$SCRIPT_DIR/check_oncall_paths.py"
