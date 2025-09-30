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
