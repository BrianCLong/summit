# ==============================================================================
#  Makefile for the Summit Platform
#
# Canonical entry point for all development, testing, and operational tasks.
# This Makefile is self-documenting. Run 'make help' for a list of commands.
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
SHELL := /usr/bin/env bash
COMPOSE_DEV_FILE := docker-compose.dev.yml
ENV_FILE := .env

# Use pnpm if available, otherwise fall back to npm
PNPM := $(shell command -v pnpm 2> /dev/null)
NPM := $(shell command -v npm 2> /dev/null)

# Self-documenting help target
.DEFAULT_GOAL := help
.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ==============================================================================
# Canonical Developer Commands
# ==============================================================================
.PHONY: dev-setup dev-run dev-test dev-lint dev-security-scan dev-test-watch dev-lint-fix

dev-setup: bootstrap ## 🚀 (First Time) Install all dependencies and configure the environment.
dev-run: up          ## 🟢 Start all core services in detached mode.
dev-test: test       ## 🧪 Run the complete test suite (unit, integration, etc.).
dev-lint: lint       ## 🧹 Run linting and formatting checks.

dev-security-scan:   ## 🛡️ Run a local security scan for known vulnerabilities.
	@echo "==> Scanning for vulnerabilities..."
	@if [ -n "$(PNPM)" ]; then \
		$(PNPM) audit; \
	else \
		$(NPM) audit; \
	fi
	@echo "==> Security scan complete."

dev-test-watch:      ## 👀 Run the test suite in watch mode for continuous feedback.
	@echo "==> Running tests in watch mode..."
	@if [ -n "$(PNPM)" ]; then \
		$(PNPM) test --watch; \
	else \
		$(NPM) run test:watch; \
	fi

dev-lint-fix:        ## 🪄 Automatically fix all linting and formatting issues.
	@echo "==> Fixing lint and format issues..."
	@if [ -n "$(PNPM)" ]; then \
		$(PNPM) run lint:fix; \
		$(PNPM) run format; \
	else \
		$(NPM) run lint:fix; \
		$(NPM) run format; \
	fi
	@echo "==> Lint and format fix complete."

# ==============================================================================
# Core Lifecycle & Aliases
# ==============================================================================
.PHONY: bootstrap up down test lint smoke migrate

bootstrap: ## (Alias for dev-setup) Install dependencies.
	@echo "==> Bootstrapping environment..."
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example $(ENV_FILE); \
	fi
	@echo "Installing dependencies..."
	@if [ -n "$(PNPM)" ]; then \
		corepack enable && $(PNPM) install --frozen-lockfile; \
	else \
		$(NPM) install; \
	fi
	@echo "==> Bootstrap complete."

up: ## (Alias for dev-run) Start all services.
	@echo "==> Starting Summit stack..."
	@docker-compose -f $(COMPOSE_DEV_FILE) up -d --build --remove-orphans
	@echo "==> Waiting for services to be healthy..."
	@./scripts/wait-for-stack.sh
	@make migrate
	@echo "==> Summit stack is up and running."

down: ## ⏹️ Stop and remove all running services.
	@echo "==> Stopping Summit stack..."
	@docker-compose -f $(COMPOSE_DEV_FILE) down --remove-orphans
	@echo "==> Summit stack stopped."

test: ## (Alias for dev-test) Run test suite.
	@echo "==> Running test suite..."
	@if [ -n "$(PNPM)" ]; then \
		$(PNPM) test; \
	else \
		$(NPM) test; \
	fi

lint: ## (Alias for dev-lint) Run linters.
	@echo "==> Running linters..."
	@if [ -n "$(PNPM)" ]; then \
		$(PNPM) lint; \
	else \
		$(NPM) run lint; \
	fi

smoke: ## 💨 Run the golden path smoke tests to validate core functionality.
	@echo "==> Running smoke tests..."
	@if [ -n "$(PNPM)" ]; then \
		$(PNPM) run smoke; \
	else \
		$(NPM) run smoke; \
	fi
	@echo "==> Smoke tests complete."

migrate: ## 🗄️ Run database migrations.
	@echo "==> Running database migrations..."
	@docker-compose -f $(COMPOSE_DEV_FILE) exec -T api pnpm db:migrate
	@echo "==> Migrations complete."

# ==============================================================================
# Utilities
# ==============================================================================
.PHONY: logs clean

logs: ## 📜 Tail the logs of all running services.
	@echo "==> Tailing logs..."
	@docker-compose -f $(COMPOSE_DEV_FILE) logs -f

clean: ## 🗑️ Remove all build artifacts and node_modules.
	@echo "==> Cleaning project..."
	@rm -rf node_modules apps/*/node_modules services/*/node_modules packages/*/node_modules .turbo coverage
	@echo "==> Clean complete."
