#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
echo "Qwen (via proxy):"
bash tools/ai_ask6.sh local/llama 'return exactly six words'
echo
echo "Llama CPU-safe (via proxy):"
bash tools/ai_ask6.sh local/llama-cpu 'return exactly six words'
