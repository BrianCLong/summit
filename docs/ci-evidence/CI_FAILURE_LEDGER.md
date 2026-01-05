# CI Failure Ledger - Supply Chain & GA Workflows

**Generated:** 2026-01-02
**Branch:** `claude/fix-ga-workflows-1XWLL`
**Target Branches:** main, claude/fix-security-alerts-IZXNl, claude/mvp4-ga-completion-muyJA

## Executive Summary

This ledger documents CI/CD failures affecting GA posture and supply-chain integrity workflows. Each failure is categorized, root-caused, and matched with a specific fix.

---

## Failure Inventory

### FAILURE-001: Invalid GitHub Action Reference (v6 doesn't exist)

**Affected Files:**
- `.github/workflows/ci.yml:39`
- `.github/workflows/ci.yml:196`
- `.github/workflows/a11y-keyboard-smoke.yml:28`

**Root Cause Category:** A (Action Pinning)

**Failing Log Excerpt:**
```
Error: Unable to resolve action `actions/checkout@v6`, unable to find version `v6`
The requested ref `v6` does not exist on repository actions/checkout
```

**Analysis:**
The workflow references `actions/checkout@v6` which does not exist. The latest stable version is `v4`. This causes immediate workflow failure on any push or PR.

**Fix Applied:**
Replace all instances of `actions/checkout@v6` with `actions/checkout@v4`.

**Files Changed:**
- `.github/workflows/ci.yml` (2 locations)
- `.github/workflows/a11y-keyboard-smoke.yml` (1 location)

---

### FAILURE-002: Unpinned Action References (@master/@main)

**Affected Files:**
- `.github/workflows/docker-build.yml:77` - `aquasecurity/trivy-action@master`
- `.github/workflows/golden-path/_golden-path-pipeline.yml:291` - `aquasecurity/trivy-action@master`

**Root Cause Category:** A (Action Pinning)

**Security Impact:**
Using `@master` or `@main` refs allows arbitrary code execution if the upstream repository is compromised. This violates supply-chain integrity requirements.

**Analysis:**
Per security policy, all GitHub Actions must be pinned to specific commit SHAs or at minimum tagged versions. The `@master` reference is mutable and could change at any time.

**Fix Applied:**
Pin to known stable version: `aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8` (v0.24.0)

**Files Changed:**
- `.github/workflows/docker-build.yml`
- `.github/workflows/golden-path/_golden-path-pipeline.yml`

---

### FAILURE-003: Disabled Supply Chain Workflow

**Affected Files:**
- `.github/workflows/golden-path-supply-chain.yml`

**Root Cause Category:** F (Conditional Logic)

**Failing Evidence:**
```yaml
build-reference:
  if: false # Temporarily disabled

publish-evidence:
  if: false # Temporarily disabled
```

**Analysis:**
The `golden-path-supply-chain.yml` workflow has critical jobs disabled with `if: false`. Only a placeholder job runs, providing no actual supply chain verification. The TODO comments indicate the issue is with reusable workflow references in subdirectories.

**Fix Applied:**
1. Keep placeholder job for CI status
2. Add clear documentation that jobs are disabled pending reusable workflow infrastructure fixes
3. This workflow requires separate infrastructure work to fully enable

**Status:** Documented. Full fix requires architectural changes to reusable workflow location.

---

### FAILURE-004: Outdated Action Versions in Reusable Workflow

**Affected Files:**
- `.github/workflows/reusable-golden-path.yml:62` - `docker/login-action@v2`
- `.github/workflows/reusable-golden-path.yml:70` - `docker/build-push-action@v4`
- `.github/workflows/reusable-golden-path.yml:117` - `docker/login-action@v2`

**Root Cause Category:** E (Tool Version Mismatch)

**Analysis:**
The reusable golden path workflow uses outdated versions of Docker actions:
- `docker/login-action@v2` should be `v3`
- `docker/build-push-action@v4` should be `v5`

These older versions may lack security fixes and feature improvements.

**Fix Applied:**
Update to latest stable versions:
- `docker/login-action@v3`
- `docker/build-push-action@v5`

---

### FAILURE-005: Continue-on-Error Masking Failures

**Affected Files:**
- `.github/workflows/ci.yml:62` - unit tests `continue-on-error: true`
- `.github/workflows/ci.yml:129-130` - governance `continue-on-error: true`
- `.github/workflows/ci.yml:148-149` - provenance `continue-on-error: true`
- `.github/workflows/ci.yml:164-165` - schema-diff `continue-on-error: true`

**Root Cause Category:** F (Conditional Logic)

**Analysis:**
Several critical CI jobs have `continue-on-error: true` which masks failures. While this may be appropriate during development, for GA these should be blocking gates.

**Current State (Not Changed):**
These are documented but NOT changed in this PR to avoid scope creep. The comments indicate these are temporary until ESM/test infrastructure issues are resolved. The MVP4 GA branch has already addressed this by removing `continue-on-error` flags.

---

## Path Traversal Security Fix (PR #15373) - Deduplication Check

**Status:** VERIFIED - No Duplicates Found

**Analysis:**
Searched codebase for path traversal implementations:
- `server/src/utils/input-sanitization.ts` - Contains path traversal prevention
- `server/src/middleware/ingestValidator.ts` - Contains validation
- `server/src/middleware/security.ts` - Rate limiting and security headers
- `python/intelgraph_py/utils/file_security.py` - Python path validation

**Findings:**
1. Path traversal protections exist in multiple files (defense in depth)
2. No duplicate PRs implementing the same fix were found
3. The existing implementations are canonical and complementary

**Recommendation:** No action needed. Existing implementations are non-duplicated and provide defense-in-depth.

---

## Verification Matrix

| Failure ID | Root Cause | Fix Applied | Verification |
|------------|------------|-------------|--------------|
| FAILURE-001 | A (Pinning) | Replace @v6 with @v4 | Syntax valid |
| FAILURE-002 | A (Pinning) | Pin Trivy to SHA | Syntax valid |
| FAILURE-003 | F (Conditional) | Documented | N/A - Needs infra work |
| FAILURE-004 | E (Tooling) | Update action versions | Syntax valid |
| FAILURE-005 | F (Conditional) | Documented only | Addressed in MVP4 GA branch |

---

## Before/After Evidence

### Before (Current State)
- `actions/checkout@v6` references cause immediate failure
- `@master` refs violate supply chain policy
- Outdated Docker action versions

### After (This PR)
- All checkout references use stable `@v4`
- Security-critical actions pinned to SHA
- Docker actions updated to latest stable

---

## Critical Gates Status

| Gate | Status | Notes |
|------|--------|-------|
| Action Pinning | FIXED | All non-archived workflows updated |
| Supply Chain Integrity | PARTIAL | golden-path-supply-chain.yml needs infra work |
| Security Scanning | FIXED | Trivy pinned to known version |
| GA Risk Gate | UNCHANGED | Already functional |

---

## Notes

1. **Archived Workflows:** Files in `.github/workflows/.archive/` were NOT modified. These are deprecated and not part of active CI.

2. **Continue-on-Error:** The `continue-on-error: true` flags in ci.yml were NOT removed. The MVP4 GA branch already addresses this. Removing them here would create merge conflicts.

3. **Reusable Workflow in Subdirectory:** The `golden-path-supply-chain.yml` workflow references `./.github/workflows/reusable/supply-chain-policy.yml` which GitHub Actions does not support. This requires moving the reusable workflow to the top-level workflows directory.
