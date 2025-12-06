.PHONY: bootstrap up up-ai migrate smoke tools down help preflight dev test-e2e down-dev

# Minimal, portable golden path.
# Wraps canonical scripts in scripts/ directory.

SHELL := /usr/bin/env bash
NODE_VERSION ?= 18
PY_VERSION ?= 3.11
COMPOSE ?= ./scripts/run-compose.sh
DEV_COMPOSE_FILE ?= docker-compose.dev.yml
MVP2_COMPOSE_FILE ?= deploy/compose/docker-compose.mvp2.yml
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
	@echo "Quick start: ./scripts/start.sh"
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
	@echo "  - For help: See docs/dev/DEPLOYMENT_GOLDEN_PATH.md"

preflight:
	@# Preflight is now handled inside scripts/bootstrap.sh and scripts/start.sh
	@echo "Preflight checks delegated to scripts."

bootstrap:
	@./scripts/bootstrap.sh

up:
	@./scripts/start.sh

up-ai: preflight
	@echo "==> up-ai: Starting Summit with AI capabilities..."
	@if [ ! -f $(ENV_FILE) ]; then \
	  echo "ERROR: $(ENV_FILE) not found. Run 'make bootstrap' first."; \
	  exit 1; \
	fi
	@if [ -f $(AI_COMPOSE_FILE) ]; then \
	  echo "NOTE: AI services require significant resources (12GB+ RAM, GPU recommended)"; \
	  echo "Building and starting containers with AI profile..."; \
	  docker-compose -f $(DEV_COMPOSE_FILE) -f $(AI_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans || { \
	    echo "ERROR: Failed to start AI services. Check Docker memory allocation."; \
	    exit 1; \
	  }; \
	  ./scripts/healthcheck.sh; \
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
	      exit 1; \
	    }; \
	  else \
	    echo "WARNING: scripts/run-migrations.sh not found; skipping migrations"; \
	  fi
	@echo ""
	@echo "migrate: DONE ✓"

down:
	@./scripts/teardown.sh

smoke:
	@echo "==> smoke: Running golden path validation..."
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
	    exit 1; \
	  }; \
	else \
	  echo "WARNING: package.json missing; skipping smoke tests"; \
	fi
	@echo ""
	@echo "smoke: DONE ✓"

dev:
	@echo "==> dev: Using legacy dev target (MVP.2)..."
	@echo "Warning: This target might be deprecated in favor of 'make up'."
	@if [ ! -f $(ENV_FILE) ]; then \
	  echo "ERROR: $(ENV_FILE) not found. Run 'make bootstrap' first."; \
	  exit 1; \
	fi
	@if [ -f $(MVP2_COMPOSE_FILE) ]; then \
	  docker-compose -f $(MVP2_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans; \
	  ./scripts/healthcheck.sh; \
	else \
	  echo "WARNING: $(MVP2_COMPOSE_FILE) not found."; \
	fi

down-dev:
	@if [ -f $(MVP2_COMPOSE_FILE) ]; then \
	  docker-compose -f $(MVP2_COMPOSE_FILE) down --remove-orphans || true; \
	fi

test-e2e:
	@echo "Delegate to test scripts if available..."
	@npm run test:e2e

test-opa:
	@echo "==> test-opa: Running OPA tests..."
	@docker run --rm -v $(pwd):/workspace -w /workspace openpolicyagent/opa:latest test -v policies/mvp2
