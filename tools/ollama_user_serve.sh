#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
if lsof -i :11434 >/dev/null 2>&1; then
  echo "✅ Ollama already listening on :11434"
  exit 0
fi
nohup /opt/homebrew/opt/ollama/bin/ollama serve >/tmp/ollama.log 2>&1 &
sleep 1
if lsof -i :11434 >/dev/null 2>&1; then
  echo "✅ Ollama up (user session). Log: /tmp/ollama.log"
else
  echo "❌ Ollama failed to start"; tail -n 120 /tmp/ollama.log || true; exit 1
fi
