# Workflow Consolidation Plan

**Created:** December 5, 2025 **Status:** Phase 1 In Progress **Goal:** Reduce workflow duplication
and improve maintainability

## Current State

- **284 workflow files** totaling ~40,296 lines
- **Only 13 reusable workflows** (4.6% reuse rate)
- **206 workflows** (73%) independently setup Node.js
- **115 workflows** (40%) independently run pnpm install

## Consolidation Opportunities

### High-Impact Patterns

| Pattern                | Occurrences | Lines/Workflow | Potential Savings      |
| ---------------------- | ----------- | -------------- | ---------------------- |
| Node.js + pnpm setup   | 206         | ~5-10          | ~1,030-2,060 lines     |
| pnpm install only      | 115         | ~3-5           | ~345-575 lines         |
| Checkout + setup combo | 254         | ~8-12          | ~2,032-3,048 lines     |
| **Total**              | -           | -              | **~3,407-5,683 lines** |

## Phase 1: Reusable Setup Workflow ✅

### Created: `_reusable-node-pnpm-setup.yml`

**Features:**

- Configurable Node.js version (default: 20.x)
- Configurable pnpm version (default: 9.12.0)
- Optional dependency installation
- Optimized pnpm store caching
- Single source of truth for setup logic

**Usage Example:**

```yaml
jobs:
  build:
    name: Build
    uses: ./.github/workflows/_reusable-node-pnpm-setup.yml
    with:
      node-version: '20.x'
      pnpm-version: '9.12.0'
      install-deps: true

  # Continue with build steps...
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: pnpm test
```

### Migration Candidates (Priority Order)

**High-Frequency Workflows (Migrate First):**

1. `ci.main.yml` - Main CI pipeline
2. `ci.yml` - Standard CI
3. `docs-deploy.yml` - Documentation deployment
4. `auto-fix-vulnerabilities.yml` - Security automation
5. `enhanced-testing.yml` - Testing suite

**Security Workflows:**

- `owasp-zap.yml`
- `ci-security.yml`
- `security-comprehensive.yml`

**Estimated Impact:**

- Migrating top 50 workflows: ~250-500 lines saved
- Improved consistency and maintainability
- Easier updates (change once, apply everywhere)

## Phase 2: Build & Test Reusable Workflow

### Planned: `_reusable-build-test.yml`

Consolidate common build + test patterns:

- Checkout
- Setup Node.js/pnpm
- Install dependencies
- Run build
- Run tests
- Upload artifacts

**Target workflows:** 80+ workflows with similar build/test patterns

## Phase 3: Security Scanning Consolidation

### Planned: `_reusable-security-scan.yml`

Consolidate 5+ security scanning workflows:

- OWASP ZAP scanning
- Trivy container scanning
- SBOM generation
- CodeQL analysis
- Dependency scanning

**Current duplication:**

- `owasp-zap.yml` (412 lines)
- `ci-zap.yml` (similar)
- `zap-dast.yml` (similar)
- `security-comprehensive.yml` (507 lines)
- `security-autopilot.yml` (413 lines)

**Estimated savings:** 500-1,000 lines

## Phase 4: Deployment Consolidation

### Planned: `_reusable-deploy.yml`

Consolidate deployment workflows:

- Environment-specific deployments
- Docker image building
- Kubernetes/Helm deployments
- Health checks

**Target workflows:** 20+ deployment workflows

## Implementation Strategy

### Step 1: Create Reusable Workflow ✅

- [x] `_reusable-node-pnpm-setup.yml` created

### Step 2: Pilot Migration (In Progress)

- [x] Created reusable Node.js + pnpm setup workflow
- [x] Discovered existing `_reusable-toolchain-setup.yml` (auto-detection approach)
- [x] Analyzed migration patterns and constraints
- [ ] Document migration strategy (see findings below)
- [ ] Migrate 1 low-risk workflow as proof-of-concept
- [ ] Validate in CI

**Key Findings:**

- **Reusable workflows** (workflow_call) create isolated jobs - can't share workspace with caller
  jobs
- **Best for:** Complete workflows that do one thing (lint-only, test-only, build-only)
- **Not ideal for:** Multi-job workflows where jobs need to share state
- **Alternative approach:** Composite actions for reusable steps within jobs

**Recommended Migration Strategy:**

1. **Simple single-job workflows:** Migrate entire workflow to reusable pattern
   - Example candidates: `auto-green.yml`, simple lint/test workflows
2. **Complex multi-job workflows:** Consider composite actions or standardization guides
   - Example: `api-docs-validation.yml` (7 jobs) needs different approach
3. **Mixed approach:** Use reusable workflows for common patterns + composite actions for setup
   steps

### Step 3: Batch Migration

- [ ] Migrate high-frequency workflows (top 50)
- [ ] Test each migration
- [ ] Monitor for issues

### Step 4: Comprehensive Audit

- [ ] Review all 284 workflows
- [ ] Identify additional consolidation opportunities
- [ ] Create additional reusable workflows as needed

### Step 5: Documentation & Training

- [ ] Update team documentation
- [ ] Create migration guide
- [ ] Establish best practices

## Success Metrics

**Quantitative:**

- Reduce workflow count from 284 to <150 (50% reduction)
- Reduce total workflow lines from 40K to <30K (25% reduction)
- Increase reusable workflow usage from 4.6% to >50%

**Qualitative:**

- Easier maintenance (update once, apply everywhere)
- Faster onboarding (fewer patterns to learn)
- More consistent CI/CD behavior
- Reduced GitHub Actions costs (fewer duplicate steps)

## Timeline

- **Phase 1:** Week 1 (In Progress)
- **Phase 2:** Week 2-3
- **Phase 3:** Week 4-5
- **Phase 4:** Week 6-8

## Risks & Mitigation

**Risk:** Breaking existing workflows during migration **Mitigation:**

- Migrate one workflow at a time
- Test thoroughly before merging
- Keep original workflow as backup initially

**Risk:** Reusable workflow may not fit all use cases **Mitigation:**

- Design with flexibility (parameterized inputs)
- Allow opt-out for edge cases
- Document customization options

**Risk:** Team resistance to change **Mitigation:**

- Clear communication of benefits
- Comprehensive documentation
- Gradual rollout with success stories

## Next Actions

1. ✅ Create `_reusable-node-pnpm-setup.yml`
2. **Next:** Pilot migration of 1 low-risk workflow
3. Validate and iterate
4. Begin batch migration of high-frequency workflows
5. Continue through phases 2-4

---

**Owner:** Engineering Team **Last Updated:** December 5, 2025, 10:17 MST
