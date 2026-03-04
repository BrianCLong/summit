# Main Branch Validation

## Overview

The `main-validation.yml` workflow runs comprehensive validation **only on the main branch after merge**. This is Tier 2 of the two-tier gate architecture.

## Problem Statement

Running heavy checks (integration tests, E2E, security scans) on every PR:
- Slows down PR feedback loop
- Saturates CI capacity
- Blocks merge trains
- Creates false urgency (PRs blocked on slow tests)

## Solution: Post-Merge Validation

Heavy checks run **after** merge to main:
- ✅ PRs stay fast (<20 min gate)
- ✅ Full coverage maintained (runs on main)
- ✅ CI capacity preserved
- ✅ Merge trains flow smoothly

## Validation Jobs

### 1. integration
**Duration**: ~15-20 minutes
**Purpose**: Test inter-service communication
**Runs**: `pnpm test:integration`

Tests:
- API integration
- Database interactions
- Service-to-service communication
- Message queue operations

### 2. security
**Duration**: ~10 minutes
**Purpose**: Dependency vulnerability scanning
**Runs**: `pnpm audit`

Checks:
- npm package vulnerabilities
- Known CVEs in dependencies
- License compliance
- Security advisories

### 3. graph-validation
**Duration**: ~5-10 minutes
**Purpose**: Validate graph database consistency
**Runs**: `node scripts/graph_postgres_validator.mjs`

Validates:
- Postgres ↔ Neo4j consistency
- Graph schema integrity
- Referential integrity
- Data quality checks

**Requires secrets**:
- `DATABASE_URL` - Postgres connection
- `NEO4J_URL` - Neo4j connection
- `NEO4J_PASSWORD` - Neo4j auth

### 4. e2e
**Duration**: ~30-45 minutes
**Purpose**: End-to-end user journey testing
**Runs**: `pnpm test:e2e`

Tests:
- Complete user workflows
- Browser-based interactions
- UI/UX validation
- Cross-browser compatibility

**Artifacts**: Playwright reports (retained 30 days)

## Trigger Conditions

Runs on:
- ✅ Direct push to `main` (rare, should be prevented)
- ✅ Merge queue completion → `main`
- ✅ `merge_group` events

Does NOT run on:
- ❌ Pull requests
- ❌ Feature branches
- ❌ Draft PRs

## Concurrency Strategy

```yaml
concurrency:
  group: main-validation-${{ github.sha }}
  cancel-in-progress: true
```

**Why per-SHA concurrency**:
- Each commit to main gets its own validation
- Multiple merges can validate in parallel
- Faster merge train throughput

**Why cancel-in-progress**:
- If a new commit lands, cancel older validation
- Prioritize latest main state
- Reduce wasted CI on superseded commits

## Failure Handling

### What happens if main-validation fails?

**Short answer**: Main branch has the failure, but it doesn't block ongoing PR merges.

**Process**:
1. main-validation fails on commit ABC
2. Alert sent to team (GitHub notifications, Slack, etc.)
3. Investigate failure (flaky test? real bug?)
4. Fix via hotfix PR (goes through pr-gate)
5. Hotfix merges → new main-validation run
6. Validates successfully → resolved

### Why this is OK

- ✅ main-validation is **detective**, not **preventive**
- ✅ pr-gate already prevented obvious issues
- ✅ Failures are typically:
  - Flaky tests (retry)
  - Environment issues (fix infra)
  - Race conditions (fix test)
  - Actual bugs (rare, caught quickly)

### Revert strategy

If main is broken:
1. Identify breaking commit via main-validation history
2. Create revert PR: `git revert <sha>`
3. Revert PR goes through pr-gate (fast)
4. Merge revert → main restored

**Time to revert**: ~5-10 minutes (pr-gate duration)

## Comparison: PR Gate vs Main Validation

| Aspect | PR Gate | Main Validation |
|--------|---------|-----------------|
| **When** | Every PR | Only on main |
| **Duration** | <20 min | 30-60 min |
| **Blocks merge** | Yes | No |
| **Coverage** | Essential | Comprehensive |
| **Flaky tolerance** | Zero | Moderate |
| **Failure impact** | PR blocked | Alert only |

## Metrics to Track

Monitor:
- **Pass rate**: Should be >95% (pr-gate catches most issues)
- **Duration**: Should stay <60 minutes total
- **Failure causes**: Categorize (flaky, infra, real bugs)
- **Time to fix**: How long to resolve failures

**Alerts**:
- ⚠️ Pass rate <90% → Investigate pr-gate coverage
- ⚠️ Duration >60 min → Optimize or parallelize
- ⚠️ Same failure 3+ times → Flaky test, fix or skip

## Future Enhancements

Potential additions (not yet implemented):

### Performance Benchmarks
```yaml
- name: Run benchmarks
  run: pnpm benchmark
- name: Compare to baseline
  run: node scripts/compare_benchmarks.mjs
```

### Supply Chain Audit
```yaml
- name: Generate SBOM
  run: syft packages . -o spdx-json
- name: Verify signatures
  run: node scripts/verify_signatures.mjs
```

### Deployment Readiness
```yaml
- name: Build production assets
  run: pnpm build:prod
- name: Validate artifacts
  run: node scripts/validate_build.mjs
```

## Migration from Old Workflows

Many existing workflows should move here:

**Current**: Run on every PR
```
.github/workflows/comprehensive-test-suite.yml
.github/workflows/e2e-tests.yml
.github/workflows/security-scan.yml
.github/workflows/integration-tests.yml
```

**Future**: Consolidated into main-validation.yml
- Remove from PR triggers
- Add equivalent jobs to main-validation
- Verify coverage with test runs

**Expected workflow reduction**: 45 → 15 workflows (PR 4 will add tooling to enforce this)

## References

- PR gate architecture: `docs/ci/pr-gate-architecture.md`
- Path filtering strategy: `docs/ci/path-filtering-strategy.md`
- Consolidation plan: `docs/analysis/workflow-consolidation-plan.md`
- GitHub merge queues: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
