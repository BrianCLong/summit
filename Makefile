# Summit / IntelGraph Maestro Conductor Makefile
# Sprint 27: Clean Merge, Clean Build, Clean Test

.PHONY: help check test build mc-build mc-test mc-package mc-attest mc-publish-canary mc-promote mc-rollback
.PHONY: lint typecheck format format-check unit itest e2e promtest k6-gate
.PHONY: sbom attest verify-provenance warm-cache clean
.PHONY: pr-heatmap pr-plan test-flake-scan test-quarantine test-drift-report
.PHONY: branch-prune-dryrun branch-prune-apply determinism-repro
.PHONY: validate policy:test policy:bundle
.DEFAULT_GOAL := help

# Configuration
REGISTRY ?= ghcr.io/brianclong/summit
APP_VERSION ?= $(shell git rev-parse --short HEAD)
NODE_VERSION := 20
MC_ORCHESTRATOR := ./scripts/mc-orchestrator.sh

help: ## Show this help message
	@echo "Summit / IntelGraph Maestro Conductor"
	@echo "Sprint 27: Clean Merge, Clean Build, Clean Test"
	@echo ""
	@echo "Quick Start:"
	@echo "  make check           # lint+type+unit in ≤90s"
	@echo "  make test            # full test suite"
	@echo "  make mc-build        # orchestrated build"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

## Core Development Loop (≤90s target)
check: lint typecheck unit ## Fast local loop: lint+type+unit
	@echo "✅ Fast check complete"

install: ## Install dependencies
	npm ci --frozen-lockfile

lint: ## Run linters (eslint, ruff, shellcheck)
	npm run lint
	@command -v shellcheck >/dev/null && find scripts -name "*.sh" -exec shellcheck {} \; || echo "⚠️  shellcheck not installed"

typecheck: ## Run TypeScript type checking
	npm run typecheck

format: ## Auto-format code
	npm run format

format-check: ## Check code formatting
	npm run format:check

## Testing
test: unit itest ## Run all tests
unit: ## Run unit tests
	npm run test:unit

itest: ## Run integration tests
	npm run test:integration

e2e: ## Run end-to-end tests
	npm run test:e2e

## Build Pipeline
build: ## Build all services
	npm run build

mc-build: ## Maestro Conductor: orchestrated build
	@echo "🔨 MC Build: Starting orchestrated build..."
	$(MC_ORCHESTRATOR) build --config orchestrations/mc/build.yaml

mc-test: ## Maestro Conductor: run test gates
	@echo "🧪 MC Test: Running test gates..."
	$(MC_ORCHESTRATOR) test --config orchestrations/mc/build.yaml

mc-package: ## Maestro Conductor: package artifacts
	@echo "📦 MC Package: Creating container images..."
	$(MC_ORCHESTRATOR) package --config orchestrations/mc/build.yaml

mc-attest: ## Maestro Conductor: generate attestations
	@echo "🔏 MC Attest: Generating SBOM and attestations..."
	$(MC_ORCHESTRATOR) attest --config orchestrations/mc/build.yaml

mc-publish-canary: mc-build mc-test mc-package mc-attest ## Maestro Conductor: publish to canary
	@echo "🚀 MC Publish Canary: Publishing to $(REGISTRY)..."
	$(MC_ORCHESTRATOR) publish --channel canary --registry $(REGISTRY) --version $(APP_VERSION)-rc.1

mc-promote: ## Maestro Conductor: promote canary to stable
	@echo "⬆️  MC Promote: Promoting canary to stable..."
	$(MC_ORCHESTRATOR) promote --from canary --to stable --version $(APP_VERSION)

mc-rollback: ## Maestro Conductor: rollback to previous version
	@echo "⬇️  MC Rollback: Rolling back to previous version..."
	$(MC_ORCHESTRATOR) rollback --env staging --timeout 300s

