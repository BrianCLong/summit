# Batch 01: CI/CD Fix & Hardening

**Priority:** CRITICAL - Blocking merges
**Agent:** Claude Code (Anthropic)
**Parallelizable:** Yes (11 independent tasks)

## Task 1: Analyze continue-on-error Patterns
**Prompt:**
Analyze all GitHub Actions workflow YAMLs in `.github/workflows/` for `continue-on-error: true` settings. Generate a report showing:
- Which workflows have this flag
- Which steps use it
- Impact analysis (what failures are being hidden)
- Recommended rewrites to enforce hard-fail behavior

Create a PR with test-mode changes that log but don't yet enforce.

## Task 2: Enable Branch Protection with CI Gating
**Prompt:**
Document the exact GitHub branch protection rules needed to:
- Require all CI checks to pass before merge
- Prevent admin bypass (or document when it's needed)
- List minimum viable CI checks for the escape hatch

Generate a configuration script or documentation file that can be applied via GitHub CLI or Settings UI.

## Task 3: CI Secrets & Environment Inventory
**Prompt:**
Scan all workflow files and create an inventory of:
- Required secrets (e.g., `secrets.GITHUB_TOKEN`, `secrets.NPM_TOKEN`)
- Missing secrets that cause failures
- Environment variables that are undefined
- Recommended secrets management strategy

Output: `docs/ci-secrets-inventory.md` with remediation steps.

## Task 4: Admin Merge Override Script
**Prompt:**
Create a bash/Node.js script that:
- Checks if a PR has been manually verified green outside CI
- Uses GitHub CLI to bypass checks and merge (admin-only)
- Logs the override action for audit
- Includes safety checks (require specific label like `ci-verified-manual`)

Output: `.github/scripts/admin-merge-override.sh`

## Task 5: Minimum Viable CI Documentation
**Prompt:**
Document the absolute minimum CI checks required for:
- Documentation-only PRs
- Test-only PRs  
- Configuration-only PRs
- Full feature PRs

Create a decision tree or matrix. Output: `docs/ci-requirements-matrix.md`

## Task 6: Root-Cause Analysis Bot
**Prompt:**
Build a GitHub Action that:
- Runs on CI failure
- Analyzes failure logs
- Distinguishes infrastructure failures from code failures
- Comments on PR with categorized failure reason
- Tags issues appropriately (`ci-infra-failure` vs `ci-code-failure`)

Output: `.github/workflows/ci-failure-analyzer.yml` + supporting script

## Task 7: Dependency Resolution & Lockfile Sync
**Prompt:**
Patch all active workflows to ensure:
- Lockfiles are committed and synchronized
- Dependencies are pinned to exact versions
- Cache keys are properly configured
- Add lockfile validation step to CI

Create a PR that updates all workflows with these hardening measures.

## Task 8: PR Status Export Generator
**Prompt:**
Create a script that:
- Iterates through all open PRs
- Exports one-line status for each (green/red, which step failed, human actionable?)
- Outputs to `pr-status-report.md`
- Can be run manually or via GitHub Action on schedule

Output: `.github/scripts/export-pr-status.js`

## Task 9: Blocked PR Queue System
**Prompt:**
Develop a workflow that:
- Labels PRs that are CI-blocked but manually verified
- Creates a queue/board view of blocked PRs
- Notifies maintainers when queue exceeds threshold
- Provides smoke-test checklist template

Output: `.github/workflows/blocked-pr-queue.yml` + documentation

## Task 10: Incremental CI Unfreezing
**Prompt:**
Create a strategy document for:
- Allowing non-breaking PRs (docs, tests) to merge while CI is being fixed
- Categorizing PRs by risk level
- Temporary bypass conditions with audit trail
- Rollback plan if bad PR sneaks through

Output: `docs/ci-unfreeze-strategy.md`

## Task 11: Cross-Platform CI Status Notification
**Prompt:**
Build a notification system that:
- Monitors CI health status
- Alerts via Slack/Discord/Email when critical CI breaks
- Provides digest of CI status changes
- Links to relevant PRs and workflow runs

Output: `.github/workflows/ci-health-monitor.yml` + integration guide

---

## Execution Notes
- All tasks are independent and can be executed in parallel
- Each task should create its own branch and PR
- Tag PRs with `batch-01-ci-cd` label
- Coordinate final merge sequence to avoid conflicts

Output: `.github/workflows/ci-failure-analyzer.yml` + supporting script

## Task 7: Dependency Resolution & Lock
