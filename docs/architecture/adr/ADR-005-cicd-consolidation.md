# ADR-005: CI/CD Pipeline Consolidation

**Status**: Proposed
**Date**: 2025-11-21
**Deciders**: Architecture Team, DevOps Team
**Technical Story**: Reduce CI/CD complexity from 212 workflows to 10-20

## Context and Problem Statement

The Summit repository has **212 active GitHub workflows**, creating:
- Maintenance burden (each workflow needs updates)
- Confusion about which workflow runs when
- Overlapping functionality (multiple CI workflows)
- Long feedback times (workflows compete for runners)
- Inconsistent quality gates

**Current workflow categories:**
- `ci.yml`, `ci-main.yml`, `ci.unified.yml`, `ci-comprehensive.yml` - Overlapping CI
- 20+ deployment workflows (one per environment/service)
- 50+ utility workflows (linting, scanning, releasing)
- 100+ archived/experimental workflows

## Decision Drivers

- Reduce maintenance overhead
- Faster PR feedback (<10 min)
- Consistent quality gates
- Clear workflow ownership
- Cost efficiency (fewer workflow runs)

## Considered Options

### Option 1: Consolidated Workflow Architecture (Recommended)
Merge into **10-15 core workflows** with reusable components.

### Option 2: Workflow Matrix Strategy
Use GitHub Actions matrix to run everything in one workflow.

**Rejected**: Single workflow becomes complex, harder to debug, all-or-nothing failures.

### Option 3: External CI System
Migrate to CircleCI, Jenkins, or other CI system.

**Rejected**: High migration cost, GitHub Actions is sufficient when organized properly.

## Decision Outcome

**Chosen Option: Option 1 - Consolidated Workflow Architecture**

### Target Workflow Structure

```
.github/workflows/
├── ci.yml                    # Primary CI for all PRs
├── ci-main.yml              # Post-merge to main branch
├── release.yml              # Semantic release
├── deploy-staging.yml       # Deploy to staging
├── deploy-production.yml    # Deploy to production
├── security.yml             # Security scanning (nightly)
├── dependency-review.yml    # PR dependency audit
├── docs.yml                 # Documentation builds
├── cleanup.yml              # Scheduled cleanup jobs
└── reusable/                # Reusable workflow components
    ├── build.yml
    ├── test.yml
    ├── lint.yml
    ├── docker.yml
    └── deploy.yml
```

**Total: 10 primary workflows + 5 reusable components**

### Primary CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Determine what changed
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            api: 'services/api/**'
            web: 'apps/web/**'
            packages: 'packages/**'

  # Parallel quality checks
  lint:
    needs: changes
    uses: ./.github/workflows/reusable/lint.yml
    with:
      packages: ${{ needs.changes.outputs.packages }}

  typecheck:
    needs: changes
    uses: ./.github/workflows/reusable/build.yml
    with:
      command: typecheck
      packages: ${{ needs.changes.outputs.packages }}

  test:
    needs: changes
    uses: ./.github/workflows/reusable/test.yml
    with:
      packages: ${{ needs.changes.outputs.packages }}

  # Build only if quality checks pass
  build:
    needs: [lint, typecheck, test]
    uses: ./.github/workflows/reusable/build.yml
    with:
      command: build
      packages: ${{ needs.changes.outputs.packages }}

  # Security scanning
  security:
    needs: changes
    if: github.event_name == 'pull_request'
    uses: ./.github/workflows/reusable/security.yml

  # Summary
  ci-success:
    needs: [lint, typecheck, test, build]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All CI checks passed!"
```

### Reusable Build Workflow

```yaml
# .github/workflows/reusable/build.yml
name: Build

on:
  workflow_call:
    inputs:
      command:
        type: string
        default: 'build'
      packages:
        type: string
        description: 'JSON array of packages to build'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Turbo cache
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
            turbo-${{ runner.os }}-

      - name: Run ${{ inputs.command }}
        run: |
          if [ -n "${{ inputs.packages }}" ]; then
            # Build only affected packages
            turbo run ${{ inputs.command }} --filter='[${{ inputs.packages }}]'
          else
            # Build everything
            turbo run ${{ inputs.command }}
          fi
```

### Change-Based CI

Only run jobs for affected packages:

```yaml
# Path filters for affected package detection
filters: |
  api:
    - 'services/api/**'
    - 'packages/common-types/**'
    - 'packages/graph-utils/**'
  web:
    - 'apps/web/**'
    - 'packages/ui-components/**'
  auth:
    - 'services/auth/**'
    - 'packages/auth-utils/**'
```

**Expected improvement**: 60-80% faster CI for small PRs

### Workflow Migration Plan

#### Phase 1: Audit (Week 1)
1. Inventory all 212 workflows
2. Categorize by purpose (CI, deploy, utility, experimental)
3. Identify overlaps and redundancies
4. Document workflow dependencies

#### Phase 2: Consolidate CI (Week 2)
1. Create unified `ci.yml` with reusable components
2. Implement change detection
3. Test on feature branch
4. Migrate PR checks to new workflow

#### Phase 3: Consolidate Deployment (Week 3)
1. Create environment-specific deploy workflows
2. Implement approval gates
3. Add rollback capabilities
4. Remove old deployment workflows

#### Phase 4: Cleanup (Week 4)
1. Archive unused workflows to `.github/workflows/.archive/`
2. Update documentation
3. Train team on new workflow structure
4. Monitor and iterate

### Workflow Ownership

| Workflow | Owner | Approval Required |
|----------|-------|-------------------|
| `ci.yml` | Platform Team | No |
| `release.yml` | Platform Team | Tech Lead |
| `deploy-staging.yml` | DevOps Team | No |
| `deploy-production.yml` | DevOps Team | 2 approvals |
| `security.yml` | Security Team | No |

### Quality Gates

All PRs must pass:
1. **Lint** - ESLint, Prettier
2. **Typecheck** - TypeScript compilation
3. **Test** - Unit and integration tests
4. **Build** - Turbo build succeeds
5. **Security** - No high/critical vulnerabilities

Deployment gates:
1. **Staging** - CI passes, branch is `develop` or `release/*`
2. **Production** - CI passes, branch is `main`, 2 approvals

## Consequences

### Positive
- 95% reduction in workflow count (212 → 10)
- Faster PR feedback (target: <10 min)
- Consistent quality gates
- Easier maintenance
- Lower CI costs (fewer redundant runs)

### Negative
- Migration effort required
- Team needs to learn new structure
- Consolidated workflows may be complex

### Risks

| Risk | Mitigation |
|------|------------|
| Breaking existing CI | Run new and old workflows in parallel during migration |
| Complex reusable workflows | Document thoroughly, add comments |
| Missing edge cases | Gradual migration, monitor failures |

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Workflow count | 212 | 10-15 |
| PR feedback time | 15-20 min | <10 min |
| CI cost/month | $X | 50% reduction |
| Failed workflow rate | Unknown | <5% |

## Related Documents

- [Monorepo Refactoring Plan](../MONOREPO_REFACTORING_PLAN.md)
- [ADR-003: Build Optimization](./ADR-003-build-optimization.md)
- [GitHub Actions Reusable Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
