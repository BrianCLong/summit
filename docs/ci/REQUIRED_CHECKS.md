# Required CI Checks for MVP-4 Stabilization

**Authority**: This document defines the canonical set of CI workflows that MUST pass before any release tag can be promoted from RC to GA.

**Version**: 3.0.0
**Last Updated**: 2026-01-08
**Owner**: Platform Engineering

---

## Table of Contents

1. [Overview](#overview)
2. [Policy Source of Truth](#policy-source-of-truth)
3. [Always-Required Checks](#always-required-checks)
4. [Conditionally-Required Checks](#conditionally-required-checks)
5. [Informational Checks](#informational-checks)
6. [Evaluation Examples](#evaluation-examples)
7. [Check Verification](#check-verification)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

This document establishes the **immutable contract** for release promotion safety:

> **A commit is safe for GA promotion if and only if all Required Checks are GREEN (success status).**

### Key Principle: Deterministic Evaluation

The set of required checks for any commit is **deterministically computed** based on:

1. The commit SHA being evaluated
2. The set of files changed between the commit and its base

This eliminates ambiguity: given the same inputs, the Promotion Guard always produces the same required check set.

### Scope

- **Applies to**: MVP-4 Post-GA Stabilization releases (v4.1.x)
- **Enforced by**: `scripts/release/verify-green-for-tag.sh`
- **Policy defined in**: `docs/ci/REQUIRED_CHECKS_POLICY.json`
- **Automated via**: `.github/workflows/release-promote-guard.yml`

---

## Policy Source of Truth

The canonical policy is defined in machine-readable format:

**Primary (YAML)**:

```
docs/ci/REQUIRED_CHECKS_POLICY.yml
```

**Legacy (JSON)** - still supported:

```
docs/ci/REQUIRED_CHECKS_POLICY.json
```

This file contains:

- **always_required**: Checks that must pass for every commit
- **conditional_required**: Checks required only when specific paths change
- **informational**: Checks that provide signals but don't block promotion
- **base_selection**: Rules for computing the base reference for changed file detection

The Promotion Guard script (`verify-green-for-tag.sh`) reads this policy file to compute the required set. It prefers YAML format when `yq` is available, with fallback to JSON.

### Base Reference Computation

The base reference determines which files are considered "changed" for conditional check evaluation. This is computed by `scripts/release/compute_base_for_commit.sh`:

| Tag Type | Base Selection                                              |
| -------- | ----------------------------------------------------------- |
| RC Tag   | Previous RC (same version) → Previous GA → merge-base main  |
| GA Tag   | Same base as corresponding RC (ensures identical check set) |
| Manual   | Explicit `--base` parameter required                        |

Both RC and GA pipelines use identical base selection rules, ensuring consistent check evaluation across the release lifecycle.

---

## Always-Required Checks

These workflows **MUST** complete with `conclusion: success` for **every** commit promoted to GA.

### 1. Release Readiness Gate

| Field    | Value                                     |
| -------- | ----------------------------------------- |
| Workflow | `.github/workflows/release-readiness.yml` |
| Name     | `Release Readiness Gate`                  |
| Triggers | Every PR/push to main (NO path filters)   |

**Guarantees**:

- All TypeScript compiles without errors
- All ESLint and Ruff rules pass
- All packages build successfully
- All unit tests pass
- All integration tests pass with coverage
- All workflow files are valid (actionlint)
- Required workflows trigger on critical changes

### 2. GA Gate

| Field    | Value                                   |
| -------- | --------------------------------------- |
| Workflow | `.github/workflows/ga-gate.yml`         |
| Name     | `GA Gate`                               |
| Triggers | PRs/pushes to main (docs-only excluded) |

**Guarantees**:

- Executes canonical `make ga` command
- Generates GA snapshot with CI/release metadata
- Verifies all GA-readiness criteria

### 3. Unit Tests & Coverage

| Field    | Value                                           |
| -------- | ----------------------------------------------- |
| Workflow | `.github/workflows/unit-test-coverage.yml`      |
| Name     | `Unit Tests & Coverage`                         |
| Triggers | PRs/pushes to main/develop (docs-only excluded) |

**Guarantees**:

- All server unit tests pass via `pnpm test:ci`
- Coverage meets minimum thresholds
- Test results are deterministic

### 4. CI Core (Primary Gate)

| Field    | Value                           |
| -------- | ------------------------------- |
| Workflow | `.github/workflows/ci-core.yml` |
| Name     | `CI Core (Primary Gate)`        |
| Triggers | PRs/pushes to main, merge queue |

**Guarantees**:

- Lint & Typecheck passes
- Unit tests pass
- Integration tests pass (with Postgres + Redis services)
- Verification suite completes
- Build is deterministic (bit-for-bit reproducible)
- Golden path smoke test succeeds

---

## Conditionally-Required Checks

These workflows are required **only when specific file paths are changed**.

### 1. Workflow Lint

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Workflow      | `.github/workflows/workflow-lint.yml`                  |
| Name          | `Workflow Lint`                                        |
| Required when | `.github/workflows/**` or `.github/actions/**` changes |

**Path patterns**:

```regex
^\.github/workflows/.*
^\.github/actions/.*
```

**Guarantees**:

- All GitHub Actions workflow files are syntactically valid
- All shell scripts in workflows pass ShellCheck
- No dangerous patterns (e.g., bypassing required checks)

### 2. CodeQL

| Field         | Value                                     |
| ------------- | ----------------------------------------- |
| Workflow      | `.github/workflows/codeql.yml`            |
| Name          | `CodeQL`                                  |
| Required when | `server/`, `packages/`, or `cli/` changes |

**Path patterns**:

```regex
^server/
^packages/
^cli/
```

**Guarantees**:

- Security analysis for TypeScript/JavaScript code
- No high-severity vulnerabilities introduced

### 3. SBOM & Vulnerability Scanning

| Field         | Value                                            |
| ------------- | ------------------------------------------------ |
| Workflow      | `.github/workflows/sbom-vuln-scan.yml`           |
| Name          | `SBOM & Vulnerability Scanning`                  |
| Required when | Docker, dependencies, or security scripts change |

**Path patterns**:

```regex
^Dockerfile
^docker-compose
^package\.json$
^pnpm-lock\.yaml$
^server/package\.json$
^\.github/workflows/supply-chain
^scripts/security/
```

### 4. Docker Build & Security Scan

| Field         | Value                                     |
| ------------- | ----------------------------------------- |
| Workflow      | `.github/workflows/docker-build-scan.yml` |
| Name          | `Docker Build & Security Scan`            |
| Required when | Docker configuration changes              |

**Path patterns**:

```regex
^Dockerfile
^docker-compose
^\.dockerignore$
```

---

## Informational Checks

These workflows provide valuable signals but are **NOT** blocking for promotion:

| Workflow                  | Purpose                         |
| ------------------------- | ------------------------------- |
| Release Train             | Automated release orchestration |
| Post-Release Canary       | Post-deployment smoke tests     |
| PR Quality Gate           | Additional PR quality metrics   |
| Release Reliability       | Release success metrics         |
| AI Copilot Canary         | AI feature monitoring           |
| Performance Baseline (k6) | Performance benchmarks          |
| CI Legacy (Non-Blocking)  | Legacy compatibility checks     |

---

## Evaluation Examples

### Example 1: Documentation-Only Change

**Changed files**:

```
docs/README.md
docs/api/endpoints.md
```

**Required checks**:

- ✅ Release Readiness Gate (always required)
- ✅ GA Gate (always required)
- ✅ Unit Tests & Coverage (always required)
- ✅ CI Core (Primary Gate) (always required)
- ⏭️ Workflow Lint (SKIPPED - no workflow changes)
- ⏭️ CodeQL (SKIPPED - no code changes)
- ⏭️ SBOM & Vulnerability Scanning (SKIPPED - no dependency changes)

### Example 2: Workflow Change

**Changed files**:

```
.github/workflows/ci-core.yml
docs/ci/workflow-guide.md
```

**Required checks**:

- ✅ Release Readiness Gate (always required)
- ✅ GA Gate (always required)
- ✅ Unit Tests & Coverage (always required)
- ✅ CI Core (Primary Gate) (always required)
- ✅ Workflow Lint (**REQUIRED** - `.github/workflows/` changed)
- ⏭️ CodeQL (SKIPPED - no code changes)
- ⏭️ SBOM & Vulnerability Scanning (SKIPPED - no dependency changes)

### Example 3: Server Code Change

**Changed files**:

```
server/src/routes/health.ts
server/tests/health.test.ts
```

**Required checks**:

- ✅ Release Readiness Gate (always required)
- ✅ GA Gate (always required)
- ✅ Unit Tests & Coverage (always required)
- ✅ CI Core (Primary Gate) (always required)
- ⏭️ Workflow Lint (SKIPPED - no workflow changes)
- ✅ CodeQL (**REQUIRED** - `server/` changed)
- ⏭️ SBOM & Vulnerability Scanning (SKIPPED - no dependency changes)

### Example 4: Dependency Update

**Changed files**:

```
package.json
pnpm-lock.yaml
server/package.json
```

**Required checks**:

- ✅ Release Readiness Gate (always required)
- ✅ GA Gate (always required)
- ✅ Unit Tests & Coverage (always required)
- ✅ CI Core (Primary Gate) (always required)
- ⏭️ Workflow Lint (SKIPPED - no workflow changes)
- ⏭️ CodeQL (SKIPPED - no code changes)
- ✅ SBOM & Vulnerability Scanning (**REQUIRED** - dependency files changed)

---

## Check Verification

### Manual Verification

Use the `verify-green-for-tag.sh` script to check if a commit is safe for promotion:

```bash
# Verify with automatic base detection
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1

# Verify specific commit with explicit base
./scripts/release/verify-green-for-tag.sh \
  --tag v4.1.2-rc.1 \
  --commit a8b1963 \
  --base origin/main~5

# Verbose output with full workflow data
./scripts/release/verify-green-for-tag.sh \
  --tag v4.1.2-rc.1 \
  --verbose
```

### Truth Table Output

The verification script produces a **Gate Truth Table** showing the status of each check:

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                          PROMOTION GATE TRUTH TABLE                            ║
╠════════════════════════════════════════════════════════════════════════════════╣
║ Tag:    v4.1.2-rc.1
║ Commit: a8b1963 (a8b19638b58452371e7749f714e2b9bea9f482ad)
║ Base:   79a2dee (origin/main~1)
║ Changed: 3 files
╚════════════════════════════════════════════════════════════════════════════════╝

WORKFLOW                            | REQUIRED   | STATUS      | RESULT
────────────────────────────────────────────────────────────────────────────────────
Release Readiness Gate              | ALWAYS     | ✅ SUCCESS  | PASS
GA Gate                             | ALWAYS     | ✅ SUCCESS  | PASS
Unit Tests & Coverage               | ALWAYS     | ✅ SUCCESS  | PASS
CI Core (Primary Gate)              | ALWAYS     | ✅ SUCCESS  | PASS
Workflow Lint                       | CONDITIONAL| ⏭️ SKIPPED  | N/A (not required)
CodeQL                              | CONDITIONAL| ✅ SUCCESS  | PASS
SBOM & Vulnerability Scanning       | CONDITIONAL| ⏭️ SKIPPED  | N/A (not required)

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

### Workflow Not Running (But Required)

**Symptom**: Required workflow missing from commit status

**Diagnosis**:

```bash
# Check what files changed
git diff --name-only origin/main~1..HEAD

# Check if workflow is required for those changes
./scripts/release/verify-green-for-tag.sh --tag vX.Y.Z --verbose
```

**Resolution**:

1. If workflow should have triggered, check workflow's path filters
2. If workflow is disabled, enable in repository settings
3. Push a no-op change to trigger missing workflow

### Workflow Marked SKIPPED But Should Be Required

**Symptom**: Conditional workflow shows SKIPPED but you expected it to run

**Diagnosis**:

1. Check the changed files: `git diff --name-only <base>..<commit>`
2. Check the path patterns in `REQUIRED_CHECKS_POLICY.json`
3. Verify the regex patterns match your changed files

**Resolution**:

1. Update path patterns in policy if incorrect
2. Use `--base` flag to specify correct base reference
3. Verify you're checking the correct commit SHA

### Emergency Bypass

**DANGER**: Only for critical hotfixes under incident response

If a promotion must proceed without green checks:

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

---

## Testing Policy Changes

### CI Enforcement

The policy engine is protected by automated tests in `.github/workflows/release-policy-tests.yml`:

- **Triggers**: Any change to policy files, scripts, or tests
- **Tests**:
  - Policy engine unit tests (requiredness computation)
  - Base selection unit tests (base computation algorithm)
  - Verify-green contract tests (output format stability)

### Run Tests Locally

```bash
# Run all tests
./scripts/release/tests/policy_engine.test.sh
./scripts/release/tests/base_selection.test.sh
./scripts/release/tests/verify_green_contract.test.sh
```

### Offline Test Mode

The `verify-green-for-tag.sh` script supports offline mode for deterministic testing:

```bash
# Run with offline status map (no GitHub API calls)
./scripts/release/verify-green-for-tag.sh \
  --tag v1.0.0-rc.1 \
  --offline-policy-file path/to/policy.json \
  --offline-status-file path/to/status.json \
  --offline-changed-files path/to/changed_files.txt \
  --base test-base \
  --commit abc123
```

**Offline Status File Format**:

```json
{
  "CI Core": "success",
  "Unit Tests": "success",
  "Workflow Lint": "failure",
  "CodeQL": "success"
}
```

**Changed Files Format** (one per line):

```
.github/workflows/ci.yml
server/src/app.ts
```

### How to Add a New Conditional Check

1. Edit `docs/ci/REQUIRED_CHECKS_POLICY.yml`:

   ```yaml
   conditional_required:
     - name: "New Check Name"
       workflow: "new-check.yml"
       rationale: "Why this check is needed"
       when_paths_match:
         - "^pattern/to/match/"
   ```

2. Add test fixtures:
   - Create `scripts/release/tests/fixtures/changed_<scenario>.txt`
   - Update `scripts/release/tests/fixtures/status_all_success.json`

3. Add test case to `policy_engine.test.sh`

4. Run tests locally before pushing

5. CI will enforce tests pass before merge

---

## References

- **Policy File (YAML)**: `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- **Policy File (JSON)**: `docs/ci/REQUIRED_CHECKS_POLICY.json`
- **Base Computation**: `scripts/release/compute_base_for_commit.sh`
- **Verification Script**: `scripts/release/verify-green-for-tag.sh`
- **Policy Tests**: `scripts/release/tests/`
- **Test CI Workflow**: `.github/workflows/release-policy-tests.yml`
- **RC Pipeline**: `docs/ci/RELEASE_RC_PIPELINE.md`
- **GA Pipeline**: `docs/ci/RELEASE_GA_PIPELINE.md`
- **Promotion Guide**: `docs/releases/MVP-4_STABILIZATION_PROMOTION.md`
- **Tagging Guide**: `docs/releases/MVP-4_STABILIZATION_TAGGING.md`
- **GA Definition**: `docs/GA_DEFINITION.md`

---

## Change History

| Version | Date       | Changes                                           |
| ------- | ---------- | ------------------------------------------------- |
| 1.0.0   | 2026-01-07 | Initial version with 5 required workflows         |
| 2.0.0   | 2026-01-08 | Add conditional required checks with path rules   |
| 3.0.0   | 2026-01-08 | Add YAML policy format, base computation section  |
| 3.1.0   | 2026-01-08 | Add offline test mode, unit tests, CI enforcement |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
