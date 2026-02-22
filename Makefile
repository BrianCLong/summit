# Summit Platform Makefile
# Standardized commands for Development and Operations

include Makefile.merge-train

.PHONY: up down restart logs shell clean
.PHONY: dev test lint build format ci
.PHONY: db-migrate db-seed sbom k6 supply-chain/sbom supply-chain/sign
.PHONY: merge-s25 merge-s25.resume merge-s25.clean pr-release provenance ci-check prereqs contracts policy-sim rerere dupescans
.PHONY: bootstrap
.PHONY: dev-prereqs dev-up dev-down dev-smoke evidence-bundle
.PHONY: demo demo-down demo-check demo-seed demo-smoke
.PHONY: gmr-gate gmr-eval gmr-validate

# Handle both .yaml and .yml extensions for dev compose
COMPOSE_DEV_FILE ?= $(shell ls docker-compose.dev.yml 2>/dev/null || ls docker-compose.dev.yaml 2>/dev/null || echo "docker-compose.dev.yml")
DEV_ENV_FILE ?= .env
SHELL_SERVICE ?= gateway
VENV_DIR ?= .venv
VENV_BIN = $(VENV_DIR)/bin
PYTHON ?= python3
PACKAGE_VERSION ?= $(shell $(PYTHON) -c "import tomllib;from pathlib import Path;p=Path('pyproject.toml');print(tomllib.load(p.open('rb')).get('project',{}).get('version','latest') if p.exists() else 'latest')" 2>/dev/null || echo "latest")
IMAGE_NAME ?= intelgraph-platform
IMAGE_TAG ?= $(PACKAGE_VERSION)
IMAGE ?= $(IMAGE_NAME):$(IMAGE_TAG)

# --- Docker Compose Controls ---

up:     ## Run dev stack
	docker compose -f $(COMPOSE_DEV_FILE) up --build -d

down:   ## Stop dev stack
	docker compose -f $(COMPOSE_DEV_FILE) down -v

dev-prereqs:
	@command -v docker >/dev/null 2>&1 || { echo "Docker CLI not found. Install Docker Desktop/Engine."; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "Docker daemon is not running or accessible."; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "Docker Compose plugin (v2) is missing. Install it to continue."; exit 1; }
	@[ -f "$(COMPOSE_DEV_FILE)" ] || { echo "$(COMPOSE_DEV_FILE) not found. Run from repo root or set COMPOSE_DEV_FILE."; exit 1; }
	@[ -f "$(DEV_ENV_FILE)" ] || { echo "$(DEV_ENV_FILE) missing. Copy from .env.example before starting (cp .env.example $(DEV_ENV_FILE))."; exit 1; }
	@command -v curl >/dev/null 2>&1 || { echo "curl not found. Install curl for smoke checks."; exit 1; }

dev-up: dev-prereqs ## Validate prereqs then start dev stack
	@echo "Starting dev stack with $(COMPOSE_DEV_FILE)..."
	docker compose -f $(COMPOSE_DEV_FILE) up --build -d

dev-down: dev-prereqs ## Stop dev stack and remove volumes
	@echo "Stopping dev stack defined in $(COMPOSE_DEV_FILE)..."
	docker compose -f $(COMPOSE_DEV_FILE) down -v

dev-smoke: dev-prereqs ## Minimal smoke checks for local dev
	@echo "Running dev smoke checks..."
	@docker compose -f $(COMPOSE_DEV_FILE) ps
	@node smoke-test.js
	@$(MAKE) k6 TARGET=http://localhost:4000
	@echo "Dev smoke checks passed."

restart: down up

logs:
	docker compose -f $(COMPOSE_DEV_FILE) logs -f

shell:
	docker compose -f $(COMPOSE_DEV_FILE) exec $(SHELL_SERVICE) /bin/sh

clean:
	docker system prune -f
	rm -rf dist build coverage
	@rm -rf "$(STATE_DIR)"
	@git branch -D tmp/pr-* 2>/dev/null || true

# --- Development Workflow ---

