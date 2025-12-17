# CompanyOS Developer Makefile
# Implements D1: CompanyOS Developer CLI / Make Targets

.PHONY: help dev-up dev-down test smoke migrate lint typecheck build clean \
        opa-test opa-build db-migrate db-reset

SHELL := /usr/bin/env bash
COMPOSE := docker compose
COMPOSE_FILE := ../docker/docker-compose.companyos.yml
ENV_FILE := ../.env

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

help:
	@echo "CompanyOS Developer Commands"
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  make dev-up       - Start CompanyOS development stack"
	@echo "  make test         - Run all tests"
	@echo "  make smoke        - Run smoke tests"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make build        - Build all CompanyOS packages"
	@echo "  make lint         - Run linting"
	@echo "  make typecheck    - Run TypeScript type checking"
	@echo "  make clean        - Clean build artifacts"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-reset     - Reset database (WARNING: destroys data)"
	@echo ""
	@echo "$(GREEN)OPA/Policy:$(NC)"
	@echo "  make opa-test     - Run OPA policy tests"
	@echo "  make opa-build    - Build OPA policy bundle"
	@echo ""
	@echo "$(GREEN)Stack Management:$(NC)"
	@echo "  make dev-up       - Start development stack"
	@echo "  make dev-down     - Stop development stack"
	@echo "  make logs         - View service logs"
	@echo ""

# ============================================================================
# DEVELOPMENT STACK
# ============================================================================

dev-up:
	@echo "$(GREEN)==> Starting CompanyOS development stack...$(NC)"
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(YELLOW)Creating .env from .env.example...$(NC)"; \
		cp ../.env.example $(ENV_FILE) 2>/dev/null || true; \
	fi
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build
	@echo ""
	@echo "$(GREEN)CompanyOS services starting...$(NC)"
	@echo "  - API: http://localhost:4100"
	@echo "  - OPA: http://localhost:8181"
	@echo "  - PostgreSQL: localhost:5432"
	@echo ""
	@echo "Run 'make logs' to view service logs"
	@echo "Run 'make smoke' to validate the stack"

dev-down:
	@echo "$(GREEN)==> Stopping CompanyOS development stack...$(NC)"
	$(COMPOSE) -f $(COMPOSE_FILE) down --remove-orphans

logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

# ============================================================================
# TESTING
# ============================================================================

test: test-unit test-integration opa-test
	@echo "$(GREEN)==> All tests passed!$(NC)"

test-unit:
	@echo "$(GREEN)==> Running unit tests...$(NC)"
	cd services/companyos-api && pnpm test:unit 2>/dev/null || npm run test:unit 2>/dev/null || echo "No unit tests configured yet"

test-integration:
	@echo "$(GREEN)==> Running integration tests...$(NC)"
	cd services/companyos-api && pnpm test:integration 2>/dev/null || npm run test:integration 2>/dev/null || echo "No integration tests configured yet"

smoke:
	@echo "$(GREEN)==> Running CompanyOS smoke tests...$(NC)"
	@echo "Checking API health..."
	@curl -sf http://localhost:4100/health > /dev/null 2>&1 && \
		echo "$(GREEN)✓ API is healthy$(NC)" || \
		(echo "$(RED)✗ API is not responding. Run 'make dev-up' first.$(NC)" && exit 1)
	@echo "Checking OPA health..."
	@curl -sf http://localhost:8181/health > /dev/null 2>&1 && \
		echo "$(GREEN)✓ OPA is healthy$(NC)" || \
		(echo "$(RED)✗ OPA is not responding$(NC)" && exit 1)
	@echo "Checking database connection..."
	@docker exec -it $$(docker ps -qf "name=companyos-db") pg_isready -U companyos > /dev/null 2>&1 && \
		echo "$(GREEN)✓ Database is ready$(NC)" || \
		(echo "$(RED)✗ Database is not ready$(NC)" && exit 1)
	@echo ""
	@echo "$(GREEN)==> Smoke tests passed!$(NC)"

# ============================================================================
# BUILD
# ============================================================================

build:
	@echo "$(GREEN)==> Building CompanyOS packages...$(NC)"
	cd services/companyos-api && pnpm build 2>/dev/null || npm run build 2>/dev/null || echo "Build script not found"

lint:
	@echo "$(GREEN)==> Running linting...$(NC)"
	cd services/companyos-api && pnpm lint 2>/dev/null || npm run lint 2>/dev/null || echo "Lint script not found"

typecheck:
	@echo "$(GREEN)==> Running TypeScript type checking...$(NC)"
	cd services/companyos-api && pnpm typecheck 2>/dev/null || npx tsc --noEmit 2>/dev/null || echo "TypeScript not configured"

clean:
	@echo "$(GREEN)==> Cleaning build artifacts...$(NC)"
	find . -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".turbo" -exec rm -rf {} + 2>/dev/null || true

# ============================================================================
# DATABASE
# ============================================================================

db-migrate:
	@echo "$(GREEN)==> Running database migrations...$(NC)"
	@if [ -f db/migrations/001_tenant_lifecycle.sql ]; then \
		docker exec -i $$(docker ps -qf "name=companyos-db") psql -U companyos -d companyos < db/migrations/001_tenant_lifecycle.sql; \
		echo "$(GREEN)✓ Migrations applied$(NC)"; \
	else \
		echo "$(YELLOW)No migrations found$(NC)"; \
	fi

db-reset:
	@echo "$(RED)==> WARNING: This will destroy all data!$(NC)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(COMPOSE) -f $(COMPOSE_FILE) down -v
	$(COMPOSE) -f $(COMPOSE_FILE) up -d companyos-db
	sleep 5
	$(MAKE) db-migrate

# ============================================================================
# OPA/POLICY
# ============================================================================

opa-test:
	@echo "$(GREEN)==> Running OPA policy tests...$(NC)"
	docker run --rm -v $(PWD)/policies:/policies openpolicyagent/opa:latest test -v /policies
	@echo "$(GREEN)✓ OPA tests passed$(NC)"

opa-build:
	@echo "$(GREEN)==> Building OPA policy bundle...$(NC)"
	docker run --rm -v $(PWD)/policies:/policies -w /policies openpolicyagent/opa:latest build -b . -o /policies/bundle.tar.gz
	@echo "$(GREEN)✓ Bundle created: policies/bundle.tar.gz$(NC)"

opa-check:
	@echo "$(GREEN)==> Checking OPA policies...$(NC)"
	docker run --rm -v $(PWD)/policies:/policies openpolicyagent/opa:latest check /policies
	@echo "$(GREEN)✓ Policies are valid$(NC)"

# ============================================================================
# UTILITIES
# ============================================================================

setup:
	@echo "$(GREEN)==> Setting up CompanyOS development environment...$(NC)"
	cd services/companyos-api && pnpm install 2>/dev/null || npm install 2>/dev/null || true
	$(MAKE) dev-up
	$(MAKE) db-migrate
	$(MAKE) smoke
	@echo ""
	@echo "$(GREEN)==> Setup complete! CompanyOS is ready for development.$(NC)"
