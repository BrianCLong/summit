#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a

ok(){ printf "%-22s | %s\n" "$1" "$2"; }

if lsof -i :11434 >/dev/null 2>&1; then ok "Ollama :11434" "up"; else ok "Ollama :11434" "down"; fi
if lsof -i :4000  >/dev/null 2>&1; then ok "LiteLLM :4000" "up"; else ok "LiteLLM :4000" "down"; fi
test -f rag/index/rag.duckdb && ok "RAG index" "present" || ok "RAG index" "missing"

# Neo4j container present?
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -qx neo4j-ephemeral; then
    ok "Neo4j container" "running"
  else
    ok "Neo4j container" "not running"
  fi
fi
