# CI Cost Optimization Monitoring Guide

**Date Implemented**: 2025-12-29
**Commit**: e86ad989 - "ci: optimize CI workflow for cost efficiency"
**Review Date**: 2026-01-05 (one week after implementation)

## Changes Made

The following optimizations were implemented to reduce CI costs:

### 1. Path Filters for Docs-Only Changes

```yaml
on:
  push:
    paths-ignore:
      - "**.md"
      - "docs/**"
      - ".github/ISSUE_TEMPLATE/**"
  pull_request:
    paths-ignore:
      - "**.md"
      - "docs/**"
      - ".github/ISSUE_TEMPLATE/**"
```

**Expected Impact**: Skip CI runs when only documentation changes (estimated 15-20% of commits)

### 2. Concurrency Controls

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

**Expected Impact**: Cancel redundant runs when new commits pushed to PR (estimated 20-30% reduction)

### 3. Limited Integration Tests

```yaml
test-integration:
  if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop' || github.event_name == 'pull_request'
```

**Expected Impact**: Run integration tests only when necessary, not on feature branches (estimated 10-15% reduction)

### 4. Limited Security Scans

```yaml
security:
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

**Expected Impact**: Run expensive security scans only on main branch (estimated 40-50% reduction in security scan runs)

### 5. Removed Feature Branch Triggers

```yaml
on:
  push:
    branches: [main, develop] # Removed: 'feature/**', 'release/**'
```

**Expected Impact**: Eliminate CI runs on feature branch pushes (estimated 30-40% reduction in total runs)

## Monitoring Plan

### Week 1: Initial Assessment (2025-12-30 to 2026-01-05)

#### Metrics to Collect

1. **CI Run Frequency**
   - Total workflow runs per day
   - Breakdown by trigger type (push, PR, schedule)
   - Breakdown by branch (main, develop, PR)

2. **CI Duration**
   - Average run time per workflow
   - Total compute minutes per day
   - Peak usage times

3. **CI Cost**
   - Cost per workflow run (if available)
   - Total daily/weekly cost
   - Cost breakdown by job type

4. **Cancelled Runs**
   - Number of runs cancelled by concurrency controls
   - Time/cost saved from cancellations

5. **Skipped Runs**
   - Number of runs skipped due to path filters
   - Breakdown by skip reason

#### How to Collect Metrics

##### Option 1: GitHub Actions UI

1. Go to repository → Actions tab
2. Select time range (last 7 days)
3. Count runs by workflow
4. Check "Billing & usage" for compute minutes

##### Option 2: GitHub CLI

```bash
# List all workflow runs in last 7 days
gh run list --limit 100 --json conclusion,status,createdAt,updatedAt,workflowName,event

# Get specific workflow runs
gh run list --workflow=ci.yml --limit 50 --json conclusion,status,durationMs

# Calculate total minutes
gh run list --workflow=ci.yml --limit 100 --json durationMs | \
  jq '[.[].durationMs] | add / 60000'
```

##### Option 3: GitHub API

```bash
# Workflow runs in last week
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/OWNER/REPO/actions/runs?per_page=100&created=>2025-12-23" \
  | jq '.workflow_runs | length'

# Billing data
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/OWNER/REPO/actions/billing/usage"
```

#### Baseline Metrics (Pre-Optimization)

**To be filled in from historical data (Dec 23-29, 2025)**

| Metric                | Pre-Optimization | Target                | Actual (Week 1) |
| --------------------- | ---------------- | --------------------- | --------------- |
| Daily workflow runs   | [TBD]            | [TBD - 30% reduction] | [TBD]           |
| Daily compute minutes | [TBD]            | [TBD - 40% reduction] | [TBD]           |
| Weekly cost           | [TBD]            | [TBD - 35% reduction] | [TBD]           |
| Avg run duration      | [TBD]            | [Same or better]      | [TBD]           |
| Cancelled runs/day    | 0                | [TBD]                 | [TBD]           |
| Skipped runs/day      | 0                | [TBD]                 | [TBD]           |

### Week 2-4: Continued Monitoring

Track same metrics weekly to identify trends:

- Are costs continuing to decrease?
- Any unexpected increases?
- Developer feedback on CI experience

## Validation Checklist

### ✅ Functionality Checks (Complete by 2026-01-05)

- [ ] **PR Workflow**: Create test PR with code changes → Verify CI runs
- [ ] **PR Workflow**: Create test PR with only doc changes → Verify CI skips
- [ ] **Concurrency**: Push multiple commits to same PR → Verify older runs cancelled
- [ ] **Integration Tests**: Push to feature branch → Verify integration tests NOT run
- [ ] **Integration Tests**: Push to main/develop → Verify integration tests DO run
- [ ] **Security Scans**: Push to develop → Verify security scan NOT run
- [ ] **Security Scans**: Push to main → Verify security scan DOES run
- [ ] **Main Branch**: Push code to main → Verify full CI runs (build, test, integration, security)
- [ ] **Develop Branch**: Push code to develop → Verify partial CI runs (build, test, integration, NO security)

### ✅ Quality Checks

- [ ] **Test Coverage**: No decrease in test coverage percentage
- [ ] **Security**: No security vulnerabilities missed due to limited scans
- [ ] **Bug Detection**: No increase in bugs reaching main branch
- [ ] **Developer Experience**: No complaints about missing CI feedback

### ✅ Cost Validation

- [ ] **Reduced Runs**: Workflow run count decreased by 25-40%
- [ ] **Reduced Minutes**: Compute minutes decreased by 30-50%
- [ ] **Reduced Cost**: Monthly cost decreased by 30-45%
- [ ] **No False Skips**: No legitimate code changes accidentally skipped

## Risk Assessment

### Potential Issues to Watch For

1. **Missed Security Issues**
   - **Risk**: Security scans only on main means vulnerabilities in PRs not caught early
   - **Mitigation**: Run security scans weekly via schedule, or on-demand for sensitive PRs
   - **Monitoring**: Track security issues found in production vs. CI

2. **Integration Test Gaps**
   - **Risk**: PRs merged without integration tests on feature branches
   - **Mitigation**: Integration tests still run on PRs to main/develop
   - **Monitoring**: Track integration failures on main/develop

3. **Documentation PRs Missing Issues**
   - **Risk**: Doc-only PRs might include accidental code changes that skip CI
   - **Mitigation**: Review path filters, add safeguards
   - **Monitoring**: Manual review of doc-only PRs for first 2 weeks

4. **Developer Frustration**
   - **Risk**: Developers confused why CI doesn't run on feature branches
   - **Mitigation**: Update contributing docs, communicate changes
   - **Monitoring**: Gather feedback in retros

## Rollback Plan

If cost savings don't materialize or quality degrades:

### Immediate Rollback (Same Day)

```bash
# Revert the optimization commit
git revert e86ad989
git push origin main
```

### Partial Rollback Options

#### 1. Re-enable Feature Branch Triggers

```yaml
on:
  push:
    branches: [main, develop, "feature/**"]
