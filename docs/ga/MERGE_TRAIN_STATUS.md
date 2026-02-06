# GA Merge Train Status

**Generated**: 2026-02-06T07:06:00Z
**Current main SHA**: dc33ce66db
**Merge Captain**: Claude Code

## Phase 0: Repo + Auth Reality Check

- [x] GitHub CLI authenticated (scope: repo, workflow, gist, read:org)
- [x] Fetched latest main
- [x] Identified CI blocking issues

### Critical Issues Found

1. **YAML Syntax Errors in Workflows**: 39 workflow files had malformed YAML (two `uses:` or step statements concatenated on single lines), causing all CI to fail with "workflow file issue"
2. **Missing Required Check**: "Build & Package" was listed in branch protection but no workflow job provided it

## Phase 1: PR Inventory + Triage

### GA-Blocker PRs (Must Merge for GA)

| PR # | Title | Lane | Status | Priority |
|------|-------|------|--------|----------|
| 18037 | fix(ci): repair malformed YAML in workflow files | CI/Infra | CI Queued | P0 - Merge First |
| 18012 | [CRITICAL] Fix SQL injection in PgVectorSync | Security | Waiting | P0 - Security |
| 18008 | fix: pin entities@^4.5.0 to restore parse5 / Jest compatibility | CI/Test | Waiting | P1 - Test Infra |

### GA-Nice PRs (Should Merge if Time Permits)

| PR # | Title | Lane |
|------|-------|------|
| 17991 | chore(ci): Harden SBOM merge gate | Governance |
| 17990 | feat: enforce evidence timestamp guard | Governance |
| 17960 | ui: route audit + prune dead/demo routes + jest smoke | Product |

### Deferred PRs

All other PRs (~100+) are feature/docs PRs that are not GA-blocking.

## Phase 2: Merge Train Execution

### Merge Order

1. **#18037** - CI YAML Fix (unblocks all CI)
2. **#18012** - SQL Injection Fix (security baseline)
3. **#18008** - Jest Compatibility (test infrastructure)
4. (Additional governance/evidence PRs as needed)

### Current Status

| Step | PR | Status | Notes |
|------|-----|--------|-------|
| 1 | #18037 | CI Queued | Fixed 39 workflow files (2 commits) |
| 2 | #18012 | Waiting | Depends on #18037 |
| 3 | #18008 | Waiting | Depends on #18037 |

## Required Status Checks (Branch Protection)

| Check Name | Provider | Status |
|------------|----------|--------|
| Config Preflight | ci-core.yml | Pending |
| Build & Package | ci-core.yml (added) | Pending |
| Verification Suite | ci-core.yml | Pending |
| Governance Checks | ci-verify.yml | Pending |
| Schema Validation | ci-verify.yml | Pending |

## Issues & Blockers

### Resolved

- [x] YAML syntax errors in 39 workflow files (fixed in #18037)
- [x] Missing "Build & Package" job (added in #18037)

### Open

- [ ] 558 Dependabot vulnerabilities (3 critical, 405 high)
- [ ] Self-hosted runners used by ci-core.yml (may need ubuntu-latest fallback)

## Files Fixed in PR #18037

### Commit 1: Initial 4 files
- ci-core.yml, pr-gates.yml, server-typecheck.yml, verify-claims.yml

### Commit 2: Additional 35 files
- _reusable-build.yml, _reusable-ga-readiness.yml, _reusable-security-compliance.yml
- _reusable-test.yml, a11y-keyboard-smoke.yml, agent-guardrails.yml
- agentic-plan-gate.yml, ci-post-merge.yml, ci-preflight.yml
- ci-runner-drift.yml, ci-sgf.yml, ci-workflow-diff.yml, ci.yml
- comprehensive-test.yml, e2e-tests.yml, eval-skills.yml
- evidence-validate.yml, ga-evidence-attest.yml, ga-evidence-pack.yml
- ga-evidence.yml, go-live-gate.yml, go-live-release.yml
- graph-guardrail-fuzz.yml, pr-conflict-forecast.yml, prod-simulation.yml
- release-integrity.yml, release-rc.yml, security-regressions.yml
- security-supplychain.yml, security-tests.yml, semver-label.yml
- slsa-provenance.yml, smoke-gate.yml, soc-controls.yml
- supply-chain-attest.yml

## Next Steps

1. Wait for #18037 CI to complete
2. Merge #18037 to main
3. Rebase #18012 and #18008 onto main
4. Merge security fix #18012
5. Merge Jest fix #18008
6. Verify main is green
7. Proceed to Phase 3: GA Cut

---

*This document is auto-generated and will be updated as the merge train progresses.*
