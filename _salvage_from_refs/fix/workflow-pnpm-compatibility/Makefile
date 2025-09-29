# IntelGraph Development Makefile
# Production-ready targets for monorepo development, testing, and deployment

.PHONY: help dev test lint typecheck security docs clean install build deploy

# Default target
.DEFAULT_GOAL := help

# Colors for output
RED    := \033[31m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
RESET  := \033[0m

##@ Development

help: ## Display this help message
	@echo "$(BLUE)IntelGraph Development Commands$(RESET)"
	@echo "$(YELLOW)Usage: make <target>$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

install: ## Install all dependencies using pnpm
	@echo "$(GREEN)Installing dependencies...$(RESET)"
	pnpm install --frozen-lockfile
	@echo "$(GREEN)✅ Dependencies installed$(RESET)"

dev: install ## Start development environment with docker-compose
	@echo "$(GREEN)Starting development environment...$(RESET)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.example...$(RESET)"; \
		cp .env.example .env; \
		echo "$(YELLOW)⚠️  Please update .env with your actual values$(RESET)"; \
	fi
	docker compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)🚀 Development environment started$(RESET)"
	@echo "$(BLUE)Web Client: http://localhost:3000$(RESET)"
	@echo "$(BLUE)API Server: http://localhost:4000$(RESET)"
	@echo "$(BLUE)GraphQL Playground: http://localhost:4000/graphql$(RESET)"

dev-stop: ## Stop development environment
	@echo "$(YELLOW)Stopping development environment...$(RESET)"
	docker compose -f docker-compose.dev.yml down
	@echo "$(GREEN)✅ Development environment stopped$(RESET)"

dev-logs: ## Show development environment logs
	docker compose -f docker-compose.dev.yml logs -f

##@ Testing & Quality

test: ## Run all tests using turbo
	@echo "$(GREEN)Running tests...$(RESET)"
	pnpm dlx turbo run test --cache-dir .turbo
	@echo "$(GREEN)✅ Tests completed$(RESET)"

test-changed: ## Run tests for changed packages only
	@echo "$(GREEN)Running tests for changed packages...$(RESET)"
	pnpm dlx turbo run test --filter=...[HEAD^1] --cache-dir .turbo
	@echo "$(GREEN)✅ Changed package tests completed$(RESET)"

test-coverage: ## Run tests with coverage report
	@echo "$(GREEN)Running tests with coverage...$(RESET)"
	pnpm dlx turbo run test:coverage --cache-dir .turbo
	@echo "$(GREEN)✅ Coverage report generated$(RESET)"

lint: ## Run ESLint across all packages
	@echo "$(GREEN)Running linting...$(RESET)"
	pnpm dlx turbo run lint --cache-dir .turbo
	@echo "$(GREEN)✅ Linting completed$(RESET)"

lint-fix: ## Fix linting issues automatically
	@echo "$(GREEN)Fixing linting issues...$(RESET)"
	pnpm dlx turbo run lint:fix --cache-dir .turbo
	@echo "$(GREEN)✅ Linting issues fixed$(RESET)"

typecheck: ## Run TypeScript type checking
	@echo "$(GREEN)Running type checking...$(RESET)"
	pnpm dlx turbo run typecheck --cache-dir .turbo
	@echo "$(GREEN)✅ Type checking completed$(RESET)"

security: ## Run security scans
	@echo "$(GREEN)Running security scans...$(RESET)"
	@echo "$(BLUE)🔍 npm audit...$(RESET)"
	pnpm audit --audit-level moderate || true
	@echo "$(BLUE)🔍 Trivy filesystem scan...$(RESET)"
	@if command -v trivy >/dev/null 2>&1; then \
		trivy fs . --exit-code 0; \
	else \
		echo "$(YELLOW)⚠️  Trivy not installed, skipping filesystem scan$(RESET)"; \
	fi
	@echo "$(GREEN)✅ Security scans completed$(RESET)"

##@ Documentation

docs: ## Build documentation site
	@echo "$(GREEN)Building documentation...$(RESET)"
	@if [ -d "docs-site" ]; then \
		cd docs-site && pnpm run build; \
	else \
		pnpm dlx turbo run docs:build --cache-dir .turbo; \
	fi
	@echo "$(GREEN)✅ Documentation built$(RESET)"

docs-dev: ## Start documentation development server
	@echo "$(GREEN)Starting documentation development server...$(RESET)"
	@if [ -d "docs-site" ]; then \
		cd docs-site && pnpm run start; \
	else \
		pnpm dlx turbo run docs:dev --cache-dir .turbo; \
	fi

docs-check: ## Check documentation for issues
	@echo "$(GREEN)Checking documentation...$(RESET)"
	@if command -v vale >/dev/null 2>&1; then \
		vale docs/ || true; \
	else \
		echo "$(YELLOW)⚠️  Vale not installed, skipping prose linting$(RESET)"; \
	fi
	@echo "$(GREEN)✅ Documentation check completed$(RESET)"

##@ Build & Package

build: ## Build all packages for production
	@echo "$(GREEN)Building all packages...$(RESET)"
	pnpm dlx turbo run build --cache-dir .turbo
	@echo "$(GREEN)✅ Build completed$(RESET)"

clean: ## Clean build artifacts and node_modules
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	pnpm dlx turbo run clean --cache-dir .turbo || true
	rm -rf node_modules/.cache
	rm -rf .turbo
	@echo "$(GREEN)✅ Clean completed$(RESET)"

clean-all: clean ## Clean everything including node_modules
	@echo "$(RED)Cleaning all dependencies...$(RESET)"
	find . -name "node_modules" -type d -prune -exec rm -rf {} \;
	find . -name "dist" -type d -prune -exec rm -rf {} \;
	rm -f pnpm-lock.yaml
	@echo "$(GREEN)✅ Full clean completed$(RESET)"

##@ Container Operations

docker-build: ## Build all Docker images
	@echo "$(GREEN)Building Docker images...$(RESET)"
	docker compose build
	@echo "$(GREEN)✅ Docker images built$(RESET)"

docker-up: ## Start all services with Docker Compose
	@echo "$(GREEN)Starting all services...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)✅ All services started$(RESET)"

docker-down: ## Stop all Docker Compose services
	@echo "$(YELLOW)Stopping all services...$(RESET)"
	docker compose down
	@echo "$(GREEN)✅ All services stopped$(RESET)"

docker-logs: ## Show Docker Compose logs
	docker compose logs -f

##@ Helm & Kubernetes

helm-lint: ## Lint Helm charts
	@echo "$(GREEN)Linting Helm charts...$(RESET)"
	@if command -v helm >/dev/null 2>&1; then \
		helm lint infra/helm/intelgraph; \
		helm dependency update infra/helm/intelgraph; \
	else \
		echo "$(RED)❌ Helm not installed$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Helm charts linted$(RESET)"

helm-template: ## Generate Kubernetes manifests from Helm chart
	@echo "$(GREEN)Generating Helm templates...$(RESET)"
	@if command -v helm >/dev/null 2>&1; then \
		helm template intelgraph infra/helm/intelgraph -f infra/helm/intelgraph/values-dev.yaml > /tmp/intelgraph-dev.yaml; \
		echo "$(BLUE)📄 Dev manifests: /tmp/intelgraph-dev.yaml$(RESET)"; \
		helm template intelgraph infra/helm/intelgraph -f infra/helm/intelgraph/values-prod.yaml > /tmp/intelgraph-prod.yaml; \
		echo "$(BLUE)📄 Prod manifests: /tmp/intelgraph-prod.yaml$(RESET)"; \
	else \
		echo "$(RED)❌ Helm not installed$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Helm templates generated$(RESET)"

helm-template-dev: ## Generate dev environment Kubernetes manifests
	@echo "$(GREEN)Generating dev Helm templates...$(RESET)"
	helm template intelgraph infra/helm/intelgraph -f infra/helm/intelgraph/values-dev.yaml

helm-template-prod: ## Generate prod environment Kubernetes manifests
	@echo "$(GREEN)Generating prod Helm templates...$(RESET)"
	helm template intelgraph infra/helm/intelgraph -f infra/helm/intelgraph/values-prod.yaml

##@ Policy & Security

policy-test: ## Test OPA policies with conftest
	@echo "$(GREEN)Testing OPA policies...$(RESET)"
	@if command -v conftest >/dev/null 2>&1; then \
		conftest test infra/helm/intelgraph --policy policies/opa; \
	else \
		echo "$(YELLOW)⚠️  Conftest not installed, skipping policy tests$(RESET)"; \
	fi
	@echo "$(GREEN)✅ Policy tests completed$(RESET)"

policy-verify: ## Verify OPA policy syntax
	@echo "$(GREEN)Verifying OPA policy syntax...$(RESET)"
	@if command -v opa >/dev/null 2>&1; then \
		opa fmt --diff policies/opa/; \
		opa test policies/opa/; \
	else \
		echo "$(YELLOW)⚠️  OPA not installed, skipping policy verification$(RESET)"; \
	fi
	@echo "$(GREEN)✅ Policy verification completed$(RESET)"

##@ Release & Deployment

release-rc: ## Create release candidate
	@echo "$(GREEN)Creating release candidate...$(RESET)"
	@echo "$(YELLOW)🏗️  Running pre-release checks...$(RESET)"
	$(MAKE) lint typecheck test security
	@echo "$(BLUE)📦 Ready for release candidate$(RESET)"
	@echo "$(YELLOW)Next: Use GitHub Actions 'release' workflow$(RESET)"

release-ga: ## Prepare GA release
	@echo "$(GREEN)Preparing GA release...$(RESET)"
	@echo "$(YELLOW)🏗️  Running comprehensive validation...$(RESET)"
	$(MAKE) lint typecheck test security helm-lint policy-test docs
	@echo "$(BLUE)🚀 Ready for GA release$(RESET)"
	@echo "$(YELLOW)Next: Use GitHub Actions 'release' workflow$(RESET)"

deploy-dev: ## Deploy to development environment
	@echo "$(GREEN)Deploying to development...$(RESET)"
	@echo "$(YELLOW)🚀 Use GitHub Actions 'deploy' workflow with env=dev$(RESET)"

deploy-stage: ## Deploy to staging environment
	@echo "$(GREEN)Deploying to staging...$(RESET)"
	@echo "$(YELLOW)🚀 Use GitHub Actions 'deploy' workflow with env=stage$(RESET)"

deploy-prod: ## Deploy to production environment
	@echo "$(GREEN)Deploying to production...$(RESET)"
	@echo "$(RED)⚠️  Production deployment requires manual approval$(RESET)"
	@echo "$(YELLOW)🚀 Use GitHub Actions 'deploy' workflow with env=prod$(RESET)"

##@ Utilities

check-tools: ## Check if required tools are installed
	@echo "$(GREEN)Checking required tools...$(RESET)"
	@echo -n "Node.js: "; node --version 2>/dev/null || echo "$(RED)❌ Not installed$(RESET)"
	@echo -n "pnpm: "; pnpm --version 2>/dev/null || echo "$(RED)❌ Not installed$(RESET)"
	@echo -n "Docker: "; docker --version 2>/dev/null || echo "$(RED)❌ Not installed$(RESET)"
	@echo -n "Helm: "; helm version --short 2>/dev/null || echo "$(YELLOW)⚠️  Not installed$(RESET)"
	@echo -n "kubectl: "; kubectl version --client --short 2>/dev/null || echo "$(YELLOW)⚠️  Not installed$(RESET)"
	@echo -n "Trivy: "; trivy --version 2>/dev/null || echo "$(YELLOW)⚠️  Not installed$(RESET)"
	@echo -n "Vale: "; vale --version 2>/dev/null || echo "$(YELLOW)⚠️  Not installed$(RESET)"
	@echo -n "OPA: "; opa version 2>/dev/null || echo "$(YELLOW)⚠️  Not installed$(RESET)"
	@echo -n "Conftest: "; conftest --version 2>/dev/null || echo "$(YELLOW)⚠️  Not installed$(RESET)"
	@echo "$(GREEN)✅ Tool check completed$(RESET)"

status: ## Show development environment status
	@echo "$(BLUE)IntelGraph Development Status$(RESET)"
	@echo "=============================="
	@echo -n "🏗️  Build status: "; \
		if [ -d "dist" ] || [ -d "build" ]; then echo "$(GREEN)Built$(RESET)"; else echo "$(YELLOW)Not built$(RESET)"; fi
	@echo -n "📦 Dependencies: "; \
		if [ -f "pnpm-lock.yaml" ] && [ -d "node_modules" ]; then echo "$(GREEN)Installed$(RESET)"; else echo "$(RED)Missing$(RESET)"; fi
	@echo -n "🐳 Docker: "; \
		if docker compose ps -q 2>/dev/null | wc -l | grep -q '^[1-9]'; then echo "$(GREEN)Running$(RESET)"; else echo "$(YELLOW)Stopped$(RESET)"; fi
	@echo -n "🏛️  Git status: "; \
		if git diff --quiet && git diff --cached --quiet; then echo "$(GREEN)Clean$(RESET)"; else echo "$(YELLOW)Dirty$(RESET)"; fi
	@echo ""

info: ## Show project information
	@echo "$(BLUE)IntelGraph Monorepo$(RESET)"
	@echo "=================="
	@echo "🏗️  Architecture: Node.js microservices with pnpm workspaces"
	@echo "📦 Package Manager: pnpm $(shell pnpm --version 2>/dev/null || echo 'not installed')"
	@echo "🏃 Task Runner: Turbo"
	@echo "🐳 Containers: Docker Compose"
	@echo "☸️  Orchestration: Kubernetes + Helm"
	@echo "🔐 Security: OPA, Trivy, CodeQL"
	@echo "📚 Documentation: Docusaurus + Vale"
	@echo "🚀 CI/CD: GitHub Actions (8 workflows)"
	@echo ""
	@echo "$(GREEN)Quick Start:$(RESET)"
	@echo "  make install    # Install dependencies"
	@echo "  make dev        # Start development environment"
	@echo "  make test       # Run tests"
	@echo "  make help       # Show all commands"

.PHONY: e2e-smoke e2e-all k6-smoke k6-soak helm-render-stage helm-render-prod policy-test

e2e-smoke:
	cd packages/e2e-shared && npx playwright install --with-deps && pnpm run e2e:smoke

e2e-all:
	cd packages/e2e-shared && npx playwright install --with-deps && pnpm run e2e:all

k6-smoke:
	k6 run maestro/tests/k6/smoke.js -e BASE_URL=${BASE_URL:-http://localhost:3000} -e STAGE=${STAGE:-dev}

k6-soak:
	k6 run maestro/tests/k6/soak.js  -e BASE_URL=${BASE_URL:-$STAGE_URL} -e STAGE=${STAGE:-stage}

helm-render-stage:
	helm template intelgraph infra/helm/intelgraph -f infra/helm/intelgraph/values-stage.yaml > stage.yaml

helm-render-prod:
	helm template intelgraph infra/helm/intelgraph -f infra/helm/intelgraph/values-prod.yaml > prod.yaml

policy-test: helm-render-stage helm-render-prod
	conftest test stage.yaml --policy policies/opa
	conftest test prod.yaml  --policy policies/opa
