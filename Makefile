.PHONY: bootstrap up up-ai migrate smoke tools down help preflight intelgraph-test intelgraph-api

# Minimal, portable golden path. No assumptions about project layout.

SHELL := /usr/bin/env bash
NODE_VERSION ?= 18
PY_VERSION ?= 3.11
COMPOSE ?= ./scripts/run-compose.sh
DEV_COMPOSE_FILE ?= docker-compose.dev.yml
AI_COMPOSE_FILE ?= docker-compose.ai.yml
ENV_FILE ?= .env

help:
	@echo "Summit Platform - Developer Commands"
	@echo ""
	@echo "Common workflows:"
	@echo "  make bootstrap    - Install dependencies (Node, Python, .env setup)"
	@echo "  make up           - Start core services (Docker required)"
	@echo "  make up-ai        - Start services with AI capabilities"
	@echo "  make migrate      - Run database migrations (PostgreSQL + Neo4j)"
	@echo "  make smoke        - Run smoke tests (validates golden path)"
	@echo "  make down         - Stop all services"
	@echo ""
	@echo "IntelGraph (minimal decision & claims slice):"
	@echo "  make intelgraph-test  - Run IntelGraph test suite"
	@echo "  make intelgraph-api   - Start IntelGraph API server (port 8000)"
	@echo ""
	@echo "Quick start: ./start.sh (runs bootstrap + up + migrate + smoke)"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Docker Desktop >= 4.x (8GB RAM recommended)"
	@echo "  - Node.js >= 18"
	@echo "  - Python >= 3.11"
	@echo ""
	@echo "Troubleshooting:"
	@echo "  - If 'make up' fails: Check Docker is running (docker info)"
	@echo "  - If 'make migrate' fails: Check PostgreSQL is running (docker-compose ps)"
	@echo "  - If smoke fails: Check logs (docker-compose logs api)"
	@echo "  - For help: See docs/ONBOARDING.md or run ./start.sh --help"

preflight:
	@echo "==> Preflight: Checking prerequisites..."
	@command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker not found. Install from https://docs.docker.com/get-docker/"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon not running. Start Docker Desktop and try again."; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js not found. Install from https://nodejs.org/"; exit 1; }
	@node_ver=$$(node -v | sed 's/v//;s/\..*//' ); \
	  if [ "$$node_ver" -lt "$(NODE_VERSION)" ]; then \
	    echo "ERROR: Node.js $$node_ver found, but >= $(NODE_VERSION) required"; \
	    exit 1; \
	  fi
	@echo "Preflight: OK (Docker running, Node >= $(NODE_VERSION))"

bootstrap: preflight
	@echo "==> bootstrap: node, python, envs"
	@if [ ! -f $(ENV_FILE) ]; then \
	  cp .env.example $(ENV_FILE) && \
	  echo "Created $(ENV_FILE) from .env.example"; \
	  echo "NOTE: For production, update secrets in $(ENV_FILE) before deploying"; \
	fi
	# Node: prefer corepack/pnpm if present, else npm
	@if [ -f package.json ]; then \
	  command -v corepack >/dev/null 2>&1 && corepack enable || true; \
	  echo "Installing Node dependencies..."; \
	  if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile || pnpm install; \
	  elif [ -f package-lock.json ]; then npm ci || npm install; \
	  else npm install || true; fi; \
	fi
	# Python venv + deps
	@if [ -f requirements.txt ] || [ -f pyproject.toml ]; then \
	  echo "Setting up Python virtual environment..."; \
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
	@echo ""
	@echo "bootstrap: DONE ✓"
	@echo "Next steps: 'make up' to start services, then 'make smoke' to validate"

