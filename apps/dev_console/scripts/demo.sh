#!/usr/bin/env bash
set -euo pipefail
QUESTION=${1:-"Summarize failing tests"}
python - <<'PY'
from apps.dev_console.flow import dev_console
import sys
question = sys.argv[1]
print(dev_console(question))
PY "$QUESTION"
