# CI Optimization Proposal: Path-Based Check Filtering

**Status**: URGENT - CI Resource Exhaustion Recovery
**Date**: 2026-03-01
**Author**: Claude (Summit Merge Queue Orchestrator)

## Problem Statement

Current state: **200+ open PRs × 127 required checks = 25,400+ queued check runs**

**Symptoms**:
- All PRs blocked in QUEUED state for 2+ hours
- Zero GitHub Actions runner capacity available
- Docs-only PRs triggering full test suites unnecessarily
- Critical security fixes delayed equally with documentation changes

## Root Cause

**No path-based filtering** in CI workflows. Example:
- PR changes 1 markdown file
- Triggers: CodeQL, full test suite, Docker builds, integration tests, etc.
- Reality: Only markdown lint needed

## Proposed Solution

### Phase 1: Immediate Relief (path-ignore for heavy workflows)

Add `paths-ignore` to computationally expensive workflows that don't need to run on docs/config changes:

```yaml
# .github/workflows/test-suite.yml
on:
  pull_request:
    paths-ignore:
      - 'docs/**'
      - '**.md'
      - 'prompts/**'
      - '.github/workflows/**'  # Workflow changes don't need tests
      - 'evidence/**'
```

**Impact**: Reduces check runs by ~40% for docs/prompt PRs

### Phase 2: Smart Path-Based Triggers (paths for code workflows)

Make code-heavy checks run ONLY when code changes:

```yaml
# .github/workflows/comprehensive-tests.yml
on:
  pull_request:
    paths:
      - 'server/**/*.ts'
      - 'client/**/*.tsx'
      - 'packages/**/*.ts'
      - 'services/**/*.ts'
      - 'package.json'
      - 'pnpm-lock.yaml'
```

**Impact**: Reduces unnecessary test runs by ~60%

### Phase 3: Tiered Check Requirements

Define **3 tiers** of required checks:

**Tier 1: Universal (ALL PRs)**
- Security scan (gitleaks)
- Governance check
- Workflow lint
- Basic markdown lint

**Tier 2: Code Changes**
- Full test suite
- TypeScript check
- Build verification
- Integration tests
- CodeQL

**Tier 3: Infrastructure/Deployment**
- Docker builds
- SLSA attestation
- Supply chain checks

## Implementation Plan

### Step 1: Audit Current Workflows (1 hour)

```bash
# Find all workflow files
find .github/workflows -name "*.yml" -o -name "*.yaml"

# Check which have path filters
grep -l "paths:" .github/workflows/*.yml

# Check which DON'T have path filters (need them)
grep -L "paths:" .github/workflows/*.yml
```

### Step 2: Add Path Filters to Top 20 Heavy Workflows (2 hours)

Priority workflows to optimize:

1. **Comprehensive Test Suite** - Skip on docs
2. **CodeQL** - Skip on docs/prompts
3. **Docker Build & Security Scan** - Skip on docs
4. **Integration Tests** - Skip on docs
5. **Golden Path Supply Chain** - Skip on docs
6. **Full-Stack Smoke Test** - Skip on docs
7. **Unit Tests & Coverage** - Skip on docs
8. **TypeScript Gate** - Skip on docs
9. **Build & Lint** - Skip on docs
10. **Security Tests** - Skip on non-code

... (continue for all heavy workflows)

### Step 3: Create Docs-Only Fast Path (30 min)

New workflow: `.github/workflows/docs-fast-track.yml`

```yaml
name: Docs Fast Track
on:
  pull_request:
    paths:
      - 'docs/**'
      - '**.md'
      - 'prompts/**'

jobs:
  docs-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Markdown Lint
        run: npx markdownlint-cli2 "**/*.md"

      - name: Link Check
        run: npx markdown-link-check --config .markdown-link-check.json $(find . -name "*.md")

      - name: Spell Check
        run: npx cspell "**/*.md"

      - name: Fast Track Approved
        run: echo "✅ Docs-only PR validated - fast track eligible"
```

**Result**: Docs PRs complete in ~2 minutes instead of waiting for 127 checks

### Step 4: Update Branch Protection Rules (15 min)

Modify required checks to be path-conditional:

**For docs-only PRs**: Require only:
- `Docs Fast Track`
- `Workflow Lint`
- `Gitleaks baseline scan`

**For code PRs**: Require full suite

**Implementation**: Use GitHub branch protection rulesets with path conditions (if available)

## Expected Impact

**Before**:
- Docs PR: 127 checks, 2+ hour queue time
- Code PR: 127 checks, 2+ hour queue time
- Total capacity: Exhausted

**After**:
- Docs PR: 3-5 checks, <5 min completion
- Code PR: 40-50 checks (relevant only), <30 min completion
- Total capacity: 60-70% reduction in check runs

**Math**:
- 200 PRs × 127 checks = 25,400 check runs (current)
- Assume 40% are docs/config PRs: 80 PRs × 5 checks = 400 check runs
- Assume 60% are code PRs: 120 PRs × 50 checks = 6,000 check runs
- **Total**: 6,400 check runs (75% reduction)

## Rollout Plan

**Week 1**:
- ✅ Day 1: Audit workflows, identify heaviest
- ✅ Day 2: Add path-ignore to top 10 heavy workflows
- ✅ Day 3: Create docs fast-track workflow
- ✅ Day 4: Test on sample PR
- ✅ Day 5: Deploy to main

**Week 2**:
- Day 1-3: Add path filters to remaining 70 workflows
- Day 4-5: Monitor queue depth, adjust as needed

## Success Metrics

**Target SLOs**:
- Docs PR → merge: <15 minutes (from approval to merge complete)
- Code PR → merge: <2 hours (from approval to all checks pass)
- Queue depth: <1,000 runs (down from 25,000+)
- Runner utilization: <70% (healthy headroom)

## Risks & Mitigations

**Risk**: Path filters too aggressive, skip necessary checks
**Mitigation**: Conservative initial filters, expand gradually

**Risk**: Complex PRs (code + docs) trigger too few checks
**Mitigation**: If ANY code file changes, run full suite (OR logic)

**Risk**: Developers bypass checks by only committing docs
**Mitigation**: Require evidence artifacts for major changes

## Appendix: Example Path Filter Patterns

```yaml
# Skip on docs
paths-ignore:
  - 'docs/**'
  - '**.md'
  - 'README.md'
  - 'prompts/**'
  - 'evidence/**'

# Run only on server code
paths:
  - 'server/src/**'
  - 'server/package.json'
  - 'server/tsconfig.json'

# Run only on client code
paths:
  - 'client/src/**'
  - 'client/package.json'

# Run only on infra
paths:
  - '.github/workflows/**'
  - 'docker-compose*.yml'
  - 'Dockerfile*'
  - '.dockerignore'

# Run on package changes
paths:
  - '**/package.json'
  - 'pnpm-lock.yaml'
  - '.npmrc'
```

## Next Steps

1. **Immediate**: Get approval for this proposal
2. **Day 1**: Implement top 10 workflow optimizations
3. **Day 2**: Deploy docs fast-track
4. **Week 1**: Complete rollout
5. **Week 2**: Monitor and tune

## Approval Required

- [ ] DevOps Lead: Path filter strategy
- [ ] Security: Acceptable check reduction
- [ ] Engineering Lead: Fast-track for docs acceptable
- [ ] Platform Ops: Runner capacity planning

---

**Related Documents**:
- `docs/ci/MERGE-QUEUE-BLOCKER-MATRIX-2026-03-01.md`
- `.github/workflows/README.md` (to be created)
