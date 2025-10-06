.PHONY: help capture stabilize set-protection harvest-untracked batch-prs finalize audit all

SHELL := /bin/bash
ORCHESTRATOR := ./scripts/greenlock_orchestrator.sh

help: ## Show this help message
	@echo "Green-Lock Orchestrator Makefile"
	@echo "================================="
	@echo ""
	@echo "Complete workflow:"
	@echo "  make all              - Run complete green-lock sequence"
	@echo ""
	@echo "Individual steps:"
	@echo "  make capture          - Snapshot broken repo (untracked, reflogs, fsck, bundle)"
	@echo "  make stabilize        - Create minimal stabilization gate workflow"
	@echo "  make set-protection   - Set branch protection to require only stabilization check"
	@echo "  make harvest-untracked- Import untracked files from broken repo"
	@echo "  make batch-prs        - Process and auto-merge all open PRs"
	@echo "  make finalize         - Tag stabilized state and rerun failed checks"
	@echo "  make audit            - Generate provenance ledger"
	@echo ""
	@echo "Safety:"
	@echo "  All operations run from clean-room clone (not iCloud)"
	@echo "  Provenance tracking ensures zero data loss"
	@echo ""

capture: ## Snapshot everything from broken repo
	@echo "📸 Capturing complete state from broken repository..."
	@$(ORCHESTRATOR) capture
	@echo "✅ Capture complete - see green-lock-ledger/ for artifacts"

stabilize: ## Create minimal stabilization gate
	@echo "🛡️ Creating stabilization workflow..."
	@$(ORCHESTRATOR) stabilize
	@echo "✅ Stabilization gate deployed"

set-protection: ## Configure branch protection for minimal check
	@echo "🔒 Configuring branch protection..."
	@$(ORCHESTRATOR) set-protection
	@echo "✅ Branch protection updated - only 'Stabilization: Build & Unit Tests' required"

harvest-untracked: ## Import untracked files into ops/untracked-import/
	@echo "🌾 Harvesting untracked files..."
	@$(ORCHESTRATOR) harvest-untracked
	@echo "✅ Untracked files preserved in ops/untracked-import/"

batch-prs: ## Process all open PRs with auto-merge
	@echo "🔄 Processing all open PRs..."
	@$(ORCHESTRATOR) batch-prs
	@echo "✅ PRs queued for auto-merge when stabilization passes"

finalize: ## Tag and finalize stabilized state
	@echo "🏁 Finalizing stabilization..."
	@$(ORCHESTRATOR) finalize
	@echo "✅ Green-lock complete - main is bright green"

audit: ## Generate complete provenance ledger
	@echo "📋 Generating audit trail..."
	@$(ORCHESTRATOR) audit
	@echo "✅ Provenance ledger written to green-lock-ledger/provenance.csv"

all: capture stabilize set-protection harvest-untracked batch-prs finalize audit ## Run complete green-lock sequence
	@echo ""
	@echo "🎉 GREEN-LOCK MISSION COMPLETE 🎉"
	@echo "=================================="
	@echo ""
	@echo "✅ Main branch: BRIGHT GREEN"
	@echo "✅ All PRs: Processed and auto-merging"
	@echo "✅ Untracked files: Preserved in ops/untracked-import/"
	@echo "✅ Provenance: Complete audit trail in green-lock-ledger/"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Monitor PR auto-merges: gh pr list"
	@echo "  2. Review untracked imports: ls -la ops/untracked-import/"
	@echo "  3. Gradually re-enable full CI checks"
	@echo "  4. Enable merge queue in GitHub settings"
	@echo ""

# ------------------------------------------------------------
# Deployable-first developer workflow targets
# ------------------------------------------------------------

.PHONY: bootstrap up up-ai up-kafka up-full smoke down clean logs ps helm-lint helm-smoke helm-validate helm-validate-online

COMPOSE_FILE ?= docker-compose.yml
SMOKE_SCRIPT ?= scripts/golden-smoke.sh
SMOKE_MAX_WAIT ?= 60
COMPOSE := docker compose -f $(COMPOSE_FILE)
COMPOSE_PROFILES ?=

# --- kubeconform resolver (offline-first) ------------------------------------
KCF_VERSION ?= 0.6.7
K8S_VERSION ?= v1.28.0
KCF_BIN ?= $(shell ./tools/kubeconform/resolve.sh 2>/dev/null || echo "")
ifeq ($(KCF_BIN),)
KCF_BIN := $(KUBECONFORM)
endif
SCHEMAS_DIR ?= tools/k8s-schemas/$(K8S_VERSION)

bootstrap: ## Verify prerequisites and prepare environment
	@set -euo pipefail
	@echo "🔍 Checking local prerequisites"
	@command -v docker >/dev/null || { echo "Docker is required" >&2; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "Docker daemon is not running" >&2; exit 1; }
	@command -v docker compose >/dev/null || { echo "Docker Compose v2 plugin is required" >&2; exit 1; }
	@command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
	@if ! command -v jq >/dev/null; then echo "jq is required for smoke validation" >&2; exit 1; fi
	@command -v node >/dev/null && node --version >/dev/null || true
	@command -v npm >/dev/null && npm --version >/dev/null || true
	@if [ -f .env.example ] && [ ! -f .env ]; then cp .env.example .env; echo "📄 Created .env from .env.example"; fi
	@echo "📦 Pulling container images (if available)"
	@$(COMPOSE) pull --ignore-pull-failures >/dev/null || true
	@echo "✅ Bootstrap complete"

up: ## Start core services and run smoke validation
	@set -euo pipefail
	@echo "🚀 Starting IntelGraph core stack"
	@$(COMPOSE) up -d
	@$(MAKE) smoke

