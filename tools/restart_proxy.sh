#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$ROOT/litellm.config.yaml"
test -f "$CFG" || { echo "Missing $CFG"; exit 1; }

pkill -f 'litellm' || true
nohup litellm --config "$CFG" --host 127.0.0.1 --port 4000 >/tmp/litellm.log 2>&1 &
for i in {1..50}; do
  sleep 0.2
  curl -sf http://127.0.0.1:4000/v1/models >/dev/null && { echo "✅ LiteLLM up on :4000 (log: /tmp/litellm.log)"; exit 0; }
done
echo "❌ LiteLLM failed to start"; tail -n 150 /tmp/litellm.log || true; exit 1
