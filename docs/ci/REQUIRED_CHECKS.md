# Required CI Checks for MVP-4 Stabilization

**Authority**: This document defines the canonical set of CI workflows that MUST pass before any release tag can be promoted from RC to GA.

**Version**: 1.0.0
**Last Updated**: 2026-01-07
**Owner**: Platform Engineering

---

## Table of Contents

1. [Overview](#overview)
2. [Required Checks](#required-checks)
3. [Informational Checks](#informational-checks)
4. [Check Verification](#check-verification)
5. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

This document establishes the **immutable contract** for release promotion safety:

> **A commit is safe for GA promotion if and only if all Required Checks are GREEN (success status).**

### Scope

- **Applies to**: MVP-4 Post-GA Stabilization releases (v4.1.x)
- **Enforced by**: `scripts/release/verify-green-for-tag.sh`
- **Automated via**: `.github/workflows/release-promote-guard.yml`

### Principles

1. **No Ambiguity**: Green means releasable. Red means blocked.
2. **No Bypass**: Required checks cannot be skipped (except documented emergency procedures)
3. **Deterministic**: Same commit + same checks = same promotion decision
4. **Auditable**: All promotion decisions generate evidence artifacts

---

## Required Checks

These workflows **MUST** complete with `conclusion: success` for any commit to be promoted to GA.

### 1. Release Readiness Gate

**Workflow**: `.github/workflows/release-readiness.yml`
**Name**: `Release Readiness Gate`

**Purpose**: Comprehensive release readiness verification

**Guarantees**:

- All TypeScript compiles without errors
- All ESLint and Ruff rules pass
- All packages build successfully
- All unit tests pass
- All integration tests pass with coverage
- All workflow files are valid (actionlint)
- Required workflows trigger on critical changes

**Triggers**:

- Every PR to main (no path filters)
- Every push to main (no path filters)
- Manual trigger (workflow_dispatch)

**Critical**: This workflow has **NO paths-ignore rules** to ensure it runs on every change.

---

### 2. Workflow Lint

**Workflow**: `.github/workflows/workflow-lint.yml`
**Name**: `Workflow Lint`

**Purpose**: Prevent CI breakage from malformed workflow files

**Guarantees**:

- All GitHub Actions workflow files are syntactically valid
- All shell scripts in workflows pass ShellCheck
- No dangerous patterns (e.g., bypassing required checks)

**Triggers**:

- PRs that modify `.github/workflows/**`
- Pushes to main that modify `.github/workflows/**`

**Why Required**: Ensures CI infrastructure remains functional and cannot be accidentally broken.

---

### 3. GA Gate

**Workflow**: `.github/workflows/ga-gate.yml`
**Name**: `GA Gate`

**Purpose**: Official GA verification entrypoint

**Guarantees**:

- Executes canonical `make ga` command
- Generates GA snapshot with CI/release metadata
- Verifies all GA-readiness criteria

**Triggers**:

- PRs to main (ignores docs-only changes)
- Pushes to main (ignores docs-only changes)
- Manual trigger (workflow_dispatch)

**Critical**: Uses conservative paths-ignore to prevent skipping on code/config/dependency changes.

---

### 4. Unit Tests & Coverage

**Workflow**: `.github/workflows/unit-test-coverage.yml`
**Name**: `Unit Tests & Coverage`

**Purpose**: Ensure test suite passes with adequate coverage

**Guarantees**:

- All server unit tests pass via `pnpm test:ci`
- Coverage meets minimum thresholds
- Test results are deterministic (hardened settings from commit 8434f7ae3b0)

**Triggers**:

- PRs to main/develop (ignores docs-only changes)
- Pushes to main/develop (ignores docs-only changes)

**Coverage Gates**:

- PR mode: Changed files only (--scope=changed)
- Push mode: All files (--scope=all)

---

### 5. CI Core (Primary Gate)

**Workflow**: `.github/workflows/ci-core.yml`
**Name**: `CI Core (Primary Gate)`

**Purpose**: Primary blocking gate for all PRs

**Guarantees**:

- Lint & Typecheck passes
- Unit tests pass
- Integration tests pass (with Postgres + Redis services)
- Verification suite completes
- Build is deterministic (bit-for-bit reproducible)
- Golden path smoke test succeeds

**Triggers**:

- PRs to main (ignores docs-only changes)
- Pushes to main (ignores docs-only changes)
- Merge queue events

**Critical**: All jobs are **BLOCKING** - PRs cannot merge if any job fails. No `continue-on-error` allowed.

---

## Informational Checks

These workflows provide valuable signals but are **NOT** blocking for promotion:

### Release Train

**Workflow**: `.github/workflows/release-train.yml`
**Purpose**: Automated release orchestration
**Status**: Informational (tracks release cadence)

### Post-Release Canary

**Workflow**: `.github/workflows/post-release-canary.yml`
**Purpose**: Post-deployment smoke tests
**Status**: Informational (monitors production health after release)

### PR Quality Gate

**Workflow**: `.github/workflows/pr-quality-gate.yml`
**Purpose**: Additional PR quality metrics
**Status**: Informational (provides guidance, not blocking)

### Release Reliability

**Workflow**: `.github/workflows/release-reliability.yml`
**Purpose**: Tracks release success metrics
**Status**: Informational (observability)

---

## Check Verification

### Manual Verification

Use the `verify-green-for-tag.sh` script to check if a commit is safe for promotion:

```bash
# Verify current HEAD for a specific tag
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1

# Verify specific commit
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --commit a8b1963

# Verbose output with full workflow data
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --verbose
```

### Automated Verification

Use the Release Promotion Guard workflow:

```bash
# Trigger via GitHub UI: Actions → Release Promotion Guard → Run workflow
# Or via GitHub CLI:
gh workflow run release-promote-guard.yml \
  -f version=4.1.2 \
  -f rc_tag=v4.1.2-rc.1
```

### Truth Table Output

The verification script produces a **Gate Truth Table** showing the status of each required check:

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                          PROMOTION GATE TRUTH TABLE                            ║
╠════════════════════════════════════════════════════════════════════════════════╣
║ Tag:    v4.1.2-rc.1
║ Commit: a8b1963 (a8b19638b58452371e7749f714e2b9bea9f482ad)
╚════════════════════════════════════════════════════════════════════════════════╝

WORKFLOW                            | CONCLUSION   | STATUS     | RUN URL
────────────────────────────────────────────────────────────────────────────────────
Release Readiness Gate              | ✅ SUCCESS   | completed  | https://github.com/...
Workflow Lint                       | ✅ SUCCESS   | completed  | https://github.com/...
GA Gate                             | ✅ SUCCESS   | completed  | https://github.com/...
Unit Tests & Coverage               | ✅ SUCCESS   | completed  | https://github.com/...
CI Core (Primary Gate)              | ✅ SUCCESS   | completed  | https://github.com/...

════════════════════════════════════════════════════════════════════════════════════

[SUCCESS] PROMOTION ALLOWED: All required checks passed ✅
```

### Exit Codes

The verification script uses standard exit codes:

- **0**: All required checks passed (safe to promote)
- **1**: One or more checks failed/missing (blocked)
- **2**: Invalid arguments or environment error

---

## Troubleshooting

### Workflow Not Running

**Symptom**: Required workflow missing from commit status

**Possible Causes**:

1. Workflow has `paths-ignore` rules that excluded this commit
2. Workflow is disabled in repository settings
3. Workflow file has syntax errors (check Workflow Lint)

**Resolution**:

1. Check workflow triggers in `.github/workflows/<workflow>.yml`
2. Verify workflow is enabled: Settings → Actions → Workflows
3. Run `actionlint .github/workflows/` to check syntax

### Workflow Failed

**Symptom**: Required workflow shows `conclusion: failure`

**Resolution**:

1. Click the workflow run URL in the truth table
2. Review failed job logs
3. Fix the underlying issue (test failure, build error, etc.)
4. Push fix to trigger re-run
5. Re-verify with `verify-green-for-tag.sh`

### Workflow In Progress

**Symptom**: Required workflow shows `status: in_progress`

**Resolution**:

- Wait for workflow to complete
- Monitor with: `gh run watch`
- Re-run verification script once completed

### Emergency Bypass

**DANGER**: Only for critical hotfixes under incident response

If a promotion must proceed without green checks (e.g., emergency security patch):

1. Document the incident in your incident tracker
2. Get approval from Platform Engineering lead
3. Use the workflow bypass flag:

```bash
gh workflow run release-promote-guard.yml \
  -f version=4.1.2 \
  -f rc_tag=v4.1.2-rc.1 \
  -f skip_verification=true
```

4. Create post-incident review ticket to address bypassed checks
5. Document the bypass in release notes

**Warning**: Bypassed promotions must be audited and retroactively verified within 48 hours.

---

## References

- **Promotion Guide**: `docs/releases/MVP-4_STABILIZATION_PROMOTION.md`
- **Tagging Guide**: `docs/releases/MVP-4_STABILIZATION_TAGGING.md`
- **GA Definition**: `docs/GA_DEFINITION.md`
- **CI Architecture**: `docs/ci/ARCHITECTURE.md`

---

## Change History

| Version | Date       | Changes                                   |
| ------- | ---------- | ----------------------------------------- |
| 1.0.0   | 2026-01-07 | Initial version with 5 required workflows |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-07 (or before MVP-5 kickoff)
