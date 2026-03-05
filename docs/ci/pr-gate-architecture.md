# PR Gate Architecture

## Problem Statement

The Summit repository experienced severe CI gridlock due to **fan-out failure**:

```
Before: 900 PRs × 100+ checks = 90,000+ CI jobs
Result: Complete queue saturation, 3+ hour delays
```

## Solution: Two-Tier Gate Architecture

### Tier 1: Minimal PR Gate (Fast, Deterministic)

**Goal**: Protect correctness and security with <20 minute gate

**Workflow**: `.github/workflows/pr-gate.yml`

**Checks**:
- Lint (code quality)
- Typecheck (type safety)
- Unit tests (basic functionality)
- Build (compilation)
- Evidence ID validation (governance)
- Timestamp scan (security)

**Key Properties**:
- ✅ Runs on every PR
- ✅ Must pass to merge
- ✅ Completes in <20 minutes
- ✅ Concurrency-guarded (only latest run)
- ✅ Deterministic (no flaky tests)

### Tier 2: Main Branch Validation (Comprehensive)

**Goal**: Full validation after merge

**Workflow**: `.github/workflows/main-validation.yml` (coming in PR 3)

**Checks**:
- Integration tests
- E2E tests
- Security scans
- Performance benchmarks
- Graph validation
- Supply chain audits

**Key Properties**:
- ✅ Runs only on `main` branch
- ✅ Non-blocking (post-merge)
- ✅ Comprehensive coverage
- ✅ Can take longer (30-60 minutes)

## Expected Impact

```
CI jobs per PR: 100+ → 6-8 (94% reduction)
PR gate time: Variable → <20 min (deterministic)
Queue saturation: Eliminated
Merge train throughput: 10-20× increase
```

## Migration Path

This is **PR 1** of a 4-PR stabilization stack:

1. ✅ **PR 1**: Minimal PR gate (this PR)
2. **PR 2**: Path-filtered workflows (server/client/infra)
3. **PR 3**: Main branch validation (move heavy checks)
4. **PR 4**: CI drift sentinel (prevent regression)

## Branch Protection Changes Required

After this PR merges, update branch protection for `main`:

```
Required status checks:
  - pr-gate  ← ONLY THIS

Remove all other blocking checks
```

**Why**: Single fast gate prevents fan-out, enables predictable merge trains

## Rollback Plan

If the gate is too strict or causes issues:

1. Temporarily disable `pr-gate` requirement in branch protection
2. Re-enable specific legacy workflows as needed
3. Adjust gate criteria based on failures
4. Re-enable once stable

## Monitoring

Track these metrics post-deployment:

- **PR gate pass rate**: Should be >95%
- **PR gate duration**: Should stay <20 minutes
- **Queue depth**: Should stay <50
- **Time to merge**: Should decrease 5-10×

## References

- Original incident: `docs/analysis/runner-capacity-incident-2026-03-03.md`
- Full consolidation plan: `docs/analysis/workflow-consolidation-plan.md`
- Capacity management: `docs/runbooks/ci/workflow-capacity-management.md`
