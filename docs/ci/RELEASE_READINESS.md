# Release Readiness Gate

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-07

## Overview

The Release Readiness Gate is the **single authoritative check** that determines if a commit is releasable. When this check is green, you can deploy to production with confidence.

**Principle:** Green means releasable. No ambiguity.

## Quick Start

### Run Locally

```bash
# Full release readiness check (recommended before pushing)
pnpm release:ready

# Individual components
pnpm ga:verify              # TypeCheck, lint, build, unit tests
pnpm -C server test:ci      # Full test suite with coverage
bash scripts/ci/validate-workflow-filters.sh  # Workflow safety check
```

### Expected Runtime

- **Local execution:** ~5-8 minutes
- **CI execution:** ~8-12 minutes

### Prerequisites

- Node.js 20+
- pnpm 10.0.0 (via packageManager field)
- Python 3.11+ (for ruff linting)
- actionlint (auto-installed in CI, optional locally)

## What It Guarantees

When the Release Readiness workflow passes, the following is **guaranteed**:

| Guarantee             | Check                          | Details                                     |
| --------------------- | ------------------------------ | ------------------------------------------- |
| ✅ Code compiles      | `pnpm typecheck`               | All TypeScript compiles without errors      |
| ✅ Code quality       | `pnpm lint`                    | ESLint + Ruff rules pass                    |
| ✅ Builds succeed     | `pnpm build`                   | All packages build successfully             |
| ✅ Tests pass         | `pnpm test:unit`               | All unit tests pass                         |
| ✅ Coverage adequate  | `pnpm test:ci`                 | Integration tests + coverage gates          |
| ✅ Workflows valid    | `actionlint`                   | All GitHub Actions workflows are valid      |
| ✅ No filter bypasses | `validate-workflow-filters.sh` | Required checks trigger on critical changes |

## Architecture

### Script: `pnpm release:ready`

Located in: `package.json` (root)

```json
{
  "scripts": {
    "release:ready": "pnpm ga:verify && pnpm --filter intelgraph-server test:ci && bash scripts/ci/validate-workflow-filters.sh"
  }
}
```

**Execution order:**

1. `pnpm ga:verify` - GA verification (typecheck, lint, build, unit tests)
2. `pnpm --filter intelgraph-server test:ci` - Full test suite with coverage
3. `bash scripts/ci/validate-workflow-filters.sh` - Workflow filter safety

### Workflow: `.github/workflows/release-readiness.yml`

**Triggers:**

- Every PR to `main` (no path-ignore rules)
- Every push to `main` (no path-ignore rules)
- Manual trigger via `workflow_dispatch`

**Why no path-ignore rules?**

To maintain the guarantee that "green means releasable," this workflow **must run on every change**. Even documentation changes could affect release readiness if they modify critical docs or introduce malformed files.

**Concurrency control:**

- Groups by PR number or ref
- Cancels in-progress runs on new pushes
- Prevents queue buildup

### Script: `scripts/ci/validate-workflow-filters.sh`

**Purpose:** Ensures required CI workflows cannot be bypassed by path-ignore rules.

**Required workflows checked:**

- `ga-gate.yml`
- `unit-test-coverage.yml`
- `ci-core.yml`

**Critical paths protected:**

- `.github/workflows/`
- `package.json`, `pnpm-lock.yaml`, `.pnpmfile.cjs`
- `scripts/`
- `Dockerfile`

**Exit behavior:**

- Exit 0: All filters are safe
- Exit 1: Dangerous path-ignore rule detected

## Interpreting Results

### Green (Success)

```
✅ All release readiness checks passed
```

**This commit is RELEASABLE.** You may:

- Merge to main
- Tag a release
- Deploy to production

### Red (Failure)

```
❌ Release readiness check failed
```

**This commit is NOT RELEASABLE.** Action required:

1. Review the failed check in the workflow logs
2. Fix the issue locally
3. Run `pnpm release:ready` locally to verify
4. Push the fix

### Common Failure Scenarios

| Failure              | Diagnosis                            | Resolution                                                     |
| -------------------- | ------------------------------------ | -------------------------------------------------------------- |
| TypeCheck failed     | TypeScript compilation error         | Run `pnpm typecheck` locally, fix errors                       |
| Lint failed          | ESLint or Ruff rule violation        | Run `pnpm lint` locally, fix or disable rule                   |
| Build failed         | Build process error                  | Run `pnpm build` locally, check for missing deps               |
| Unit tests failed    | Test failure                         | Run `pnpm -C server test:unit`, fix failing test               |
| CI tests failed      | Integration test or coverage failure | Run `pnpm -C server test:ci`, fix test or coverage             |
| Workflow lint failed | Invalid GitHub Actions YAML          | Run `actionlint .github/workflows/`, fix syntax                |
| Filter safety failed | Dangerous path-ignore rule           | Review `validate-workflow-filters.sh` output, fix paths-ignore |

## Integration with Other Workflows

### Relationship to `ga-gate.yml`

- **ga-gate.yml:** Docker-based integration testing (full stack up/down)
- **release-readiness.yml:** Code-level verification (no Docker required)

