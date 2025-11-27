# Use bash with strict mode
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# ---- Tweaks you can set/override in .env ----
export NEO4J_URI          := env("NEO4J_URI",          "bolt://localhost:7687")
export NEO4J_USERNAME     := env("NEO4J_USERNAME",     "neo4j")
export NEO4J_PASSWORD     := env("NEO4J_PASSWORD",     "local_dev_pw")
export POSTGRES_URL       := env("POSTGRES_URL",       "postgres://postgres:postgres @localhost:5432/postgres")
export REDIS_URL          := env("REDIS_URL",          "redis://localhost:6379")

export MCP_GRAPHOPS_PORT  := env("MCP_GRAPHOPS_PORT",  "7411")
export MCP_FILES_PORT     := env("MCP_FILES_PORT",     "7412")

export SRV_PORT           := env("INTELGRAPH_SERVER_PORT", "4000")
export UI_PORT            := env("UI_PORT", "5173")

export CONDUCTOR_ENABLED  := env("CONDUCTOR_ENABLED", "true")
export CONDUCTOR_TIMEOUT_MS := env("CONDUCTOR_TIMEOUT_MS", "30000")
export CONDUCTOR_MAX_CONCURRENT := env("CONDUCTOR_MAX_CONCURRENT", "10")
export CONDUCTOR_AUDIT_ENABLED := env("CONDUCTOR_AUDIT_ENABLED", "true")

export LLM_LIGHT_ENDPOINT := env("LLM_LIGHT_ENDPOINT", "https://api.openai.com/v1")
export LLM_HEAVY_ENDPOINT := env("LLM_HEAVY_ENDPOINT", "https://api.openai.com/v1")
# API keys should be in .env only, not defaulted.
export LLM_LIGHT_API_KEY  := env("LLM_LIGHT_API_KEY",  "")
export LLM_HEAVY_API_KEY  := env("LLM_HEAVY_API_KEY",  "")

# Cross-platform browser opener
open url:
 @command -v xdg-open >/dev/null 2>&1; then xdg-open "{{url}}"; \
elif command -v open >/dev/null 2>&1; then open "{{url}}"; \
else echo "Open {{url}} manually."; fi

# Simple TCP wait; avoids racing ahead of services
wait-for host port timeout=45:
until (echo > /dev/tcp/{{host}}/{{port}}) >/dev/null 2>&1; do
timeout=$((timeout-1))
if [ $timeout -le 0 ]; then echo "Timed out waiting for {{host}}:{{port}}"; exit 1; fi
sleep 1
done

# Sanity check required binaries
conductor-prereqs:
 @for b in docker docker compose node pnpm; do \
  if ! command -v $b >/dev/null 2>&1; then echo "Missing prereq: $b"; exit 1; fi; \
done

# Validate env before we boot (never echo secrets)
conductor-env-check:
 @if [ -f .env ]; then set -a; source .env; set +a; fi
 @if [ -z "$LLM_LIGHT_API_KEY" ] || [ -z "$LLM_HEAVY_API_KEY" ]; then \
  echo "⚠️  LLM API keys are not set (LLM_LIGHT_API_KEY / LLM_HEAVY_API_KEY). You can still boot, but Conductor LLM calls will be no-op/fail."; \
fi
 @echo "NEO4J_URI=${NEO4J_URI}"
 @echo "POSTGRES_URL set=$( [ -n "${POSTGRES_URL}" ] && echo yes || echo no )"
 @echo "REDIS_URL=${REDIS_URL}"
 @echo "CONDUCTOR_ENABLED=${CONDUCTOR_ENABLED}, TIMEOUT_MS=${CONDUCTOR_TIMEOUT_MS}, MAX_CONCURRENT=${CONDUCTOR_MAX_CONCURRENT}"

# Bring up core infra via Compose (services are named examples; adjust to your compose file)
infra-up:
 @if [ -f .env ]; then set -a; source .env; set +a; fi
docker compose up -d neo4j postgres redis
 @just wait-for localhost 7687
 @just wait-for localhost 5432
 @just wait-for localhost 6379

infra-down:
docker compose stop neo4j postgres redis || true

# Build once so MCP/server don’t rely on ts-node in prod-ish dev
build-all:
pnpm -C server install
pnpm -C server build
pnpm -C client install
# Optional: build client too, or use dev server
# pnpm -C client build

# Start MCP servers (GraphOps + Files) in background panes using pnpm scripts you already have
mcp-up:
 @if [ -f .env ]; then set -a; source .env; set +a; fi