```

#### 2. Run Security Scans on Develop

```yaml
security:
  if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
```

#### 3. Remove Path Filters

```yaml
on:
  push:
    branches: [main, develop]
    # Remove paths-ignore
```

## Success Criteria

### Required for Success (All must pass)

- ✅ **Cost reduction**: 30-40% decrease in CI costs
- ✅ **No quality degradation**: Test pass rate remains ≥99%
- ✅ **No security regressions**: Zero security issues missed
- ✅ **No developer friction**: <5 complaints about CI changes

### Ideal Success (Stretch goals)

- 🎯 **45%+ cost reduction**
- 🎯 **Faster CI feedback**: Average run time decreases 10%+
- 🎯 **Higher PR velocity**: PRs merged 15% faster due to cancelled redundant runs

## Recommendations for Further Optimization

After validating current changes, consider:

### 1. Conditional Job Execution by Changed Files

```yaml
jobs:
  check-changes:
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}
    steps:
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            backend:
              - 'server/**'
            frontend:
              - 'client/**'

  test-backend:
    needs: check-changes
    if: needs.check-changes.outputs.backend == 'true'
```

### 2. Matrix Build Optimization

- Only run full matrix on main/develop
- Run single config on PRs

### 3. Caching Improvements

- Cache node_modules more aggressively
- Cache build artifacts between runs
- Use Docker layer caching

### 4. Scheduled Deep Scans

- Run expensive tests nightly instead of every push
- Weekly comprehensive security scans
- Monthly performance benchmarks

## Documentation Updates Needed

After validation, update:

- [ ] `CONTRIBUTING.md` - Explain when CI runs
- [ ] `README.md` - Note CI optimization
- [ ] PR template - Remind about doc-only changes
- [ ] Developer onboarding - CI workflow expectations

## Review Schedule

| Date       | Review Type   | Participants            | Outcomes                                      |
| ---------- | ------------- | ----------------------- | --------------------------------------------- |
| 2026-01-05 | Week 1 review | DevOps, Tech Lead       | Fill baseline metrics, validate functionality |
| 2026-01-12 | Week 2 review | DevOps                  | Review trends, identify issues                |
| 2026-01-19 | Week 3 review | DevOps                  | Confirm cost savings                          |
| 2026-01-26 | Final review  | DevOps, Tech Lead, Team | Document results, recommend next steps        |

## Appendix: Data Collection Template

### Weekly Data Collection Form

**Week of**: \***\*\_\*\***

**Workflow Runs**:

- Total runs: **\_**
- Runs on main: **\_**
- Runs on develop: **\_**
- Runs on PRs: **\_**
- Cancelled runs: **\_**
- Skipped runs (path filter): **\_**

**Compute Minutes**:

- Total minutes: **\_**
- Build job: **\_**
- Test job: **\_**
- Integration job: **\_**
- Security job: **\_**

**Cost** (if available):

- Total cost: $**\_**
- Cost per run: $**\_**

**Quality Metrics**:

- Test pass rate: **\_**%
- Security issues found: **\_**
- Bugs escaped to main: **\_**

**Developer Feedback**:

- Positive: **\_**
- Negative: **\_**
- Suggestions: **\_**

## **Issues/Concerns**:

- **Actions for Next Week**:

-
- ***

  **Monitoring Owner**: [Assign to DevOps lead]
  **Next Review**: 2026-01-05
