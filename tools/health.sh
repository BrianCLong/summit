#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*" >&2; }
die()  { echo "❌ $*" >&2; exit 1; }

# 1) Ollama
if lsof -i :11434 >/dev/null 2>&1; then
  ok "Ollama :11434 listening"
  curl -fsS http://127.0.0.1:11434/v1/models >/dev/null && ok "Ollama /v1/models reachable" || die "Ollama API not responding"
else
  warn "Ollama not listening on :11434 (run: just ollama-up)"
fi

# 2) LiteLLM
if lsof -i :4000 >/dev/null 2>&1; then
  ok "LiteLLM :4000 listening"
  curl -fsS http://127.0.0.1:4000/v1/models >/dev/null && ok "LiteLLM /v1/models reachable" || die "LiteLLM API not responding"
else
  warn "LiteLLM not listening on :4000 (run: just ai-up)"
fi

# 3) RAG index
test -f rag/index/rag.duckdb && ok "RAG index exists" || warn "RAG index missing (run: just rag-build)"

# 4) Docker + compose
if command -v docker >/dev/null; then
  docker ps >/dev/null 2>&1 && ok "Docker daemon responding" || warn "Docker daemon not responding (start Docker Desktop)"
else
  warn "Docker not installed"
fi
echo "---- Done."
