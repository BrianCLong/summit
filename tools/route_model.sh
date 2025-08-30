#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
PROMPT="$(printf "%s" "${*:-}" | tr -d '\r')"

# cheap signals
lower="$(printf "%s" "$PROMPT" | tr '[:upper:]' '[:lower:]')"
words=$(awk '{print NF}' <<<"$PROMPT")
is_code=0
grep -Eq '\b(function|class|def|var|let|const|import|SELECT|INSERT|UPDATE|CREATE|MATCH|MERGE)\b|```' <<<"$PROMPT" && is_code=1

# routing
if (( is_code )); then
  echo "local/llama"         # your qwen2.5-coder route (good for code)
elif (( words <= 12 )); then
  echo "local/llama-small"   # fast short-instruction model (llama3.2:3b)
else
  echo "local/llama-cpu"     # safer 8B for longer text
fi
