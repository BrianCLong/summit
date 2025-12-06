# ---- IntelGraph S25 Merge Orchestrator ---------------------------------------
# Usage:
#   make merge-s25          # end-to-end (idempotent)
#   make merge-s25.resume   # resume from saved state
#   make merge-s25.clean    # delete temp branches/state
#   make pr-release         # force (re)open final release PR only
# ------------------------------------------------------------------------------

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

.PHONY: merge-s25 merge-s25.resume merge-s25.clean pr-release sbom provenance ci-check prereqs contracts policy-sim rerere dupescans

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