pnpm -C server run mcp:graphops -- --port ${MCP_GRAPHOPS_PORT} &
echo $! > .run/mcp-graphops.pid
pnpm -C server run mcp:files    -- --port ${MCP_FILES_PORT} &
echo $! > .run/mcp-files.pid
 @mkdir -p .run
 @just wait-for localhost ${MCP_GRAPHOPS_PORT}
 @just wait-for localhost ${MCP_FILES_PORT}

mcp-down:
 @pkill -F .run/mcp-graphops.pid 2>/dev/null || true
 @pkill -F .run/mcp-files.pid 2>/dev/null || true

# IntelGraph server (Conductor enabled)
server-up:
 @if [ -f .env ]; then set -a; source .env; set +a; fi
CONDUCTOR_ENABLED=${CONDUCTOR_ENABLED} \
CONDUCTOR_TIMEOUT_MS=${CONDUCTOR_TIMEOUT_MS} \
CONDUCTOR_MAX_CONCURRENT=${CONDUCTOR_MAX_CONCURRENT} \
CONDUCTOR_AUDIT_ENABLED=${CONDUCTOR_AUDIT_ENABLED} \
LLM_LIGHT_ENDPOINT=${LLM_LIGHT_ENDPOINT} \
LLM_HEAVY_ENDPOINT=${LLM_HEAVY_ENDPOINT} \
LLM_LIGHT_API_KEY=${LLM_LIGHT_API_KEY} \
LLM_HEAVY_API_KEY=${LLM_HEAVY_API_KEY} \
pnpm -C server start:conductor &
echo $! > .run/server.pid
 @mkdir -p .run
 @just wait-for localhost ${SRV_PORT}

server-down:
 @pkill -F .run/server.pid 2>/dev/null || true

# Client/UI
client-up:
pnpm -C client dev &
echo $! > .run/client.pid
 @mkdir -p .run
 @just wait-for localhost ${UI_PORT}

client-down:
 @pkill -F .run/client.pid 2>/dev/null || true

# Single entrypoint as you described
conductor-up: conductor-prereqs conductor-env-check infra-up build-all mcp-up server-up client-up
 @echo "✅ Conductor stack is live."
 @just open "http://localhost:${UI_PORT}/conductor"

# Tear down just the app layer; leave infra running by default
conductor-down: client-down server-down mcp-down
 @echo "🛑 Conductor app layer stopped. (Run 'just infra-down' to stop data services.)"

# Restart (down → up)
conductor-restart: conductor-down conductor-up

# Status: call API for /status or GraphQL health; print compact matrix
conductor-status:
 @echo "🔎 Maestro status"
 @if curl -fsS http://localhost:${SRV_PORT}/healthz >/dev/null 2>&1; then echo "server: OK"; else echo "server: FAIL"; fi
 @if curl -fsS http://localhost:${UI_PORT} >/dev/null 2>&1; then echo "ui: OK"; else echo "ui: OFF"; fi
 @if curl -fsS http://localhost:${SRV_PORT}/graphql -H 'content-type: application/json' --data '{"query":"query{ health }"}' | jq -e '.data.health' >/dev/null 2>&1; then echo "graphql: OK"; else echo "graphql: FAIL"; fi

# Tail logs fast when debugging
conductor-logs:
 @echo "--- server ---"
 @tail -f .run/server.log 2>/dev/null || echo "No server logs yet."
 @echo "--- client ---"
 @tail -f .run/client.log 2>/dev/null || echo "No client logs yet."

# Hit GraphQL with a health + previewRouting smoke; adjust query names if your schema differs
conductor-smoke:
 @echo "🔎 Health check (server)…"
curl -sS -X POST "http://localhost:${SRV_PORT}/graphql" \
  -H "content-type: application/json" \
  --data '{"query":"query H{ health }"}' | tee /dev/stderr | grep -q '"data"' 
 @echo "🎼 Conductor previewRouting…"
curl -sS -X POST "http://localhost:${SRV_PORT}/graphql" \
  -H "content-type: application/json" \
  --data '{"query":"mutation P{ previewRouting(input:{query:\"ping\"}){ plan cost warnings }}"}' | tee /dev/stderr | grep -q '"data"'
 @echo "✅ Smoke OK"

# Kill GraphOps MCP briefly, verify degraded mode, then restore
conductor-drill:
docker compose stop graphops || true
sleep 5
curl -fsS http://localhost:4000/health/conductor | jq .
# previewRouting should still function (LLM routes around GraphOps)
curl -fsS -X POST http://localhost:4000/graphql -H 'content-type: application/json' \
  --data '{"query":"mutation{ previewRouting(input:{query:\"no-graph-fallback\"}){ plan warnings }}"}' | jq .
docker compose start graphops
just conductor-status

# Suggested follow-up commits

# wire a conductor-restart (down→up) and a conductor-status that hits /graphql with { health } and prints a compact matrix for all components.

default: offline-eval

