.PHONY: bootstrap dev dev-down dev-logs dev-rebuild up up-ai smoke tools down test-ci validate-setup

# Minimal, portable golden path. No assumptions about project layout.

SHELL := /usr/bin/env bash
NODE_VERSION ?= 18
PY_VERSION ?= 3.11
COMPOSE ?= docker compose
DEV_COMPOSE_FILE ?= compose/dev.yml
LEGACY_COMPOSE_FILE ?= docker-compose.dev.yml
AI_COMPOSE_FILE ?= docker-compose.ai.yml
ENV_FILE ?= .env

bootstrap:
	@echo "==> bootstrap: node, python, envs"
	@if [ ! -f $(ENV_FILE) ]; then cp .env.example $(ENV_FILE) && echo "seeded $(ENV_FILE) from .env.example"; fi
	# Node: prefer corepack/pnpm if present, else npm
	@if [ -f package.json ]; then \
	  command -v corepack >/dev/null 2>&1 && corepack enable || true; \
	  if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile || pnpm install; \
	  elif [ -f package-lock.json ]; then npm ci || npm install; \
	  else npm install || true; fi; \
	fi
	# Python venv + deps
	@if [ -f requirements.txt ] || [ -f pyproject.toml ]; then \
	  python$(PY_VERSION) -m venv .venv 2>/dev/null || python3 -m venv .venv; \
	  . .venv/bin/activate; python -m pip install -U pip wheel; \
	  if [ -f requirements.txt ]; then pip install -r requirements.txt || true; fi; \
	  if [ -f pyproject.toml ]; then pip install -e . || pip install . || true; fi; \
	  pip install ruamel.yaml==0.18.* pip-audit==2.* || true; \
	fi
	# Dev tooling fallbacks (no yq/gsed reliance)
	@mkdir -p scripts/tools
	@printf '%s\n' '#!/usr/bin/env python3' \
	'from ruamel.yaml import YAML; import sys,json' \
	'y=YAML(); doc=y.load(sys.stdin.read()); print(json.dumps(doc))' > scripts/tools/yq_json.py
	@chmod +x scripts/tools/yq_json.py
	@echo "bootstrap: DONE"

dev:
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║  Starting IntelGraph Platform Development Environment     ║"
	@echo "╚════════════════════════════════════════════════════════════╝"
	@echo ""
	@if [ ! -f $(ENV_FILE) ]; then \
	  echo "⚠️  No .env file found. Creating from .env.example..."; \
	  cp .env.example $(ENV_FILE); \
	  echo "✓ Created $(ENV_FILE) - please review and update passwords"; \
	  echo ""; \
	fi
	@echo "Starting services (this may take up to 5 minutes on first run)..."
	@$(COMPOSE) -f $(DEV_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans
	@echo ""
	@echo "Waiting for services to become healthy..."
	@if [ -f ./scripts/wait-for-stack.sh ]; then \
	  ./scripts/wait-for-stack.sh; \
	else \
	  sleep 30; \
	fi
	@echo ""
	@echo "✓ Development environment ready!"
	@echo ""
	@echo "═══════════════════════════════════════════════════════════"
	@echo "Available Services:"
	@echo "═══════════════════════════════════════════════════════════"
	@echo "  📱 Web UI:          http://localhost:3000"
	@echo "  🔌 API (GraphQL):   http://localhost:4000/graphql"
	@echo "  ⚙️  Worker Health:   http://localhost:4100/health"
	@echo "  🎭 Mock Services:   http://localhost:4010"
	@echo ""
	@echo "Databases:"
	@echo "  🐘 PostgreSQL:      localhost:5432 (summit/dev_password)"
	@echo "  📊 Neo4j Browser:   http://localhost:7474 (neo4j/dev_password)"
	@echo "  🔴 Redis:           localhost:6379"
	@echo ""
	@echo "Observability:"
	@echo "  📈 Grafana:         http://localhost:8080 (admin/dev_password)"
	@echo "  📊 Prometheus:      http://localhost:9090"
	@echo "  🔍 Jaeger:          http://localhost:16686"
	@echo "  🔐 OPA:             http://localhost:8181"
	@echo ""
	@echo "Management:"
	@echo "  📋 View Logs:       make dev-logs"
	@echo "  🛑 Stop Stack:      make dev-down"
	@echo "  🔄 Rebuild:         make dev-rebuild"
	@echo "═══════════════════════════════════════════════════════════"

dev-down:
	@echo "Stopping development stack..."
	@$(COMPOSE) -f $(DEV_COMPOSE_FILE) down --remove-orphans
	@echo "✓ Development stack stopped"

dev-logs:
	@$(COMPOSE) -f $(DEV_COMPOSE_FILE) logs -f --tail=100

dev-rebuild:
	@echo "Rebuilding development stack (this will remove volumes)..."
	@$(COMPOSE) -f $(DEV_COMPOSE_FILE) down -v --remove-orphans
	@$(COMPOSE) -f $(DEV_COMPOSE_FILE) up -d --build
	@echo "✓ Development stack rebuilt"

up:
	@echo "==> up: best-effort bring-up (legacy compose file)"
	@if [ -f $(LEGACY_COMPOSE_FILE) ]; then \
	  $(COMPOSE) -f $(LEGACY_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans; \
	  if [ -f ./scripts/wait-for-stack.sh ]; then ./scripts/wait-for-stack.sh; fi; \
	else \
	  echo "no legacy compose file; using new dev stack"; \
	  $(MAKE) dev; \
	fi

up-ai:
	@echo "==> up (AI profile)"
	@if [ -f $(AI_COMPOSE_FILE) ]; then \
	  $(COMPOSE) -f $(DEV_COMPOSE_FILE) -f $(AI_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans; \
	  ./scripts/wait-for-stack.sh; \
	else \
	  echo "$(AI_COMPOSE_FILE) missing; run make up instead"; \
	fi

down:
	@echo "==> down: stopping summit stack"
	@if [ -f $(DEV_COMPOSE_FILE) ]; then \
	  $(COMPOSE) -f $(DEV_COMPOSE_FILE) down --remove-orphans || true; \
	fi

smoke:
	@echo "==> smoke: lightweight sanity checks"
	@if [ -f package.json ]; then \
	  if command -v pnpm >/dev/null 2>&1; then pnpm smoke; \
	  else npm run smoke; fi; \
	else \
	  echo "package.json missing; skipping JS smoke"; \
	fi
	@echo "smoke: DONE"

test-ci:
	@echo "==> Running CI test suite (lint + typecheck + tests)..."
	@if command -v pnpm >/dev/null 2>&1; then \
	  pnpm run ci; \
	else \
	  npm run ci; \
	fi
	@echo "✓ CI tests complete"

validate-setup:
	@echo "==> Validating monorepo setup..."
	@if [ -f scripts/audit-monorepo.js ]; then \
	  node scripts/audit-monorepo.js; \
	else \
	  echo "⚠️  Audit script not found. Run: npm install"; \
	fi