Both are required checks. They serve different purposes:

- GA Gate: Infrastructure-level readiness
- Release Readiness: Code-level readiness

### Relationship to `unit-test-coverage.yml`

- **unit-test-coverage.yml:** Isolated coverage reporting
- **release-readiness.yml:** Includes full test suite

The Release Readiness workflow runs the same tests but provides a unified view.

## Required vs Informational

### Required (blocking merge)

- Release Readiness Gate (this workflow)
- GA Gate
- Unit Test Coverage
- CI Core
- Workflow Lint

### Informational (non-blocking)

- Performance benchmarks
- Weekly assurance
- Documentation link checks

## Local Development Workflow

### Before Creating a PR

```bash
# 1. Run fast local checks
make claude-preflight

# 2. Run full release readiness
pnpm release:ready

# 3. If green, push
git push origin your-branch
```

### During Code Review

Monitor the Release Readiness check in the PR:

- Green checkmark: Releasable
- Red X: Not releasable (review logs, fix locally)

### Before Merging

Ensure **all required checks are green**, including:

- ✅ Release Readiness Gate
- ✅ GA Gate
- ✅ Unit Test Coverage
- ✅ Workflow Lint

## Troubleshooting

### "pnpm release:ready hangs"

**Cause:** Likely a test hanging in `test:ci`.

**Fix:**

```bash
# Run tests with verbose output
pnpm -C server test:ci --verbose

# Identify hanging test, add timeout
```

### "actionlint not found"

**Cause:** actionlint is not installed locally.

**Fix (optional, for local workflow linting):**

```bash
# macOS
brew install actionlint

# Linux
bash <(curl https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)
sudo mv ./actionlint /usr/local/bin/
```

Note: actionlint is auto-installed in CI, so this is optional for local dev.

### "Workflow filter validation failed"

**Cause:** A required workflow has a dangerous `paths-ignore` rule.

**Fix:**

1. Review the output of `validate-workflow-filters.sh`
2. Identify the workflow with the problematic path-ignore
3. Remove critical paths from the ignore list OR remove paths-ignore entirely
4. Re-run validation

Example of a **dangerous** path-ignore (DO NOT DO THIS):

```yaml
paths-ignore:
  - "**.md"
  - ".github/workflows/**" # ❌ DANGEROUS: Skips workflow changes
```

Example of a **safe** path-ignore:

```yaml
paths-ignore:
  - "**.md"
  - "docs/**"
  # .github/workflows/** is NOT ignored - workflow changes trigger this
```

## FAQ

### Q: Why run this AND ga-gate?

**A:** They test different layers:

- **Release Readiness:** Code-level (typecheck, lint, build, tests)
- **GA Gate:** Infrastructure-level (Docker, services, health checks)

Both are necessary for a complete release verification.

### Q: Can I skip this workflow for hotfixes?

**A:** No. The workflow runs on all commits to main. If you need to bypass for a critical hotfix:

1. Get approval from platform lead
2. Document the exception in the PR
3. Fix the issue in a follow-up PR immediately after

**Hotfixes should be rare and exceptional.**

### Q: What if the workflow itself is broken?

**A:** If the workflow YAML is malformed:

1. The `workflow-lint` workflow will catch it before merge
2. Fix the YAML locally
3. Run `actionlint .github/workflows/release-readiness.yml` to validate
4. Push the fix

If the workflow logic is broken (e.g., a step fails incorrectly):

1. Open a hotfix PR to fix the workflow
2. Request review from platform team
3. Merge with urgency

### Q: How do I run just one component?

**A:** See "Run Locally" section. Examples:

```bash
# Just typecheck and lint
pnpm ga:verify

# Just full test suite
pnpm -C server test:ci

# Just workflow filter check
bash scripts/ci/validate-workflow-filters.sh
```

## Maintenance

### Adding a New Required Check

1. Add the check to `pnpm release:ready` script in `package.json`
2. Add the check to the workflow in `.github/workflows/release-readiness.yml`
3. Update this documentation
4. Update the guarantees table
5. Test locally with `pnpm release:ready`

### Removing a Check

1. Ensure the check is no longer needed (get approval)
2. Remove from `pnpm release:ready` script
3. Remove from the workflow
4. Update this documentation
5. Communicate the change to the team

### Modifying Failure Criteria

Be cautious when weakening checks. Any change to failure criteria should:

1. Be discussed with the team
2. Be documented in this file
3. Maintain the guarantee that "green means releasable"

**Never weaken security or compliance checks.**

## Related Documentation

- [GA Gate](./ga-hard-gates.md) - Infrastructure-level verification
- [CI Time Budget](./CI_TIME_BUDGET.md) - Performance targets for CI
- [Workflow Inventory](./workflow_inventory.md) - All CI workflows
- [Environment Testing](./environment-specific-testing.md) - Environment-specific checks

## Change Log

| Date       | Change                         | Author               |
| ---------- | ------------------------------ | -------------------- |
| 2026-01-07 | Initial implementation (MVP-4) | Platform Engineering |

---

**Remember:** Green means releasable. Red means not releasable. No ambiguity.
