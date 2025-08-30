#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
ids=$(ollama ps | awk 'NR>1{print $1}')
test -z "${ids:-}" || xargs -I{} ollama stop {} <<< "$ids" 2>/dev/null || true
echo "✅ Stopped any running Ollama models."
