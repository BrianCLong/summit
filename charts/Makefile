# Charts Makefile - Golden Path for Deployment

.PHONY: help lint lint-all template test install-dev install-prod clean

# Color output
COLOR_RESET = \033[0m
COLOR_BOLD = \033[1m
COLOR_GREEN = \033[32m
COLOR_YELLOW = \033[33m
COLOR_BLUE = \033[34m

help: ## Show this help message
	@echo "$(COLOR_BOLD)Charts - Golden Path for Deployment$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_BOLD)Usage:$(COLOR_RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(COLOR_BLUE)%-20s$(COLOR_RESET) %s\n", $$1, $$2}'

# ============================================================================
# Linting & Validation
# ============================================================================

lint: ## Lint all charts using helm lint
	@echo "$(COLOR_BOLD)Linting all charts...$(COLOR_RESET)"
	@for chart in */Chart.yaml; do \
		chart_dir=$$(dirname $$chart); \
		echo "$(COLOR_GREEN)→ Linting $$chart_dir$(COLOR_RESET)"; \
		helm lint $$chart_dir || exit 1; \
	done
	@echo "$(COLOR_GREEN)✓ All charts passed linting$(COLOR_RESET)"

lint-ct: ## Lint charts using chart-testing (ct)
	@echo "$(COLOR_BOLD)Linting charts with ct...$(COLOR_RESET)"
	@if command -v ct > /dev/null; then \
		ct lint --all --config ct.yaml; \
	else \
		echo "$(COLOR_YELLOW)⚠ chart-testing (ct) not installed. Run: brew install chart-testing$(COLOR_RESET)"; \
		exit 1; \
	fi

lint-all: lint lint-ct ## Run all linting checks

# ============================================================================
# Template Validation
# ============================================================================

template: ## Validate chart templates can be rendered
	@echo "$(COLOR_BOLD)Validating chart templates...$(COLOR_RESET)"
	@for chart in */Chart.yaml; do \
		chart_dir=$$(dirname $$chart); \
		echo "$(COLOR_GREEN)→ Templating $$chart_dir$(COLOR_RESET)"; \
		helm template test $$chart_dir > /dev/null || exit 1; \
	done
	@echo "$(COLOR_GREEN)✓ All templates validated$(COLOR_RESET)"

template-dev: ## Template charts with dev values
	@echo "$(COLOR_BOLD)Templating with dev values...$(COLOR_RESET)"
	@for chart in */Chart.yaml; do \
		chart_dir=$$(dirname $$chart); \
		if [ -f "$$chart_dir/values.dev.yaml" ]; then \
			echo "$(COLOR_GREEN)→ Templating $$chart_dir (dev)$(COLOR_RESET)"; \
			helm template test $$chart_dir --values $$chart_dir/values.dev.yaml > /dev/null || exit 1; \
		fi \
	done
	@echo "$(COLOR_GREEN)✓ All dev templates validated$(COLOR_RESET)"

template-prod: ## Template charts with prod values
	@echo "$(COLOR_BOLD)Templating with prod values...$(COLOR_RESET)"
	@for chart in */Chart.yaml; do \
		chart_dir=$$(dirname $$chart); \
		if [ -f "$$chart_dir/values.prod.yaml" ]; then \
			echo "$(COLOR_GREEN)→ Templating $$chart_dir (prod)$(COLOR_RESET)"; \
			helm template test $$chart_dir --values $$chart_dir/values.prod.yaml > /dev/null || exit 1; \
		fi \
	done
	@echo "$(COLOR_GREEN)✓ All prod templates validated$(COLOR_RESET)"

# ============================================================================
# Installation
# ============================================================================

install-dev: ## Install full stack in dev environment
	@echo "$(COLOR_BOLD)Installing dev stack...$(COLOR_RESET)"
	@./scripts/install-stack.sh dev

install-prod: ## Install full stack in production environment
	@echo "$(COLOR_BOLD)Installing production stack...$(COLOR_RESET)"
	@./scripts/install-stack.sh prod

# ============================================================================
# Testing
# ============================================================================

test: ## Run post-install smoke tests
	@echo "$(COLOR_BOLD)Running smoke tests...$(COLOR_RESET)"
	@./scripts/smoke-tests.sh

test-health: ## Check health of all deployed services
	@echo "$(COLOR_BOLD)Checking service health...$(COLOR_RESET)"
	@./scripts/health-check.sh

# ============================================================================
# Secrets Management
# ============================================================================

check-secrets: ## Verify no secrets are committed to Git
	@echo "$(COLOR_BOLD)Checking for secrets in Git...$(COLOR_RESET)"
	@if git ls-files | grep -E '(secret|\.key|\.pem|credentials)' | grep -v '.gitignore' | grep -v 'external-secret'; then \
		echo "$(COLOR_YELLOW)⚠ WARNING: Found potential secret files in Git!$(COLOR_RESET)"; \
		exit 1; \
	else \
		echo "$(COLOR_GREEN)✓ No secrets found in Git$(COLOR_RESET)"; \
	fi

# ============================================================================
# Dependencies
# ============================================================================

deps: ## Update Helm chart dependencies
	@echo "$(COLOR_BOLD)Updating chart dependencies...$(COLOR_RESET)"
	@for chart in */Chart.yaml; do \
		chart_dir=$$(dirname $$chart); \
		if [ -f "$$chart_dir/Chart.lock" ]; then \
			echo "$(COLOR_GREEN)→ Updating $$chart_dir$(COLOR_RESET)"; \
			helm dependency update $$chart_dir; \
		fi \
	done

# ============================================================================
# Packaging
# ============================================================================

package: ## Package all charts
	@echo "$(COLOR_BOLD)Packaging charts...$(COLOR_RESET)"
	@mkdir -p dist
	@for chart in */Chart.yaml; do \
		chart_dir=$$(dirname $$chart); \
		echo "$(COLOR_GREEN)→ Packaging $$chart_dir$(COLOR_RESET)"; \
		helm package $$chart_dir -d dist; \
	done
	@echo "$(COLOR_GREEN)✓ Charts packaged in dist/$(COLOR_RESET)"

# ============================================================================
# Cleanup
# ============================================================================

clean: ## Clean up generated files
	@echo "$(COLOR_BOLD)Cleaning up...$(COLOR_RESET)"
	@rm -rf dist/
	@find . -name "*.tgz" -delete
	@find . -name "Chart.lock" -delete
	@find . -name "charts/" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "$(COLOR_GREEN)✓ Cleanup complete$(COLOR_RESET)"

# ============================================================================
# Documentation
# ============================================================================

docs: ## Generate chart documentation
	@echo "$(COLOR_BOLD)Generating chart documentation...$(COLOR_RESET)"
	@if command -v helm-docs > /dev/null; then \
		helm-docs; \
		echo "$(COLOR_GREEN)✓ Documentation generated$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_YELLOW)⚠ helm-docs not installed. Run: brew install norwoodj/tap/helm-docs$(COLOR_RESET)"; \
	fi
