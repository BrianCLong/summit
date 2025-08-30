set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# Show available tasks
help:
    @echo "Targets:"
    @echo "  ollama-up              Start Ollama in *user session* (no launchd/brew services)"
    @echo "  ai-up                  Start LiteLLM proxy on :4000"
    @echo "  ai-down                Stop LiteLLM proxy"
    @echo "  ai-ping                Quick sanity pings via proxy"
    @echo "  health                 Check Ollama, LiteLLM, Docker, RAG index"
    @echo "  rag-build              Build DuckDB RAG index from rag/corpus"
    @echo "  rag q='…'              Ask a RAG question"
    @echo "  neo4j-up               Bring up disposable Neo4j in Docker"
    @echo "  neo4j-guard            Run *.cypher migrations vs disposable Neo4j"
    @echo "  neo4j-down             Tear down Neo4j and volumes"
    @echo "  ollama-kill            Stop any running Ollama models"

# ---- AI runtime ----
ollama-up:
    bash tools/ollama_user_serve.sh

ai-up:
    bash tools/restart_proxy.sh
    curl -s http://127.0.0.1:4000/v1/models | jq .

ai-down:
    @pkill -f 'litellm' || true
    @echo "LiteLLM proxy stopped."

ai-ping:
    bash tools/ping_llms.sh

health:
    MIG_DIR="${MIG_DIR:-db/migrations}" COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.neo4j.yml}" bash tools/health.sh

ollama-kill:
    bash tools/ollama_kill.sh

# ---- RAG ----
rag-build:
    python3 tools/rag_index.py

rag q='':
    python3 tools/rag_query.py "{{q}}"

# ---- Neo4j (disposable) ----
neo4j-up:
    docker compose -f "${COMPOSE_FILE:-docker-compose.neo4j.yml}" up -d neo4j-ephemeral

neo4j-guard:
    MIG_DIR="${MIG_DIR:-db/migrations}" KEEP_DB="${KEEP_DB:-0}" COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.neo4j.yml}" \
      bash tools/neo4j_guard.sh

neo4j-down:
    docker compose -f "${COMPOSE_FILE:-docker-compose.neo4j.yml}" down -v

backup:
    bash tools/backup.sh

restore ARCHIVE:
    bash tools/restore.sh "{{ARCHIVE}}"

hook-git-demo:
    python3 tools/triggers.py git-push

orchestra-validate:
    python3 tools/validate_orchestration.py

chaos:
    bash tools/chaos.sh

report-budgets:
    python3 tools/budgets.py > docs/budgets.md

dash-refresh:
    python3 tools/status_json.py

dash-open:
    open http://127.0.0.1:8008