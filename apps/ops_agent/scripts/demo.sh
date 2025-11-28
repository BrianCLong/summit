#!/usr/bin/env bash
set -euo pipefail
REQUEST=${1:-"search"}
python - <<'PY'
from apps.ops_agent.flow import ops_agent
import sys
req = sys.argv[1]
print(ops_agent(req))
PY "$REQUEST"
