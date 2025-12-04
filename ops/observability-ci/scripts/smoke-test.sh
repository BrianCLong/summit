#!/usr/bin/env bash
set -euo pipefail

docker compose -f "$(dirname "$0")/../docker-compose.yml" config >/dev/null
echo "docker-compose configuration OK"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
python3 "$REPO_ROOT/ops/runbooks/generate_alert_runbooks.py" --check
python3 "$REPO_ROOT/ops/observability-ci/scripts/check_oncall_pagerduty.py"
