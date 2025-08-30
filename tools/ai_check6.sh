#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
fail=0

check() {
  local model="$1"
  local out wc
  out="$(bash "$(dirname "$0")/ai_ask6.sh" "$model" 'return exactly six words' || true)"
  wc="$(awk '{print NF}' <<<"$out" 2>/dev/null || echo 0)"
  if [[ "$wc" == "6" ]]; then
    printf "✅ %-14s: %s\n" "$model" "$out"
  else
    printf "❌ %-14s: '%s' (%s words)\n" "$model" "$out" "$wc"
    fail=1
  fi
}

check local/llama
check local/llama-cpu
exit $fail
