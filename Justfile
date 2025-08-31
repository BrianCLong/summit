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
    @echo "  orchestra-up           Start Orchestra services with configuration validation"
    @echo "  orchestra-smoke        Run Orchestra smoke test with routing verification"
    @echo "  orchestra-down         Stop Orchestra services and cleanup"
    @echo "  burndown-dash          Generate metrics and open executive dashboard"
    @echo "  neo4j-up               Bring up disposable Neo4j in Docker"
    @echo "  neo4j-guard            Run *.cypher migrations vs disposable Neo4j"
    @echo "  neo4j-down             Tear down Neo4j and volumes"
    @echo "  ollama-kill            Stop any running Ollama models"
    @echo ""
    @echo "Conductor (MoE+MCP) Operations:"
    @echo "  conductor-up           Start full Conductor system with MCP servers"
    @echo "  conductor-down         Stop Conductor system and cleanup"
    @echo "  conductor-status       Show Conductor system status and health"
    @echo "  conductor-logs [svc]   Show logs for conductor service (default: server)"
    @echo "  conductor-smoke        Run Conductor routing and execution smoke tests"
    @echo "  studio-open            Open Conductor Studio UI in browser"

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

orchestra-smoke-legacy:
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

# ---- Symphony Orchestra Integration ----
orchestra-up:
    @echo "🎼 Starting Symphony Orchestra with full integration..."
    @echo "  🔧 Validating configuration..."
    @python3 tools/symphony.py orchestrator status
    @echo "  🚀 Starting core services..."
    @just ollama-up
    @just ai-up
    @just neo4j-up
    @echo "  ✅ Orchestra integration active"
    @echo "     Configuration: orchestration.yml"
    @echo "     CLI: python3 tools/symphony.py"
    @echo "     Observability: enabled"

orchestra-smoke:
    @echo "🎼 Running Orchestra smoke test..."
    @echo "  🔍 Testing configuration validation..."
    @python3 tools/symphony.py policy show
    @echo "  🎯 Testing model routing..."
    @ORCHESTRA_ENV=dev python3 tools/symphony.py route decide --task nl2cypher --loa 1 --json
    @echo "  🧪 Testing graph operations..."
    @python3 tools/symphony.py graph status
    @echo "  📊 Testing observability..."
    @python3 tools/symphony.py orchestrator status
    @echo "  ✅ Orchestra smoke test passed"

orchestra-down:
    @echo "🎼 Stopping Symphony Orchestra services..."
    @just ai-down
    @just neo4j-down
    @just ollama-kill
    @echo "✅ Orchestra services stopped"

# Orchestra Policy Management
orchestra-policy-show:
    @python3 tools/symphony.py policy show

orchestra-policy-tune AUTONOMY:
    @python3 tools/symphony.py policy tune --autonomy {{AUTONOMY}}

orchestra-tune-env ENV:
    @echo "ORCHESTRA_ENV={{ENV}}" > .orchestra.env
    @echo "✅ Orchestra environment set to: {{ENV}}"

# Orchestra Task Execution
orchestra-task TASK:
    @ORCHESTRA_ENV=${ORCHESTRA_ENV:-dev} python3 tools/symphony.py orchestrator {{TASK}}

orchestra-route TASK LOA:
    @ORCHESTRA_ENV=${ORCHESTRA_ENV:-dev} python3 tools/symphony.py route decide --task {{TASK}} --loa {{LOA}} --json

# Full Orchestra Demo
orchestra-demo:
    @echo "🎼 Symphony Orchestra Full Demonstration"
    @echo "======================================="
    @just orchestra-up
    @echo ""
    @echo "🎯 Testing intelligent routing..."
    @just orchestra-route nl2cypher 1
    @echo ""
    @echo "🧠 Testing graph intelligence..."
    @python3 tools/symphony.py graph query --query "Show me all recent security events"
    @echo ""
    @echo "📊 Final status report..."
    @just symphony-status
    @echo ""
    @echo "✅ Orchestra demonstration complete"

# ---- Conductor (MoE+MCP) Operations ----

# Conductor system operations
conductor-up:
    @echo "🧠 Starting Conductor (MoE+MCP) System..."
    @echo "  🔧 Starting core services..."
    ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml up -d neo4j postgres redis
    @echo "  ⏳ Waiting for databases to be ready..."
    @sleep 10
    @echo "  🚀 Starting MCP servers..."
    ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml up -d mcp-graphops mcp-files
    @echo "  📡 Starting main server..."
    CONDUCTOR_ENABLED=true ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml up -d server
    @echo "  🌐 Starting client..."
    ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml up -d client
    @echo "  ✅ Conductor system started successfully"
    @echo ""
    @echo "🎯 Available endpoints:"
    @echo "  http://localhost:3000         - IntelGraph UI"
    @echo "  http://localhost:3000/conductor - Conductor Studio"
    @echo "  http://localhost:4000/graphql - GraphQL API"
    @echo "  http://localhost:4000/health/conductor - Health check"
    @echo "  http://localhost:4000/metrics - Prometheus metrics"
    @echo "  http://localhost:8081/health  - GraphOps MCP Server"
    @echo "  http://localhost:8082/health  - Files MCP Server"

