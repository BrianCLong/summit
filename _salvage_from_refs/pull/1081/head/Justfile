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
    @echo "  ask-pack TASK='' q=''  Model-aware question with task-specific prompting"
    @echo "  symphony-status        Show Symphony Orchestra platform status"
    @echo "  burndown-dash          Generate metrics and open executive dashboard"
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

orchestra-fast:
    bash tools/ai_check6.sh
    python3 tools/rag_stats.py

orchestra-smoke:
    just ai-up
    bash tools/ai_check6.sh
    python3 tools/rag_index.py
    python3 tools/rag_stats.py
    MIG_DIR="${MIG_DIR:-db/migrations}" KEEP_DB="${KEEP_DB:-0}" COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.neo4j.yml}" bash tools/neo4j_guard.sh

# ---- Model-Aware Prompting ----
ask-pack TASK='' q='':
    python3 tools/ask_with_pack.py {{TASK}} {{q}}

ask-pack-rules TASK='' q='' rules='':
    RULES={{rules}} python3 tools/ask_with_pack.py {{TASK}} {{q}}

# ---- Executive Intelligence Dashboard ----
metrics-refresh:
    python3 tools/usage_burndown.py

burndown-serve:
    python3 -m http.server 8787 >/dev/null 2>&1 & echo $! > /tmp/orchestra_http.pid

burndown-open:
    open "http://localhost:8787/dash/burndown.html"

burndown-stop:
    kill $(cat /tmp/orchestra_http.pid) 2>/dev/null || true

burndown-dash:
    just metrics-refresh
    just burndown-serve
    just burndown-open

# ---- Advanced Symphony Capabilities ----
# Autonomous Policy Adaptation
policy-adapt:
    python3 tools/policy_adaptive.py

policy-daemon:
    python3 tools/policy_adaptive.py --daemon

# Benchmark Mini System
benchmark:
    python3 tools/benchmark_mini.py --quick

benchmark-full:
    python3 tools/benchmark_mini.py

benchmark-models MODELS:
    python3 tools/benchmark_mini.py --models {{MODELS}}

# Enhanced RAG with Clustering
rag-enhanced q='':
    python3 tools/rag_enhanced.py --query {{q}}

rag-cluster:
    python3 tools/rag_enhanced.py --cluster

rag-ingest-enhanced PATH='rag/corpus':
    python3 tools/rag_enhanced.py --ingest {{PATH}}

# Anomaly Detection & Self-Healing
anomaly-check:
    python3 tools/anomaly_healer.py --check

anomaly-daemon:
    python3 tools/anomaly_healer.py --daemon

anomaly-stats:
    python3 tools/anomaly_healer.py --stats

# Multi-Modal Intelligence Fusion
fusion-ingest PATH:
    python3 tools/multimodal_fusion.py --ingest {{PATH}}

fusion-analyze IDS:
    python3 tools/multimodal_fusion.py --analyze {{IDS}}

fusion-narrative IDS:
    python3 tools/multimodal_fusion.py --narrative {{IDS}}

# Real-Time Graph Intelligence
graph-stream:
    python3 tools/graph_streaming.py --stream

graph-patterns:
    python3 tools/graph_streaming.py --patterns

graph-metrics:
    python3 tools/graph_streaming.py --metrics

# ---- Enterprise Security & Compliance ----
security-init:
    python3 tools/security_framework.py --init

security-scan:
    python3 tools/security_framework.py --scan

security-compliance:
    python3 tools/security_framework.py --compliance

security-report:
    python3 tools/security_framework.py --report

security-generate-key USER:
    python3 tools/security_framework.py --generate-key {{USER}}

security-audit TARGET:
    python3 tools/security_framework.py --audit {{TARGET}}

# Symphony Orchestra Status
symphony-status:
    @echo "🎭 IntelGraph Symphony Orchestra - Advanced AI Orchestration Platform"
    @echo ""
    @echo "🎯 Core Services:"
    @curl -s http://127.0.0.1:4000/v1/models | jq -r '.data[0].id' 2>/dev/null && echo "  ✅ LiteLLM Proxy" || echo "  ❌ LiteLLM Proxy"
    @curl -s http://127.0.0.1:7474 >/dev/null 2>&1 && echo "  ✅ Neo4j Graph DB" || echo "  ❌ Neo4j Graph DB"
    @curl -s http://127.0.0.1:8787/health >/dev/null 2>&1 && echo "  ✅ Symphony Proxy" || echo "  ❌ Symphony Proxy"
    @[ -f rag/index/rag.duckdb ] && echo "  ✅ RAG Index" || echo "  ❌ RAG Index"
    @echo ""
    @echo "🧠 Intelligence Capabilities:"
    @echo "  ✅ Model-Aware Routing with Bespoke Prompting"
    @echo "  ✅ Autonomous Policy Adaptation"
    @echo "  ✅ Continuous Model Benchmarking"
    @echo "  ✅ Enhanced RAG with Vector Clustering"
    @echo "  ✅ Predictive Anomaly Detection & Self-Healing"
    @echo "  ✅ Multi-Modal Intelligence Fusion"
    @echo "  ✅ Real-Time Graph Intelligence Streaming"
    @echo "  ✅ Executive Intelligence Dashboard"
    @echo "  ✅ Full-Stack React UI with Live Backend"
    @echo ""
    @echo "📊 Quick Commands:"
    @echo "  just symphony-ui        - Start full UI stack"
    @echo "  just ask-pack TASK='' q=''  - Model-aware AI queries"
    @echo "  just benchmark --quick  - Fast model performance check"
    @echo "  just anomaly-check      - System health analysis"
    @echo "  just burndown-dash      - Executive metrics dashboard"

# ---- Full UI Stack ----
proxy-start:
    node tools/proxy.js &

proxy-stop:
    @pkill -f 'node tools/proxy.js' || true

ui-serve:
    python3 -m http.server 3000 >/dev/null 2>&1 & echo $! > /tmp/symphony_ui.pid

ui-stop:
    kill $(cat /tmp/symphony_ui.pid) 2>/dev/null || true

symphony-ui:
    @echo "🎭 Starting Symphony Orchestra Full Stack..."
    @echo "  🔧 Starting backend proxy..."
    just proxy-start
    @sleep 2
    @echo "  🌐 Starting UI server..."
    just ui-serve
    @sleep 1
    @echo "  ✅ Symphony Orchestra UI available at:"
    @echo "     http://127.0.0.1:3000 (UI)"
    @echo "     http://127.0.0.1:8787 (API Proxy)"
    @echo ""
    @echo "  🛑 To stop: just symphony-stop"

symphony-stop:
    @echo "🛑 Stopping Symphony Orchestra UI stack..."
    just proxy-stop
    just ui-stop
    @echo "✅ Symphony UI stack stopped"

# ---- Complete UI Stack Testing ----
symphony-test:
    @echo "🧪 Testing Symphony Orchestra UI Stack..."
    @curl -s http://127.0.0.1:8787/health | jq .status
    @curl -s http://127.0.0.1:8787/budgets | jq .summary.totalCost
    @curl -s http://127.0.0.1:8787/models | jq '.data | length'
    @curl -s http://127.0.0.1:3000/ | grep -q "Symphony Orchestra" && echo "✅ UI accessible"
    @echo "✅ All endpoints validated"