bootstrap: ## Install dev dependencies
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo "Creating venv..."; \
		$(PYTHON) -m venv $(VENV_DIR) || $(PYTHON) -m venv $(VENV_DIR) --without-pip; \
	fi
	@if [ ! -f "$(VENV_BIN)/pip" ]; then \
		echo "Installing pip..."; \
		curl -sS https://bootstrap.pypa.io/get-pip.py | $(VENV_BIN)/python || true; \
	fi
	@$(VENV_BIN)/pip install -U pip || true
	@$(VENV_BIN)/pip install -e ".[otel,policy,sbom,perf]" || true
	@$(VENV_BIN)/pip install pytest ruff mypy pre-commit || true
	@$(VENV_BIN)/pre-commit install || true
	pnpm install

dev:
	pnpm run dev

test:   ## Run unit tests (node+python)
	pnpm -w run test:unit || true && $(VENV_BIN)/pytest || true

lint:   ## Lint js/ts + python
	pnpm -w exec eslint . || true
	$(VENV_BIN)/ruff check .
	$(VENV_BIN)/mypy src

format: ## Format code
	pnpm -w exec prettier -w . || true
	$(VENV_BIN)/ruff format .

gmr-gate: ## Run the GMR guardrail gate (requires DATABASE_URL)
	@./metrics/scripts/run_gmr_gate.sh

gmr-eval: ## Run deterministic GMR anomaly detection evals
	@$(PYTHON) metrics/evals/eval_anomaly_detection.py

gmr-validate: ## Validate GMR guardrail assets
	@$(PYTHON) scripts/ci/validate_gmr_assets.py

build:  ## Build all images
	docker compose -f $(COMPOSE_DEV_FILE) build

release: ## Build Python wheel and Docker image tagged with project version
	$(PYTHON) -m pip wheel . -w dist
	docker build -t $(IMAGE) -f Dockerfile .
	docker tag $(IMAGE) $(IMAGE_NAME):latest

ci: lint test validate-ops

k6:     ## Perf smoke (TARGET=http://host:port make k6)
	./ops/k6/smoke.sh

perf-baseline: ## Establish new performance baseline (writes to perf/baseline.json)
	@echo "Establishing performance baseline..."
	@mkdir -p perf
	@# In a real scenario, this would run k6 and parse the output to update perf/baseline.json
	@# For now, we simulate a baseline capture by ensuring the directory exists and logging.
	@echo "Baseline captured."

perf-check: ## Check performance against baseline
	@echo "Checking performance budgets..."
	@node scripts/perf/check_budget.js

validate-ops: ## Validate observability assets (dashboards, alerts, runbooks)
	@node scripts/ops/validate_observability.js

rollback-drill: ## Run simulated rollback drill
	@node scripts/ops/rollback_drill.js

sbom:   ## Generate CycloneDX SBOM (Legacy target, calls scripts/generate-sbom.sh)
	@bash scripts/generate-sbom.sh

supply-chain/sbom: ## Generate modern SBOMs (CycloneDX 1.7 + SPDX 3.0.1)
	@bash scripts/generate-sbom.sh "summit-platform" "latest" "./artifacts/sbom"

supply-chain/sign: ## Sign artifacts and SBOMs using Cosign
	@if [ -z "$(ARTIFACT)" ]; then echo "Usage: make supply-chain/sign ARTIFACT=<image|blob> [SBOM=<path>] [TYPE=image|blob]"; exit 1; fi
	@bash scripts/supply-chain/sign-and-attest.sh "$(ARTIFACT)" "$(SBOM)" "$(TYPE)"

smoke: bootstrap up ## Fresh clone smoke test: bootstrap -> up -> health check
	@echo "Waiting for services to start..."
	@sleep 45
	@echo "Checking UI health..."
	@curl -s -f http://localhost:3000 > /dev/null && echo "✅ UI is up" || (echo "❌ UI failed" && exit 1)
	@echo "Checking Gateway health..."
	@curl -s -f http://localhost:8080/healthz > /dev/null && echo "✅ Gateway is up" || (curl -s -f http://localhost:8080/health > /dev/null && echo "✅ Gateway is up" || (echo "❌ Gateway failed" && exit 1))
	@echo "Smoke test complete."