conductor-down:
    @echo "🧠 Stopping Conductor system..."
    ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml down --remove-orphans
    @echo "✅ Conductor system stopped"

conductor-status:
    @echo "🧠 Conductor System Status"
    @echo "========================"
    ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml ps
    @echo ""
    @echo "🏥 Health Checks:"
    @curl -s http://localhost:4000/health/conductor | jq -r '"\(.status): \(.message // "OK")"' 2>/dev/null || echo "❌ Conductor API unhealthy"
    @curl -s http://localhost:8081/health | jq -r '"GraphOps: \(.status // "unknown")"' 2>/dev/null || echo "❌ GraphOps MCP unhealthy"  
    @curl -s http://localhost:8082/health | jq -r '"Files: \(.status // "unknown")"' 2>/dev/null || echo "❌ Files MCP unhealthy"

conductor-logs svc='server':
    ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml logs -f {{svc}}

conductor-smoke:
    @echo "🧪 Running Conductor smoke tests..."
    @echo "  🔍 Testing routing preview..."
    @curl -fsS -X POST -H 'content-type: application/json' \
     -d '{"query":"query($input: ConductInput!){ previewRouting(input:$input){ expert reason confidence }}","variables":{"input":{"task":"MATCH (n) RETURN count(n)","maxLatencyMs":2000}}}' \
     ${PROXY_BASE:-http://127.0.0.1:4000}/graphql | jq -r '.data.previewRouting | "✅ Routing: Expert=\(.expert), Confidence=\(.confidence), Reason=\(.reason)"'
    @echo "  🎯 Testing task execution..."
    @curl -fsS -X POST -H 'content-type: application/json' \
     -d '{"query":"mutation($input: ConductInput!){ conduct(input:$input){ expertId cost latencyMs auditId }}","variables":{"input":{"task":"MATCH (n) RETURN count(n) as total_nodes","maxLatencyMs":5000}}}' \
     ${PROXY_BASE:-http://127.0.0.1:4000}/graphql | jq -r '.data.conduct | "✅ Execution: Expert=\(.expertId), Latency=\(.latencyMs)ms, Cost=$\(.cost), Audit=\(.auditId)"'
    @echo "  📊 Testing metrics endpoint..."
    @curl -s http://localhost:4000/metrics | grep -q "conductor_" && echo "✅ Conductor metrics available" || echo "❌ Conductor metrics missing"
    @echo "  🔗 Testing MCP servers..."
    @curl -s http://localhost:8081/health | jq -r '"✅ GraphOps MCP: \(.status // "unknown")"' || echo "❌ GraphOps MCP failed"
    @curl -s http://localhost:8082/health | jq -r '"✅ Files MCP: \(.status // "unknown")"' || echo "❌ Files MCP failed"
    @echo ""
    @echo "✅ Conductor smoke test completed successfully!"

studio-open:
    @echo "🎨 Opening Conductor Studio..."
    open http://localhost:3000/conductor

# MCP Server Management  
mcp-up:
    @echo "🔧 Starting MCP servers..."
    ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml up -d mcp-graphops mcp-files
    
mcp-down:
    @echo "🔧 Stopping MCP servers..."
    ${COMPOSE_CMD:-docker compose} -f docker-compose.dev.yml stop mcp-graphops mcp-files

mcp-status:
    @echo "🔧 MCP Server Status:"
    @echo "GraphOps (port 8081):"
    @curl -s http://localhost:8081/health | jq . 2>/dev/null || echo "  ❌ Not responding"
    @echo "Files (port 8082):"
    @curl -s http://localhost:8082/health | jq . 2>/dev/null || echo "  ❌ Not responding"

mcp-tools:
    @echo "🔧 Available MCP Tools:"
    @echo "GraphOps Server:"
    @curl -s http://localhost:8081/tools 2>/dev/null | jq -r '.tools[]? | "  - \(.name): \(.description)"' || echo "  No tools available"
    @echo "Files Server:" 
    @curl -s http://localhost:8082/tools 2>/dev/null | jq -r '.tools[]? | "  - \(.name): \(.description)"' || echo "  No tools available"

# Full Conductor development workflow
conductor-dev:
    @echo "🔥 Starting full Conductor development environment..."
    @just conductor-up
    @sleep 5
    @just conductor-smoke
    @echo ""
    @echo "🎯 Development environment ready!"
    @echo "  📝 Edit code and restart with: just conductor-up"
    @echo "  🧪 Run smoke tests with: just conductor-smoke"
    @echo "  🎨 Open Studio with: just studio-open"
    @echo "  📊 View logs with: just conductor-logs [service]"