SHELL := /bin/bash
PY := python3

.PHONY: bootstrap up down logs ps server client ingest graph smoke clean reset-db

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


.PHONY: sprint13 lts-1_0_1

sprint13:
	@npm run lint && npm test && echo "gh project create 'Sprint 13 (Onboarding, Billing, Plugins)'" && echo "gh issue import -f project_management/sprint13_issues.csv"

lts-1_0_1:
	@echo "building 1.0.1" && echo "gh release create v1.0.1 dist/*.tgz"
