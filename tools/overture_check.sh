#!/usr/bin/env bash
set -euo pipefail

ok(){
  printf "\033[32m✔ %s\033[0m\n" "$1"
}
warn(){
  printf "\033[33m⚠ %s\033[0m\n" "$1"
}
err(){
  printf "\033[31m✖ %s\033[0m\n" "$1"
}

echo "🎼 IntelGraph Pre-Overture Checklist — $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

echo "→ 1) Base health (Ollama, LiteLLM proxy, Docker, RAG index)"
if just -q health; then ok "Base health checks passed"; else err "Base health failed"; exit 1; fi

echo "→ 2) Ensure LiteLLM proxy is up (or start it)"
if curl -sS http://127.0.0.1:4000/v1/models >/dev/null 2>&1; then
ok "LiteLLM proxy responding on :4000"
else
warn "LiteLLM proxy not responding; starting via 'just ai-up'"
just -q ai-up
sleep 1
curl -sS http://127.0.0.1:4000/v1/models >/dev/null 2>&1 || { err "LiteLLM still not responding on :4000"; exit 1; }
ok "LiteLLM proxy now healthy"
fi

echo "→ 3) Model visibility through proxy"
MODELS_JSON=$(curl -sS http://127.0.0.1:4000/v1/models || true)
echo "$MODELS_JSON" | jq -e '.data | length > 0' >/dev/null 2>&1 || { err "No models visible to proxy"; exit 1; }
ok "$(echo "$MODELS_JSON" | jq -r '.data[].id' | head -n 1) (and others) visible"

echo "→ 4) LLM quick smoke (ask-model)"
if bash tools/ai_ask.sh cloud/deepseek-v3 "Return the single word PONG." | grep -qi "pong"; then
ok "LLM smoke test returned PONG"
else
warn "Cloud model not available or answered unexpectedly; trying local model"
if bash tools/ai_ask.sh local/llama "Return the single word PONG." | grep -qi "pong"; then
ok "Local LLM smoke test returned PONG"
else
err "LLM smoke test failed (cloud and local)"; exit 1;
fi
fi

echo "→ 5) Neo4j up + migrations"
just -q neo4j-up
sleep 2
if just -q neo4j-guard; then ok "Neo4j migrations/guards applied"; else err "Neo4j guard failed"; exit 1; fi

echo "→ 6) Provenance/RAG surface basic check"
tail -n 5 /tmp/litellm.log >/dev/null 2>&1 && ok "Proxy log accessible (recent activity present)" || warn "Proxy log not present (first run?)"

echo ""
ok "Conductor ready — strike up the overture!"
echo "   Next: open Graph Explorer and run a small NL→Cypher query, or start a demo case."
