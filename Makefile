# Summit Platform Makefile
# Standardized commands for Development and Operations

SHELL := /bin/bash
DEV_COMPOSE ?= docker-compose.dev.yaml

.PHONY: up down restart logs shell clean
.PHONY: dev test lint build format sbom k6
.PHONY: db-migrate db-seed
.PHONY: merge-s25 merge-s25.resume merge-s25.clean pr-release sbom provenance ci-check prereqs contracts policy-sim rerere dupescans

# --- Docker Compose Controls ---

up:
	docker compose -f $(DEV_COMPOSE) up --build -d

down:
	docker compose -f $(DEV_COMPOSE) down -v

restart: down up

logs:
	docker compose -f $(DEV_COMPOSE) logs -f

shell:
	docker compose -f $(DEV_COMPOSE) exec gateway /bin/sh

clean:
	docker system prune -f
	rm -rf dist build coverage
	# Merge clean
	@echo "Cleaning merge state..."
	@rm -rf "$(STATE_DIR)"
	@git branch -D tmp/pr-* 2>/dev/null || true

# --- Development Workflow ---

dev:
	pnpm dev

test:
	pnpm -w run test:unit || true && pytest -q || true

lint:
	pnpm -w exec eslint . || true

build:
	docker compose -f $(DEV_COMPOSE) build

format:
	pnpm -w exec prettier -w . || true

sbom:
	pnpm dlx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json

k6:
	./ops/k6/smoke.sh

# --- Database ---

db-migrate:
	pnpm run db:migrate

db-seed:
	pnpm run db:seed

# ---- IntelGraph S25 Merge Orchestrator (Legacy/Specific) ---------------------

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
