SHELL := /bin/bash
PY := python3

.PHONY: bootstrap up down logs ps server client ingest graph smoke clean reset-db ingest-assets

bootstrap: ; @test -f .env || cp .env.example .env; echo "✅ .env ready. Next: make up"
up: ; docker compose up -d --build
down: ; docker compose down
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



sprint23:
	npm test
	npm run lint --if-present
	echo "gh project create 'Sprint 23 (Marketplace GA, BYOK, Gossip)'"
	echo "gh issue import -F project_management/sprint23_issues.csv"

ingest-assets:
	@if [ -z "$(path)" ]; then echo "path=<csv> required"; exit 1; fi; \
	if [ -z "$(org)" ]; then echo "org=<ORG> required"; exit 1; fi; \
	$(PY) data-pipelines/universal-ingest/assets_csv.py $(path) --org $(org)
