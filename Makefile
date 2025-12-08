# ---- Summit Platform Makefile ------------------------------------------------
# Usage:
#   make dev                # Start local development environment
#   make dev-clean          # Clean local development environment
#   make deploy-staging     # Deploy to staging (manual trigger wrapper)
#   make merge-s25          # Legacy merge script
# ------------------------------------------------------------------------------

SHELL := /usr/bin/env bash
.ONESHELL:
.SHELLFLAGS := -eo pipefail -c
MAKEFLAGS += --no-builtin-rules

# Config (override via env)
REPO              ?= BrianCLong/summit
BASE_BRANCH       ?= main
CONSOLIDATION     ?= feature/merge-closed-prs-s25
PR_TARGETS        ?= 1279 1261 1260 1259
STATE_DIR         ?= .merge-evidence
STATE_FILE        ?= $(STATE_DIR)/state.json
NODE_VERSION      ?= 20

# ---- Local Development -------------------------------------------------------

.PHONY: dev dev-clean dev-logs dev-shell

dev:
	@echo "Starting local development environment..."
	@docker compose up -d
	@echo "Services started. UI: http://localhost:3000, API: http://localhost:8080"

dev-clean:
	@echo "Stopping and cleaning local environment..."
	@docker compose down -v --remove-orphans

dev-logs:
	@docker compose logs -f

dev-shell:
	@echo "Opening shell in server container..."
	@docker compose exec server sh

# ---- CI/CD & Compliance ------------------------------------------------------

.PHONY: sbom provenance ci-check

sbom:
	@pnpm cyclonedx-npm --output-format JSON --output-file sbom.json

provenance:
	@node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json

ci-check:
	@pnpm install --frozen-lockfile
	@pnpm lint
	@pnpm test -- --ci --reporters=default --reporters=jest-junit
	@pnpm -r build

# ---- Legacy / Merge Scripts --------------------------------------------------

.PHONY: merge-s25 merge-s25.resume merge-s25.clean pr-release contracts policy-sim rerere dupescans prereqs

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

merge-s25.clean:
	@echo "Cleaning state and temp branches…"
	@rm -rf "$(STATE_DIR)"
	@git branch -D tmp/pr-* 2>/dev/null || true

pr-release:
	@./scripts/merge_s25.sh \
	  --repo "$(REPO)" \
	  --base "$(BASE_BRANCH)" \
	  --branch "$(CONSOLIDATION)" \
	  --open-release-only \
	  --state "$(STATE_FILE)" \
	  --node "$(NODE_VERSION)"

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
