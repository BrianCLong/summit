.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: e2e\:golden
e2e\:golden: ## Run Golden Path E2E test (seed→query→export→audit+provenance)
	@chmod +x scripts/e2e/golden-path.sh
	@scripts/e2e/golden-path.sh

.PHONY: projects-seed
projects-seed: ## Seed all GitHub projects
	@echo "Seeding all GitHub projects..."
	@chmod +x scripts/projects/*.sh
	@scripts/projects/create-kanban.sh
	@scripts/projects/create-team-planning.sh
	@scripts/projects/create-feature-release.sh
	@scripts/projects/create-bug-tracker.sh
	@scripts/projects/create-iterative-development.sh
	@scripts/projects/create-product-launch.sh
	@scripts/projects/create-roadmap.sh
	@scripts/projects/create-team-retrospective.sh
	@echo "All projects seeded."

.PHONY: projects-destroy
projects-destroy: ## Destroy all GitHub projects (requires YES confirmation)
	@echo "This is a destructive action. Type 'YES' to confirm."
	@read confirmation; \
	if [ "$$confirmation" = "YES" ]; then \
	  chmod +x scripts/projects/destroy.sh; \
	  scripts/projects/destroy.sh; \
	else \
	  echo "Aborted."; \
	fi

.PHONY: bonus-seed
bonus-seed: ## Create the 9 bonus projects
	@chmod +x scripts/bonus/seed_projects.sh
	@scripts/bonus/seed_projects.sh BrianCLong

.PHONY: bonus-apply
bonus-apply: ## Apply fields/views/items via GraphQL
	@export GH_TOKEN=$$(gh auth token 2>/dev/null) && \
	if [ -z "$$GH_TOKEN" ]; then \
	  echo "❌ GH_TOKEN not available. Run 'gh auth login' first." >&2; \
	  exit 1; \
	fi && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/security_compliance.json --owner BrianCLong --create-missing && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/design_system.json --owner BrianCLong --create-missing && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/content_calendar.json --owner BrianCLong --create-missing && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/customer_feedback.json --owner BrianCLong --create-missing && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/startup_ops.json --owner BrianCLong --create-missing && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/smb_finance.json --owner BrianCLong --create-missing && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/gov_contracting.json --owner BrianCLong --create-missing && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/regulatory.json --owner BrianCLong --create-missing && \
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/gaap_close.json --owner BrianCLong --create-missing

.PHONY: bonus-destroy
bonus-destroy: ## Remove bonus projects (gated)
	@[ "$$CONFIRM" = "YES" ] || (echo "Set CONFIRM=YES" && exit 1)
	# destructive: list and delete by exact name
	@echo "Destroying bonus projects... (Manual deletion required for now)"
	@echo "Please manually delete the following projects from GitHub:"
	@jq -r '.name' bonus_projects/seed/*.json