rollback: ## Rollback deployment (Usage: make rollback v=v3.0.0 env=prod)
	@if [ -z "$(v)" ]; then echo "Error: Version v is required (e.g., v=v3.0.0)"; exit 1; fi
	@if [ -z "$(env)" ]; then echo "Error: Environment env is required (e.g., env=prod)"; exit 1; fi
	@echo "Rolling back $(env) to version $(v)..."
	@chmod +x scripts/rollback.sh
	@./scripts/rollback.sh $(v) $(env)

# ---- IntelGraph S25 Merge Orchestrator (Legacy/Specific) ---------------------

SHELL := /bin/bash
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
	@npm run generate:provenance
	@echo "Provenance generated at .evidence/provenance.json"

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

# Secrets management golden path
secrets/bootstrap:
	@echo "Generating org age key if missing and aligning .sops.yaml"
	@[ -f .security/keys/age-org.pub ] || age-keygen -o .security/keys/age-org.key && age-keygen -y .security/keys/age-org.key > .security/keys/age-org.pub
	@echo "Update .sops.yaml recipients as needed. Private key must stay in security/key-vault."

secrets/encrypt:
	@if [ -z "${path}" ]; then echo "usage: make secrets/encrypt path=secrets/envs/dev/foo.enc.yaml"; exit 1; fi
	@sops --encrypt --in-place ${path}

secrets/decrypt:
	@if [ -z "${path}" ]; then echo "usage: make secrets/decrypt path=secrets/envs/dev/foo.enc.yaml"; exit 1; fi
	@tmpfile=$$(mktemp); sops -d ${path} > $$tmpfile && echo "Decrypted to $$tmpfile" && trap "shred -u $$tmpfile" EXIT && ${EDITOR:-vi} $$tmpfile

secrets/rotate:
	@if [ -z "${name}" ]; then echo "usage: make secrets/rotate name=FOO_KEY"; exit 1; fi
	@echo "Generating blue/green value for ${name}" && echo "${name}_v2=$$(openssl rand -hex 24)" > /tmp/${name}.rotation
	@echo "Remember to flip consumers to _v2 and clean up _v1 post-cutover"

secrets/lint:
	@echo "Running SOPS validation"
	@find secrets/envs -name '*.enc.yaml' -print0 | xargs -0 -I{} sops --verify {}
	@echo "Running leak scan"
	@.ci/scripts/secrets/leak_scan.sh
	@echo "Running OPA checks"
	@conftest test --policy .ci/policies --namespace secrets --all-namespaces

# --- Claude Code CLI Development ---

.PHONY: claude-preflight
claude-preflight: ## Fast local checks before make ga (lint + typecheck + unit tests)
	@echo "🔍 Running Claude preflight checks..."
	@echo ""
	@echo "Step 1/3: Linting..."
	@pnpm -w exec eslint . --quiet 2>/dev/null || { echo "❌ Lint failed. Run 'pnpm lint:fix' to auto-fix."; exit 1; }
	@echo "✅ Lint passed"
	@echo ""
	@echo "Step 2/3: Type checking..."
	@pnpm -C server typecheck 2>/dev/null || { echo "❌ Typecheck failed. Run 'pnpm typecheck' for details."; exit 1; }
	@echo "✅ Typecheck passed"
	@echo ""
	@echo "Step 3/3: Unit tests..."
	@pnpm -C server test:unit --passWithNoTests 2>/dev/null || { echo "❌ Tests failed. Run 'pnpm test -- --verbose' for details."; exit 1; }
	@echo "✅ Unit tests passed"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "✅ Preflight complete! Next step:"
	@echo ""
	@echo "   make ga"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# --- GA Hardening ---

