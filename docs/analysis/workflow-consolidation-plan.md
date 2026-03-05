# Workflow Consolidation Plan

## Executive Summary

**Current State**: 260+ workflows, 45 workflows per PR
**Target State**: 15-20 workflows per PR
**Expected Impact**: 67% reduction in queue pressure, 60-75% faster CI

## Consolidation Opportunities

### 1. Evidence Workflows (19 → 3)

**Current workflows** (19 total):
- ci-evidence-verify.yml
- cogsec_evidence.yml
- evidence_ci_step35flash.yml
- evidence-check.yml
- evidence-collection.yml
- evidence-id-consistency.yml
- evidence-validate.yml
- evidence.yml
- export-ops-evidence.yml
- fresh-evidence-rate.yml
- ga-evidence-attest.yml
- ga-evidence-pack.yml
- ga-evidence.yml
- generate-ops-evidence-pack.yml
- governance-evidence-contracts.yml
- release-evidence-check.yml
- summit-evidence.yml
- trend-evidence.yml
- weekly-ops-evidence.yml

**Proposed consolidation**:

```yaml
# evidence-gate.yml (PR blocking)
- Combines: evidence-check, evidence-validate, ci-evidence-verify, summit-evidence
- Runs on: Every PR with path filters
- Duration: ~5 minutes
- Purpose: Block PRs with invalid evidence

# evidence-collection.yml (Post-merge)
- Combines: evidence-collection, ga-evidence-pack, ga-evidence-attest
- Runs on: push to main, scheduled
- Duration: ~3 minutes
- Purpose: Collect and package evidence for auditing

# evidence-analytics.yml (Scheduled)
- Combines: trend-evidence, fresh-evidence-rate, weekly-ops-evidence
- Runs on: schedule (daily/weekly)
- Duration: ~10 minutes
- Purpose: Generate analytics and dashboards
```

**Savings**: 19 → 3 workflows = 84% reduction

### 2. Governance Workflows (17 → 4)

**Current workflows** (17 total):
- governance-check.yml
- governance-engine.yml
- governance-meta-gate.yml
- governance-evidence-contracts.yml
- governance-policy-validation.yml
- governance-lockfile-verify.yml
- governance-regression-guard.yml
- governance-drift-check.yml
- governance-daily.yml
- governance-dashboard-publish.yml
- ai-governance.yml
- compliance-governance.yml
- narrative-governance.yml
- ux-governance.yml
- ci-governance.yml
- governance.yml
- _reusable-governance-gate.yml

**Proposed consolidation**:

```yaml
# governance-gate.yml (PR blocking)
- Combines: governance-check, governance-meta-gate, governance-policy-validation
- Runs on: Every PR with path filters (policy/**, *.rego)
- Duration: ~8 minutes
- Purpose: Block PRs that violate policies

# governance-compliance.yml (PR advisory)
- Combines: ai-governance, compliance-governance, ux-governance, narrative-governance
- Runs on: Every PR (non-blocking)
- Duration: ~5 minutes
- Purpose: Advisory compliance checks

# governance-drift.yml (Scheduled)
- Combines: governance-drift-check, governance-daily, governance-lockfile-verify
- Runs on: schedule (daily)
- Duration: ~15 minutes
- Purpose: Detect governance drift

# governance-reporting.yml (Scheduled)
- Combines: governance-dashboard-publish
- Runs on: schedule (weekly)
- Duration: ~5 minutes
- Purpose: Generate governance dashboards
```

**Savings**: 17 → 4 workflows = 76% reduction

### 3. Supply Chain Workflows (13 → 3)

**Current workflows** (13 total):
- ci_supplychain_foundation.yml
- golden-path-supply-chain.yml
- security-supplychain.yml
- subsumption-bundle-verifier.yml
- subsumption-bundle-verify.yml
- subsumption-bundle.yml
- subsumption-verify.yml
- supply-chain-attest.yml
- supply-chain-delta.yml
- supply-chain-integrity.yml
- supplychain-drift.yml
- supplychain-gates.yml
- supplychain-verify.yml

**Proposed consolidation**:

