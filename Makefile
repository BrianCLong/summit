SHELL := /bin/bash
PY := python3

.PHONY: bootstrap up down logs ps server client ingest graph smoke clean reset-db ingest-assets up-local logs-local down-local demo

bootstrap: ; @test -f .env || cp .env.example .env; echo "✅ .env ready. Next: make up"
up: ; docker compose up -d --build
up-ai: ; docker compose --profile ai up -d --build
up-kafka: ; docker compose --profile kafka up -d --build
up-full: ; docker compose --profile ai --profile kafka up -d --build
down: ; docker compose down --remove-orphans
logs: ; docker compose logs -f
ps: ; docker compose ps
server: ; cd server && npm install && npm run dev
client: ; cd client && npm install && npm run dev
ingest: ; if [ ! -d ingestion/.venv ]; then $(PY) -m venv ingestion/.venv; fi; \
  source ingestion/.venv/bin/activate && pip install -r ingestion/requirements.txt && $(PY) ingestion/main.py
graph: ; if [ ! -d graph-service/.venv ]; then $(PY) -m venv graph-service/.venv; fi; \
  source graph-service/.venv/bin/activate && pip install -r graph-service/requirements.txt && $(PY) graph-service/main.py
smoke: ; node smoke-test.js
clean: ; find . -name "node_modules" -type d -prune -exec rm -rf '{}' +; \
  find . -name ".venv" -type d -prune -exec rm -rf '{}' +; echo "🧹 cleaned node_modules and venvs"
reset-db: ; docker compose down; \
  V=$$(docker volume ls -q | grep neo4j_data || true); \
  if [ -n "$$V" ]; then docker volume rm $$V; fi; \
  echo "🗑️  Neo4j volume removed"

up-local:
	cd compose && docker compose up -d --build

logs-local:
	cd compose && docker compose logs -f

down-local:
	cd compose && docker compose down -v

.demo-setup:
	make pack sign || true

_demo_url := http://localhost:4000/v1/policy/packs/policy-pack-v0

demo: .demo-setup up-local
	@echo "Waiting for MC at $(_demo_url)..."; sleep 3
	curl -sSI $(_demo_url) | tee /dev/stderr
	@echo "Publishing sample evidence..."
	npm --workspace=companyos run evidence:sample || true
	@echo "Open Grafana: http://localhost:3001 (admin/admin)"

sprint23:
	npm test
	npm run lint --if-present
	echo "gh project create 'Sprint 23 (Marketplace GA, BYOK, Gossip)'"
	echo "gh issue import -F project_management/sprint23_issues.csv"

ingest-assets:
	@if [ -z "$(path)" ]; then echo "path=<csv> required"; exit 1; fi; \
	if [ -z "$(org)" ]; then echo "org=<ORG> required"; exit 1; fi; \
	$(PY) data-pipelines/universal-ingest/assets_csv.py $(path) --org $(org)

preflight:
	@ts-node scripts/migrate/preflight_cli.ts

migrate-1_0_0:
	@ts-node server/src/migrations/1.0.0_migration.ts

cost-report:
	@bash scripts/ops/cost_report.sh

ga:
	make preflight && npm test && npx @cyclonedx/cyclonedx-npm --output-file sbom.json && ./scripts/release/verify_install.sh

# MC Platform v0.3.5 Operations
help-mc: ## Show MC Platform v0.3.5 help
	@echo "MC Platform v0.3.5 Operations"
	@echo "============================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(mc-|v035|tiles|alerts)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

go-live-v035: ## Execute v0.3.5 go-live deployment
	@echo "🚀 Executing MC Platform v0.3.5 go-live..."
	./scripts/execute-v035-go-live.sh

validate-tiles: ## Validate all observability tiles (rules, alerts, dashboards)
	@echo "🔍 Validating observability tiles..."
	@echo "Checking Prometheus recording rules..."
	promtool check rules prom/rules/mc-v035-recording.rules.yaml
	@echo "Checking SLO alert rules..."
	promtool check rules prom/alerts/mc-v035-slo.alerts.yaml
	@echo "Checking burn rate alert rules..."
	promtool check rules prom/alerts/mc-v035-burn.alerts.yaml
	@echo "Validating Grafana dashboard JSON..."
	jq -e . observability/grafana/dashboards/mc-v035-tiles.json >/dev/null
	@echo "✅ All observability tiles validated successfully!"

validate-alerts: validate-tiles ## Alias for validate-tiles
	@echo "✅ Alert validation complete"

deploy-tiles: validate-tiles ## Deploy observability tiles to monitoring stack
	@echo "📊 Deploying observability tiles..."
	@if [ -z "$$PROM_CONFIG_RELOAD_URL" ]; then \
		echo "⚠️  Set PROM_CONFIG_RELOAD_URL to reload Prometheus config"; \
	else \
		echo "Reloading Prometheus configuration..."; \
		curl -X POST "$$PROM_CONFIG_RELOAD_URL"; \
	fi
	@if [ -z "$$GRAFANA_URL" ] || [ -z "$$GRAFANA_TOKEN" ]; then \
		echo "⚠️  Set GRAFANA_URL and GRAFANA_TOKEN to import dashboard"; \
	else \
		echo "Importing Grafana dashboard..."; \
		scripts/import-grafana-dashboard.sh "$$GRAFANA_URL" "$$GRAFANA_TOKEN" \
			< observability/grafana/dashboards/mc-v035-tiles.json; \
	fi
	@echo "✅ Observability tiles deployed!"

mc-status: ## Show MC Platform v0.3.5 operational status
	@echo "📊 MC Platform v0.3.5 Status"
	@echo "============================"
	@if [ -n "$$PROM_URL" ]; then \
		SCORE=$$(curl -s "$$PROM_URL/api/v1/query?query=mc_canary_composite_score" | jq -r '.data.result[0].value[1] // "N/A"'); \
		echo "Canary composite score: $$SCORE"; \
		if [ "$$SCORE" != "N/A" ] && [ "$$(echo "$$SCORE < 0.85" | bc 2>/dev/null || echo 0)" -eq 1 ]; then \
			echo "⚠️  Score below promote threshold (0.85)"; \
		elif [ "$$SCORE" != "N/A" ]; then \
			echo "✅ Score within acceptable range"; \
		fi; \
	else \
		echo "Set PROM_URL to check canary score"; \
	fi