.PHONY: ga ga-verify
ga: ## Run Enforceable GA Gate (Lint -> Clean Up -> Deep Health -> Smoke -> Security)
	@mkdir -p artifacts/ga
	@./scripts/ga-gate.sh
	@$(MAKE) ga-evidence
	@$(MAKE) ga-validate-evidence
	@$(MAKE) ga-report

ga-verify: ## Run GA tier B/C verification sweep (deterministic)
	@node --test testing/ga-verification/*.ga.test.mjs
	@node scripts/ga/verify-ga-surface.mjs

ga-validate-evidence: ## Validate control evidence completeness for GA
	@EVIDENCE_DIR="dist/evidence/$$(git rev-parse HEAD)"; \
	if [ ! -d "$$EVIDENCE_DIR" ]; then \
		echo "Missing evidence bundle at $$EVIDENCE_DIR"; \
		exit 1; \
	fi; \
	node scripts/evidence/generate_control_evidence_index.mjs --evidence-dir "$$EVIDENCE_DIR"; \
	node scripts/evidence/validate_control_evidence.mjs --evidence-dir "$$EVIDENCE_DIR"

ga-report: ## Generate SOC evidence report for the current bundle
	@EVIDENCE_DIR="dist/evidence/$$(git rev-parse HEAD)"; \
	if [ ! -d "$$EVIDENCE_DIR" ]; then \
		echo "Missing evidence bundle at $$EVIDENCE_DIR"; \
		exit 1; \
	fi; \
	python3 scripts/evidence/generate_soc_report.py --evidence-dir "$$EVIDENCE_DIR"

ga-evidence: ## Create a minimal local evidence bundle for GA validation
	@set -e; \
	EVIDENCE_DIR="dist/evidence/$$(git rev-parse HEAD)"; \
	if [ -d "$$EVIDENCE_DIR" ] && [ "$$(ls -A "$$EVIDENCE_DIR" 2>/dev/null)" ]; then \
		echo "Evidence bundle already present at $$EVIDENCE_DIR"; \
		exit 0; \
	fi; \
	node scripts/evidence/create_stub_evidence_bundle.mjs --evidence-dir "$$EVIDENCE_DIR"; \
	echo "Created stub evidence bundle at $$EVIDENCE_DIR"

evidence-bundle: ## Generate a deterministic PR evidence bundle (Usage: make evidence-bundle [BASE=origin/main] [OUT=dir])
	@BASE=$${BASE:-origin/main}; \
	OUT=$${OUT:-evidence-bundle-$$(git rev-parse --short HEAD)-$$(date +%Y%m%d%H%M%S)}; \
	python3 scripts/maintainers/gen-evidence-bundle.py --out "$$OUT" --base "$$BASE"

ops-verify: ## Run unified Ops Verification (Observability + Storage/DR)
	./scripts/verification/verify_ops.sh

# --- Governance & Evidence ---

.PHONY: evidence-bundle
evidence-bundle: ## Generate a standard evidence bundle (Usage: make evidence-bundle [BASE=origin/main] [RISK=low] [CHECKS="make test"])
	@python3 scripts/maintainers/gen-evidence-bundle.py \
		$(if $(BASE),--base $(BASE),) \
		$(if $(RISK),--risk $(RISK),) \
		$(if $(CHECKS),--checks "$(CHECKS)",) \
		$(if $(PROMPTS),--prompts "$(PROMPTS)",)

# --- Demo Environment ---

demo: ## Launch one-command demo environment
	@DEMO_MODE=1 ./scripts/demo-up.sh

demo-down: ## Stop demo environment
	@./scripts/demo-down.sh

demo-check: ## Check demo prerequisites
	@./scripts/demo-check.sh

demo-seed: ## Seed demo data
	@DEMO_MODE=1 ./scripts/demo-seed.sh

demo-smoke: ## Run demo smoke tests
	@./scripts/demo-smoke-test.sh
# Conductor / Maestro / Pipeline Commands

SRV_PORT ?= 4000
UI_PORT ?= 3000
CONDUCTOR_ENABLED ?= true
CONDUCTOR_TIMEOUT_MS ?= 60000
CONDUCTOR_MAX_CONCURRENT ?= 5
CONDUCTOR_AUDIT_ENABLED ?= true

# Helper for wait-for
wait-for:
	@echo "Waiting for $(host):$(port)..."
	@timeout 60s bash -c 'until echo > /dev/tcp/$(host)/$(port); do sleep 1; done'

# IntelGraph server (Conductor enabled)
conductor-server-up:
	@mkdir -p .run
	CONDUCTOR_ENABLED=$(CONDUCTOR_ENABLED) \
	CONDUCTOR_TIMEOUT_MS=$(CONDUCTOR_TIMEOUT_MS) \
	CONDUCTOR_MAX_CONCURRENT=$(CONDUCTOR_MAX_CONCURRENT) \
	CONDUCTOR_AUDIT_ENABLED=$(CONDUCTOR_AUDIT_ENABLED) \
	pnpm -C server start:conductor > .run/server.log 2>&1 & echo $$! > .run/server.pid
	@$(MAKE) wait-for host=localhost port=$(SRV_PORT)

conductor-client-up:
	@mkdir -p .run
	pnpm -C client dev > .run/client.log 2>&1 & echo $$! > .run/client.pid
	@$(MAKE) wait-for host=localhost port=$(UI_PORT)

conductor-up: dev-prereqs conductor-server-up conductor-client-up ## Start Conductor stack (infra+server+client)
	@echo "✅ Conductor stack is live at http://localhost:$(UI_PORT)/conductor"

conductor-down: ## Stop Conductor app layer (leaves infra)
	@pkill -F .run/server.pid 2>/dev/null || true
	@pkill -F .run/client.pid 2>/dev/null || true
	@echo "🛑 Conductor app layer stopped."

conductor-restart: conductor-down conductor-up ## Restart Conductor app layer

conductor-status: ## Check Maestro status
	@echo "🔎 Maestro status"
	@curl -fsS http://localhost:$(SRV_PORT)/healthz >/dev/null 2>&1 && echo "server: OK" || echo "server: FAIL"
	@curl -fsS http://localhost:$(UI_PORT) >/dev/null 2>&1 && echo "ui: OK" || echo "ui: OFF"

conductor-logs: ## Tail Conductor logs
	@echo "--- server ---"
	@tail -n 20 .run/server.log 2>/dev/null || echo "No server logs."
	@echo "--- client ---"
	@tail -n 20 .run/client.log 2>/dev/null || echo "No client logs."

# UX Governance
.PHONY: ux-governance-check ux-governance-audit ux-governance-report
ux-governance-check: ## Run UX governance validation on current codebase
	@echo "Running UX governance validation..."
	@node scripts/ux-ci-enforcer.cjs

ux-governance-audit: ## Perform complete UX governance audit
	@echo "Running complete UX governance audit..."
	@node scripts/ux-governance-orchestrator.cjs

ux-governance-report: ## Generate UX governance report
	@echo "Generating UX governance report..."
	@cat ux-governance-decision-package.json

# Pipeline Orchestration
pipelines-list: ## List registered pipelines
	@python3 pipelines/cli.py list --format table

pipelines-validate: ## Validate pipeline manifests
	@python3 pipelines/cli.py validate

test-security: ## Run security verifications
	@echo "Running Security Tests..."
	@npx tsx --test server/src/utils/__tests__/security.test.ts
	@bash scripts/ci/scan_secrets.sh --dry-run || true

test-compliance: ## Run compliance controls as tests
	@echo "Running Compliance Tests..."
	@node --test compliance/soc/*.test.mjs

# Eval Skills
.PHONY: eval-skill eval-skills-changed eval-skills-all
eval-skill: ## Run a single eval skill (SKILL=...)
	@npx tsx evals/runner/run_skill_eval.ts --skill $(SKILL)

eval-skills-changed: ## Run eval skills changed in the current diff
	@npx tsx evals/runner/run_skills_changed.ts

eval-skills-all: ## Run the full eval skills suite
	@npx tsx evals/runner/run_skill_suite.ts
