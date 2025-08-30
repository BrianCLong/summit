#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
MODEL="${1:-local/llama}"; shift || true
PROMPT="${1:-Return exactly six words.}"; shift || true
RUNS="${1:-10}"

pass=0; fail=0
for i in $(seq 1 "$RUNS"); do
  out="$(bash "$(dirname "$0")/ai_ask6.sh" "$MODEL" "$PROMPT" 2>/dev/null || true)"
  wc="$(printf '%s' "$out" | wc -w | tr -d ' ')"
  if [[ "$wc" == "6" ]]; then
    printf '✔ [%s] %s\n' "$wc" "$out"
    pass=$((pass+1))
  else
    printf '✘ [%s] %s\n' "$wc" "$out"
    fail=$((fail+1))
  fi
done
echo "---"
echo "pass: $pass  fail: $fail  (model=$MODEL)"

