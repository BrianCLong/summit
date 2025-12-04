#!/usr/bin/env bash
set -euo pipefail
QUESTION=${1:-"How do we handle SOC 2 evidence?"}
python - <<'PY'
from apps.copilot.flow import doc_graph_copilot
import sys
question = sys.argv[1]
print(doc_graph_copilot(question))
PY "$QUESTION"