up: preflight
	@echo "==> up: Starting Summit services..."
	@if [ ! -f $(ENV_FILE) ]; then \
	  echo "ERROR: $(ENV_FILE) not found. Run 'make bootstrap' first."; \
	  exit 1; \
	fi
	@if [ -f $(DEV_COMPOSE_FILE) ]; then \
	  echo "Building and starting containers (this may take a few minutes on first run)..."; \
	  $(COMPOSE) -f $(DEV_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans || { \
	    echo ""; \
	    echo "ERROR: Docker Compose failed to start services."; \
	    echo "Troubleshooting:"; \
	    echo "  1. Check Docker Desktop has enough memory (8GB+ recommended)"; \
	    echo "  2. Check port conflicts: docker ps"; \
	    echo "  3. View logs: docker-compose -f $(DEV_COMPOSE_FILE) logs"; \
	    echo "  4. Try: make down && make up"; \
	    exit 1; \
	  }; \
	  echo "Waiting for services to be healthy..."; \
	  ./scripts/wait-for-stack.sh || { \
	    echo ""; \
	    echo "ERROR: Services failed health checks."; \
	    echo "Debug commands:"; \
	    echo "  docker-compose -f $(DEV_COMPOSE_FILE) ps"; \
	    echo "  docker-compose -f $(DEV_COMPOSE_FILE) logs api"; \
	    echo "  curl http://localhost:4000/health/detailed"; \
	    exit 1; \
	  }; \
	  echo "Running database migrations..."; \
	  $(MAKE) migrate; \
	  echo ""; \
	  echo "Services ready! ✓"; \
	  echo "  - API: http://localhost:4000/graphql"; \
	  echo "  - Client: http://localhost:3000"; \
	  echo "  - Metrics: http://localhost:4000/metrics"; \
	  echo "  - Grafana: http://localhost:3001"; \
	  echo ""; \
	  echo "Next step: 'make smoke' to validate the golden path"; \
	else \
	  echo "WARNING: $(DEV_COMPOSE_FILE) not found; skipping"; \
	fi

up-ai: preflight
	@echo "==> up-ai: Starting Summit with AI capabilities..."
	@if [ ! -f $(ENV_FILE) ]; then \
	  echo "ERROR: $(ENV_FILE) not found. Run 'make bootstrap' first."; \
	  exit 1; \
	fi
	@if [ -f $(AI_COMPOSE_FILE) ]; then \
	  echo "NOTE: AI services require significant resources (12GB+ RAM, GPU recommended)"; \
	  echo "Building and starting containers with AI profile..."; \
	  $(COMPOSE) -f $(DEV_COMPOSE_FILE) -f $(AI_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans || { \
	    echo "ERROR: Failed to start AI services. Check Docker memory allocation."; \
	    exit 1; \
	  }; \
	  ./scripts/wait-for-stack.sh; \
	  $(MAKE) migrate; \
	  echo ""; \
	  echo "AI services ready! ✓"; \
	else \
	  echo "WARNING: $(AI_COMPOSE_FILE) not found."; \
	  echo "AI capabilities not available. Running 'make up' instead..."; \
	  $(MAKE) up; \
	fi

migrate:
	@echo "==> migrate: Running database migrations..."
	@if [ ! -f $(ENV_FILE) ]; then \
	  echo "ERROR: $(ENV_FILE) not found. Run 'make bootstrap' first."; \
	  exit 1; \
	fi
	@# Source .env and run migrations
	@set -a; source $(ENV_FILE); set +a; \
	  if [ -f scripts/run-migrations.sh ]; then \
	    ./scripts/run-migrations.sh || { \
	      echo ""; \
	      echo "ERROR: Database migrations failed."; \
	      echo "Troubleshooting:"; \
	      echo "  1. Ensure PostgreSQL is running: docker-compose ps postgres"; \
	      echo "  2. Check PostgreSQL logs: docker-compose logs postgres"; \
	      echo "  3. Verify connection: psql \$$DATABASE_URL -c 'SELECT 1'"; \
	      echo "  4. Check migrations directory: ls -la server/db/migrations/postgres/"; \
	      exit 1; \
	    }; \
	  else \
	    echo "WARNING: scripts/run-migrations.sh not found; skipping migrations"; \
	  fi
	@echo ""
	@echo "migrate: DONE ✓"
	@echo "Database schema is ready for use"

down:
	@echo "==> down: stopping summit stack"
	@if [ -f $(DEV_COMPOSE_FILE) ]; then \
	  $(COMPOSE) -f $(DEV_COMPOSE_FILE) down --remove-orphans || true; \
	fi

smoke:
	@echo "==> smoke: Running golden path validation..."
	@echo ""
	@# Check services are running
	@if ! curl -fsS http://localhost:4000/health >/dev/null 2>&1; then \
	  echo "ERROR: API not responding at http://localhost:4000/health"; \
	  echo "Run 'make up' first to start services."; \
	  exit 1; \
	fi
	@if [ -f package.json ]; then \
	  if command -v pnpm >/dev/null 2>&1; then pnpm smoke; \
	  else npm run smoke; fi || { \
	    echo ""; \
	    echo "ERROR: Smoke tests failed."; \
	    echo "This means the golden path is broken. Fix before continuing development."; \
	    echo ""; \
	    echo "Troubleshooting:"; \
	    echo "  1. Check service logs: docker-compose logs api"; \
	    echo "  2. Check health: curl http://localhost:4000/health/detailed | jq"; \
	    echo "  3. Review test data: cat data/golden-path/demo-investigation.json"; \
	    echo "  4. See docs/ONBOARDING.md for the golden path workflow"; \
	    exit 1; \
	  }; \
	else \
	  echo "WARNING: package.json missing; skipping smoke tests"; \
	fi
	@echo ""
	@echo "smoke: DONE ✓"
	@echo "Golden path validated successfully! You're ready to develop."

intelgraph-test:
	@echo "==> intelgraph-test: Running IntelGraph test suite..."
	@if [ ! -d .venv ]; then \
	  echo "ERROR: Python virtual environment not found. Run 'make bootstrap' first."; \
	  exit 1; \
	fi
	@. .venv/bin/activate && \
	  cd intelgraph && \
	  pip install -q -e ".[dev]" && \
	  cd .. && \
	  pytest tests/intelgraph/ -v --tb=short || { \
	    echo ""; \
	    echo "ERROR: IntelGraph tests failed."; \
	    echo "Check test output above for details."; \
	    exit 1; \
	  }
	@echo ""
	@echo "intelgraph-test: DONE ✓"
	@echo "All IntelGraph tests passed!"

intelgraph-api:
	@echo "==> intelgraph-api: Starting IntelGraph API server..."
	@if [ ! -d .venv ]; then \
	  echo "ERROR: Python virtual environment not found. Run 'make bootstrap' first."; \
	  exit 1; \
	fi
	@echo "Installing IntelGraph dependencies..."
	@. .venv/bin/activate && \
	  cd intelgraph && \
	  pip install -q -e ".[dev]" && \
	  echo "" && \
	  echo "Starting API server on http://localhost:8000" && \
	  echo "  - Interactive docs: http://localhost:8000/docs" && \
	  echo "  - ReDoc: http://localhost:8000/redoc" && \
	  echo "  - Health check: http://localhost:8000/health" && \
	  echo "" && \
	  uvicorn api:app --reload
