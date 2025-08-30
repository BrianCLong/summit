#!/usr/bin/env bash
set -euo pipefail
echo "[chaos] stopping litellm for 5s"
pkill -f 'litellm' || true
sleep 5
echo "[chaos] restarting litellm"
litellm --config "$PWD/litellm.config.yaml" --host 127.0.0.1 --port 4000 >/tmp/litellm.log 2>&1 &
sleep 2
echo "[chaos] probing"
bash tools/ai_ask6.sh local/llama 'return exactly six words' >/dev/null