```yaml
# supply-chain-gate.yml (PR blocking)
- Combines: supplychain-gates, supplychain-verify, security-supplychain, subsumption-verify
- Runs on: Every PR with path filters (pnpm-lock.yaml, Dockerfile, subsumption/**)
- Duration: ~7 minutes
- Purpose: Block PRs with supply chain issues

# supply-chain-integrity.yml (Post-merge)
- Combines: supply-chain-integrity, supply-chain-attest, subsumption-bundle
- Runs on: push to main
- Duration: ~10 minutes
- Purpose: Attest and verify supply chain integrity

# supply-chain-monitoring.yml (Scheduled)
- Combines: supplychain-drift, supply-chain-delta, golden-path-supply-chain
- Runs on: schedule (daily)
- Duration: ~15 minutes
- Purpose: Monitor for drift and changes
```

**Savings**: 13 → 3 workflows = 77% reduction

## Implementation Phases

### Phase 1: Quick Wins (1-2 days)
**Target**: Reduce 45 → 35 workflows per PR (-22%)

1. ✅ Enable MERGE_SURGE mode (done)
2. ✅ Cancel queued runs (done)
3. ✅ Add path filters to summit-evidence.yml (done)
4. Add path filters to 10 more workflows:
   - comprehensive-test-suite.yml
   - integration-tests.yml
   - security-tests.yml
   - ga-evidence.yml
   - governance-check.yml
   - supply-chain-delta.yml
   - api-lint.yml
   - client-typecheck.yml
   - server-typecheck.yml
   - docs-lint.yml

**Expected impact**: Skip 5-10 workflows per PR based on changes

### Phase 2: Evidence Consolidation (3-5 days)
**Target**: Reduce 35 → 25 workflows per PR (-29%)

1. Create evidence-gate.yml
2. Create evidence-collection.yml
3. Create evidence-analytics.yml
4. Migrate logic from 19 evidence workflows
5. Archive old evidence workflows
6. Test on 3-5 PRs
7. Deploy to main

**Expected impact**: -16 workflows per PR

### Phase 3: Governance Consolidation (3-5 days)
**Target**: Reduce 25 → 18 workflows per PR (-28%)

1. Create governance-gate.yml
2. Create governance-compliance.yml
3. Migrate logic from 17 governance workflows
4. Archive old governance workflows
5. Test on 3-5 PRs
6. Deploy to main

**Expected impact**: -13 workflows per PR

### Phase 4: Supply Chain Consolidation (2-3 days)
**Target**: Reduce 18 → 13 workflows per PR (-28%)

1. Create supply-chain-gate.yml
2. Create supply-chain-integrity.yml
3. Migrate logic from 13 supply chain workflows
4. Archive old supply chain workflows
5. Test on 3-5 PRs
6. Deploy to main

**Expected impact**: -10 workflows per PR

### Phase 5: Final Optimization (2-3 days)
**Target**: Reduce 13 → 15 workflows per PR (final tuning)

1. Review remaining workflows
2. Add path filters where missing
3. Consolidate security workflows
4. Consolidate release workflows
5. Performance testing

**Expected impact**: Stable 15-20 workflows per PR

## Success Metrics

### Immediate (Phase 1 - Achieved ✅)
- ✅ Queue depth < 100
- ✅ Runners actively processing (> 0 in-progress)
- ✅ MERGE_SURGE enabled
- ✅ Emergency response tools created

### Short-term (Phase 2-3)
- Workflows per PR: 45 → 25 (44% reduction)
- Average CI time: 20-30 minutes → 15-20 minutes
- Queue depth: Consistently < 50
- Zero gridlock incidents

### Long-term (Phase 4-5)
- Workflows per PR: 45 → 15 (67% reduction)
- Average CI time: 20-30 minutes → 10-15 minutes
- Queue depth: Consistently < 30
- PR merge time: < 30 minutes (from green tests to merge)

## Cost-Benefit Analysis

### Investment
- Engineering time: 2-3 weeks (1 engineer)
- Testing overhead: 1 week (parallel runs)
- Documentation: 2-3 days
- **Total**: ~4-5 weeks effort

### Returns
- **Immediate**: 200+ queued runs → 0 (gridlock resolved)
- **Short-term**: 45 → 15 workflows per PR (67% reduction)
- **Long-term**:
  - 60-75% faster CI
  - 50% reduction in runner costs
  - Better developer experience
  - Easier maintenance (fewer workflows to manage)

### ROI
- Current state: 45 workflows × 23 PRs = 1,035 potential jobs
- Future state: 15 workflows × 23 PRs = 345 jobs
- **Savings**: 67% reduction in job volume
- **Payback period**: < 1 month

---

**Document Version**: 1.0
**Last Updated**: 2026-03-03
**Owner**: DevOps / Release Engineering
