# Summit Platform Makefile
# Standardized commands for Development and Operations

.PHONY: up down restart logs shell clean
.PHONY: dev test lint build
.PHONY: db-migrate db-seed
.PHONY: merge-s25 merge-s25.resume merge-s25.clean pr-release sbom provenance ci-check prereqs contracts policy-sim rerere dupescans

# --- Docker Compose Controls ---

up:
	@echo "Starting development environment..."
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

down:
	@echo "Stopping development environment..."
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

restart: down up

logs:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

shell:
	@echo "Opening shell in server container..."
	docker compose -f docker-compose.yml -f docker-compose.dev.yml exec server /bin/bash

clean:
	@echo "Cleaning artifacts and stopped containers..."
	docker system prune -f
	rm -rf dist build coverage
	# Merge clean
	@echo "Cleaning merge state..."
	@rm -rf "$(STATE_DIR)"
	@git branch -D tmp/pr-* 2>/dev/null || true

# --- Development Workflow ---

dev:
	@echo "Starting local dev server (host mode)..."
	npm run dev

test:
	@echo "Running tests..."
	npm run test

lint:
	@echo "Linting code..."
	npm run lint

build:
	@echo "Building application..."
	npm run build

# --- Database ---

db-migrate:
	@echo "Running DB migrations..."
	npm run db:migrate

db-seed:
	@echo "Seeding DB..."
	npm run seed

# ---- IntelGraph S25 Merge Orchestrator (Legacy/Specific) ---------------------

SHELL := /usr/bin/env bash
.ONESHELL:
.SHELLFLAGS := -eo pipefail -c
MAKEFLAGS += --no-builtin-rules

# Config (override via env)
REPO              ?= BrianCLong/summit
BASE_BRANCH       ?= main
CONSOLIDATION     ?= feature/merge-closed-prs-s25
STACK_ARTIFACTS   ?= stack/artifacts-pack-v1
STACK_SERVER      ?= stack/express5-eslint9
STACK_CLIENT      ?= stack/client-vite7-leaflet5
STACK_REBRAND     ?= stack/rebrand-docs
PR_TARGETS        ?= 1279 1261 1260 1259
STATE_DIR         ?= .merge-evidence
STATE_FILE        ?= $(STATE_DIR)/state.json
NODE_VERSION      ?= 20

merge-s25: prereqs
	@./scripts/merge_s25.sh \
	  --repo "$(REPO)" \
	  --base "$(BASE_BRANCH)" \
	  --branch "$(CONSOLIDATION)" \
	  --prs "$(PR_TARGETS)" \
	  --state "$(STATE_FILE)" \
	  --node "$(NODE_VERSION)"

merge-s25.resume: prereqs
	@./scripts/merge_s25.sh \
	  --repo "$(REPO)" \
	  --base "$(BASE_BRANCH)" \
	  --branch "$(CONSOLIDATION)" \
	  --prs "$(PR_TARGETS)" \
	  --state "$(STATE_FILE)" \
	  --resume \
	  --node "$(NODE_VERSION)"

merge-s25.clean: clean

pr-release:
	@./scripts/merge_s25.sh \
	  --repo "$(REPO)" \
	  --base "$(BASE_BRANCH)" \
	  --branch "$(CONSOLIDATION)" \
	  --open-release-only \
	  --state "$(STATE_FILE)" \
	  --node "$(NODE_VERSION)"

sbom:
	@pnpm cyclonedx-npm --output-format JSON --output-file sbom.json

provenance:
	@node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json

ci-check:
	@pnpm install --frozen-lockfile
	@pnpm lint
	@pnpm test -- --ci --reporters=default --reporters=jest-junit
	@pnpm -r build
	@pnpm playwright install --with-deps
	@pnpm e2e

contracts:
	@pnpm jest contracts/graphql/__tests__/schema.contract.ts --runInBand

policy-sim:
	@curl -sL -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64 && chmod +x ./opa
	@./opa test policies/ -v

rerere:
	@bash scripts/enable_rerere.sh

dupescans:
	@bash scripts/check_dupe_patches.sh $(BASE_BRANCH) $(CONSOLIDATION)

prereqs:
	@command -v git >/dev/null 2>&1 || { echo "git not found"; exit 1; }
	@command -v gh  >/dev/null 2>&1 || { echo "gh (GitHub CLI) not found"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "pnpm not found"; exit 1; }
	@node -v | grep -q "v$(NODE_VERSION)" || echo "WARN: Node version differs from $(NODE_VERSION)"
	@mkdir -p "$(STATE_DIR)"