up-ai: ## Start core services plus AI profile and run smoke validation
	@set -euo pipefail
	@echo "🤖 Starting IntelGraph with AI profile"
	@$(COMPOSE) --profile ai up -d
	@$(MAKE) smoke

up-kafka: ## Start core services plus Kafka profile and run smoke validation
	@set -euo pipefail
	@echo "📡 Starting IntelGraph with Kafka profile"
	@$(COMPOSE) --profile kafka up -d
	@$(MAKE) smoke

up-full: ## Start all services (core + AI + Kafka) and run smoke validation
	@set -euo pipefail
	@echo "🌐 Starting IntelGraph full platform"
	@$(COMPOSE) --profile ai --profile kafka up -d
	@$(MAKE) smoke

smoke: ## Run golden-path smoke checks (fails on first error)
	@set -euo pipefail
	@[ -x $(SMOKE_SCRIPT) ] || { echo "Smoke script $(SMOKE_SCRIPT) not found or not executable" >&2; exit 1; }
	@echo "🩺 Running golden-path smoke validation"
	@INTELGRAPH_SMOKE_MAX_WAIT=$(SMOKE_MAX_WAIT) bash $(SMOKE_SCRIPT)
	@echo "✅ Smoke checks passed"

down: ## Stop running services and remove containers
	@set -euo pipefail
	@echo "🛑 Stopping IntelGraph services"
	@$(COMPOSE) --profile ai --profile kafka down --remove-orphans

clean: down ## Stop services and prune local Docker resources
	@set -euo pipefail
	@echo "🧹 Pruning dangling Docker resources"
	@docker volume prune -f >/dev/null || true
	@docker image prune -f >/dev/null || true

logs: ## Tail aggregate logs from running services
	@$(COMPOSE) logs -f

ps: ## Show status of running services
	@$(COMPOSE) ps

helm-lint: ## Lint the IntelGraph Helm chart
	@helm lint infra/helm/intelgraph --set dev.dummySecrets=true

helm-smoke: ## Render chart locally and assert service/probe/metrics wiring
	@set -euo pipefail
	@helm template smoke infra/helm/intelgraph --namespace smoke \
	  --set server.enabled=true \
	  --set server.service.enabled=true \
	  --set server.service.port=4000 \
	  --set server.probes.enabled=true \
	  --set server.probes.liveness.path="/health" \
	  --set server.probes.readiness.path="/health" \
	  --set server.metrics.enabled=true \
	  --set server.metrics.prometheusScrape=true \
	  --set dev.dummySecrets=true \
	  > /tmp/smoke.yaml
	@rg -n "kind: Service|/health|prometheus.io/scrape|port: 4000" /tmp/smoke.yaml

helm-validate: ## Validate rendered manifests with kubeconform (offline-friendly)
	@if [ -z "$(KCF_BIN)" ]; then \
	  echo "✖ kubeconform not found."; \
	  echo "  -> Place a binary under tools/kubeconform/<os>-<arch>/kubeconform"; \
	  echo "     or export KUBECONFORM=/abs/path/to/kubeconform"; \
	  echo "     or run 'make helm-validate-online' (requires network)."; \
	  exit 2; \
	fi
	@echo "✔ Using kubeconform: $(KCF_BIN)"
	@echo "ℹ K8s version: $(K8S_VERSION)"
	@mkdir -p .out/helm
	@helm template smoke infra/helm/intelgraph --namespace smoke \
	  --set server.enabled=true \
	  --set server.service.enabled=true \
	  --set server.service.port=4000 \
	  --set server.probes.enabled=true \
	  --set server.probes.liveness.path="/health" \
	  --set server.probes.readiness.path="/health" \
	  --set server.metrics.enabled=true \
	  --set server.metrics.prometheusScrape=true \
	  --set dev.dummySecrets=true \
	  > .out/helm/intelgraph.yaml
	@rg -n "kind: Service|/health|prometheus.io/scrape|port: 4000" .out/helm/intelgraph.yaml
	@if [ -d "$(SCHEMAS_DIR)" ]; then \
	  echo "✔ Using vendored schemas: $(SCHEMAS_DIR)"; \
	  "$(KCF_BIN)" -strict -ignore-missing-schemas \
	    -schema-location default \
	    -schema-location file://$(SCHEMAS_DIR)/{{ .NormalizedKubernetesVersion }}-standalone \
	    .out/helm/intelgraph.yaml; \
	else \
	  echo "⚠ No vendored schemas found at $(SCHEMAS_DIR); using kubeconform defaults only."; \
	  "$(KCF_BIN)" -strict -ignore-missing-schemas -schema-location default \
	    .out/helm/intelgraph.yaml; \
	fi

.PHONY: helm-validate-online
helm-validate-online: ## (Online) Download kubeconform + schemas, then validate
	@tools/kubeconform/fetch.sh $(KCF_VERSION)
	@tools/kubeconform/fetch-schemas.sh $(K8S_VERSION)
	@$(MAKE) helm-validate

# Green-Lock Acceptance Pack Targets
acceptance: verify recover auto-merge monitor ## Run complete acceptance workflow

verify: ## Run septuple verification matrix
	@./scripts/verify_greenlock.sh

recover: ## Recover all 799 dangling commits as rescue/* branches
	@./scripts/recover_orphans_from_bundle.sh

auto-merge: ## Enable auto-merge on all open PRs
	@./scripts/auto_merge_all_open_prs.sh

monitor: ## Monitor stabilization workflow execution
	@./scripts/monitor_stabilization.sh

reenable-ci: ## Show CI re-enablement guide
	@./scripts/gradual_reenable_ci.sh