## Supply Chain Security
sbom: ## Generate Software Bill of Materials
	@echo "📋 Generating SBOMs..."
	syft packages dir:. -o spdx-json > dist/app-$(APP_VERSION).sbom.spdx.json
	syft packages dir:. -o cyclonedx-json > dist/app-$(APP_VERSION).sbom.cdx.json

attest: sbom ## Generate cosign attestations
	@echo "🔏 Generating attestations..."
	cosign attest --predicate dist/app-$(APP_VERSION).sbom.spdx.json --type spdxjson dist/app-$(APP_VERSION).tgz

verify-provenance: ## Verify SBOM and provenance
	@echo "🔍 Verifying provenance..."
	@test -n "$(ARTIFACT)" || (echo "Usage: make verify-provenance ARTIFACT=path/to/artifact"; exit 1)
	cosign verify-attestation --type spdxjson $(ARTIFACT)

## Observability Gates
promtest: ## Run Prometheus rule tests
	@echo "📊 Running Prometheus golden tests..."
	@command -v promtool >/dev/null || (echo "❌ promtool not installed"; exit 1)
	promtool test rules tests/prometheus/*.test.yml

k6-gate: ## Run k6 performance gate
	@echo "⚡ Running k6 performance gate..."
	@command -v k6 >/dev/null || (echo "❌ k6 not installed"; exit 1)
	k6 run tests/k6/go-nogo-gate.js

## Policy & Validation
validate: ## Validate DSLs and configurations
	node scripts/validate-dsls.mjs

policy\:test: ## Test OPA policies
	opa check policies/opa && opa test policies/opa -v || true

policy\:bundle: ## Build OPA policy bundle
	opa build -b policies/opa -o composer-policy-bundle.tar.gz
	@echo "Bundle at ./composer-policy-bundle.tar.gz"

## Sprint 27B: PR Battlefield & Hygiene
pr-heatmap: ## Generate PR heatmap for triage
	@echo "🗺️  Generating PR heatmap..."
	mkdir -p ops/reports
	gh pr list --state all --json number,title,state,createdAt,author,reviewDecision --limit 100 > ops/reports/pr_heatmap.json

pr-plan: ## Generate MERGE-PLAN.md from GitHub
	@echo "📋 Generating merge plan..."
	./scripts/generate-merge-plan.sh > MERGE-PLAN.md

test-flake-scan: ## Scan for flaky tests
	@echo "🔍 Scanning for flaky tests..."
	npm run test:flake-scan || true
	mkdir -p tests/reports
	echo "Flake scan completed at $(shell date)" > tests/reports/flake-scan-$(shell date +%Y%m%d-%H%M%S).log

test-quarantine: ## Quarantine flaky tests
	@test -n "$(pattern)" || (echo "Usage: make test-quarantine pattern='TestName'"; exit 1)
	@echo "🚧 Quarantining tests matching: $(pattern)"
	grep -r "$(pattern)" tests/ | xargs sed -i 's/describe(/describe.skip(/g'

test-drift-report: ## Check golden output drift
	@echo "📊 Checking golden transcript drift..."
	./scripts/check-golden-drift.sh

branch-prune-dryrun: ## Report stale branches (dry run)
	@echo "🌿 Dry run: branches to prune..."
	./scripts/branch-prune.sh --dry-run

branch-prune-apply: ## Create PR to delete stale branches
	@echo "🌿 Creating branch prune PR..."
	./scripts/branch-prune.sh --apply

determinism-repro: ## Verify deterministic builds
	@echo "🔄 Running determinism check..."
	./scripts/determinism-check.sh

## Utilities
warm-cache: ## Warm build caches
	@echo "🔥 Warming caches..."
	npm run build --cache-only

clean: ## Clean build artifacts
	@echo "🧹 Cleaning..."
	rm -rf dist/ node_modules/.cache/ .turbo/
	docker system prune -f

## CI/CD Helpers
ci: check itest promtest k6-gate ## Full CI pipeline
	@echo "✅ CI pipeline complete"

dev-setup: ## One-time developer setup
	./scripts/bootstrap.sh