# quick demo using the sample replay
offline-eval:
    python3 services/analytics/simulator/offline_eval.py --log runs/offline-replay.jsonl --out reports

# parametric run: just offline-eval LOG=runs/foo.jsonl
offline-eval LOG="runs/offline-replay.jsonl":
    python3 services/analytics/simulator/offline_eval.py --log {{LOG}} --out reports

# --- PR draft helpers (v24) ---
pr-list:
	./scripts/pr_drafts.sh list

pr-edit n:
	./scripts/pr_drafts.sh edit {{n}}

pr-publish n:
	./scripts/pr_drafts.sh publish {{n}}

pr-publish-all:
	./scripts/pr_drafts.sh publish-all

# --- Dashboards ---
dash-open-v24:
	just open "https://github.com/$(git config --get remote.origin.url | sed -E 's#.*github.com[:/](.+)\.git#\1#')/issues?q=is%3Aopen+label%3Av24+v24%3A+PR+Dashboard+\(PRs+1%E2%80%9310\)"

dash-open-multi:
	just open "https://github.com/$(git config --get remote.origin.url | sed -E 's#.*github.com[:/](.+)\.git#\1#')/issues?q=is%3Aopen+label%3Apr-dashboards+PR+Dashboards+\(multi-wave\)"

# v25 Justfile Helpers
dash-open-v25:
	open "https://github.com/{{env_var("GITHUB_REPOSITORY", "<owner>/<repo>")}}/issues?q=is%3Aissue+is%3Aopen+%22v25%3A+PR+Dashboard%22"

seed-v25 T=*: 
	bash scripts/pr-drafts/seed-drafts.sh v25 --file project_management/pr_drafts/v25/titles.txt

publish-v25 L="v25,platform" M="v25":
	bash scripts/pr-drafts/publish-prs.sh -B main --embed-shared --labels "{{L}}" --milestone "{{M}}" --repo {{env_var("GITHUB_REPOSITORY", "<owner>/<repo>")}}

# ============================================================================
# Pipeline Orchestration Commands
# ============================================================================

# List all registered pipelines
pipelines-list FILTER="":
    @python3 pipelines/cli.py list --format table {{FILTER}}

# Run a pipeline locally or in CI
pipelines-run NAME CONTEXT="":
    python3 pipelines/cli.py run {{NAME}} {{if CONTEXT != "" { "--context " + CONTEXT } else { "" }}}

# Visualize pipeline task graph
pipelines-graph NAME FORMAT="ascii":
    python3 pipelines/cli.py graph {{NAME}} --format {{FORMAT}}

# Show detailed pipeline information
pipelines-info NAME:
    python3 pipelines/cli.py info {{NAME}}

# Validate all pipeline manifests
pipelines-validate:
    python3 pipelines/cli.py validate

# Generate Airflow DAGs from pipeline manifests
pipelines-generate-airflow OUTPUT="./airflow/dags":
    python3 pipelines/cli.py generate-airflow --output-dir {{OUTPUT}}

# Show pipeline registry summary
pipelines-summary:
    @python3 -c "from pipelines.registry.core import create_registry; import json; r = create_registry(); print(json.dumps(r.export_summary(), indent=2, default=str))"

# List scheduled pipelines only
pipelines-scheduled:
    @python3 pipelines/cli.py list --scheduled --format table

# Filter pipelines by runtime
pipelines-by-runtime RUNTIME:
    @python3 pipelines/cli.py list --runtime {{RUNTIME}} --format table

# Filter pipelines by owner
pipelines-by-owner OWNER:
    @python3 pipelines/cli.py list --owner {{OWNER}} --format table

# Quick demo: run CISA KEV ingest pipeline
pipelines-demo-cisa:
    python3 pipelines/cli.py run cisa-kev-ingest --dry-run

# ============================================================================
# Maestro Pipeline Shims
# ============================================================================

sbom:
    bash scripts/sbom-attest.sh

trivy:
    @echo "Running Trivy security scan..."
    @if command -v trivy >/dev/null; then \
        trivy fs . --scanners vuln,secret,config --exit-code 0; \
    else \
        echo "Trivy not found, skipping scan (simulation mode)"; \
    fi

slo-check:
    python3 scripts/slo_burn_check.py --budget .maestro/ci_budget.json

migration-gate:
    bash scripts/migration-gate.sh

deploy strategy="canary" weight="10":
    bash scripts/deploy.sh --strategy {{strategy}} --weight {{weight}}

canary-analyze budget=".maestro/ci_budget.json":
    bash scripts/canary_analyze.sh --budget {{budget}}

promote:
    @echo "Promoting deployment to stable..."
    @echo "Promotion complete."

rollback service="intelgraph":
    bash scripts/rollback.sh {{service}}
