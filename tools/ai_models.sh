#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a

need() { command -v "$1" >/dev/null || { echo "Missing $1"; exit 1; }; }
need ollama

echo "==> Ensuring base models are present"
ollama pull qwen2.5-coder:7b
ollama pull llama3.2:3b
ollama pull nomic-embed-text

# CPU-safe 8B llama (skip if already exists)
if ! ollama list | awk '{print $1}' | grep -qx 'llama3.1-8b-cpu:latest'; then
  cat > /tmp/Modelfile.llama3.1-8b-cpu <<'EOF'
FROM llama3.1:8b
PARAMETER num_gpu 0
PARAMETER num_ctx 1024
PARAMETER num_batch 8
EOF
  ollama create llama3.1-8b-cpu -f /tmp/Modelfile.llama3.1-8b-cpu
fi

echo "==> Models available:"
ollama list
