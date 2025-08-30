#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a

echo "Attempting to pull deepseek-coder-v2..."
ollama pull deepseek-coder-v2 || echo "Warning: Failed to pull deepseek-coder-v2. Continuing..."

echo "Attempting to pull llama3.2:1b..."
ollama pull llama3.2:1b || echo "Warning: Failed to pull llama3.2:1b. Continuing..."

echo "Attempting to pull nomic-embed-text..."
ollama pull nomic-embed-text || echo "Warning: Failed to pull nomic-embed-text. Continuing..."

echo "Listing all Ollama models:"
ollama list