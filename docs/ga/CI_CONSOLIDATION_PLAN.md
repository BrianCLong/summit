# CI WORKFLOW CONSOLIDATION PLAN

> **Status**: APPROVED
> **Version**: 1.0.0
> **Authority**: Release Captain
> **Created**: 2026-01-01
> **Parent Document**: `docs/ga/GA_DEFINITION.md` Part 7

---

## Executive Summary

**Problem**: 51 workflow files create confusion, duplication, and maintenance burden.

**Solution**: Consolidate into **3 primary workflows** + reusable components.

**Timeline**: Phase 1 (Weeks 1-2)

**Risk**: Low (legacy workflows remain as fallback during migration)

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Workflow Inventory

**Total Workflows**: 51

**Categories**:
- **Core CI** (6): `ci.yml`, `mvp4-gate.yml`, `hello-service-ci.yml`, `intelgraph-ci.yml`, `unit-test-coverage.yml`, `pr-quality-gate.yml`
- **Security** (6): `ci-security.yml`, `secret-scan-warn.yml`, `sbom-scan.yml`, `slsa-provenance.yml`, `compliance.yml`, `governance-check.yml`
- **Release** (5): `ga-release.yml`, `release-ga.yml`, `release-train.yml`, `release-reliability.yml`, `post-release-canary.yml`
- **Specialized** (8): `graph-guardrail-fuzz.yml`, `ai-copilot-canary.yml`, `copilot-golden-path.yml`, `golden-path-supply-chain.yml`, `web-accessibility.yml`, `doc-link-check.yml`, `schema-diff.yml`, `schema-compat.yml`
- **Reusable** (11): `_reusable-*.yml`
- **Governance** (3): `governance-check.yml`, `governance-engine.yml`, `audit-exception-expiry.yml`
- **Deployment** (5): `deploy-multi-region.yml`, `docker-build.yml`, `ga-release.yml`, `rc-lockdown.yml`, `canary-*.yml`
- **Maintenance** (7): `bidirectional-sync.yml`, `mirror-to-personal.yml`, `repro-build-check.yml`, `semver-label.yml`, `weekly-assurance.yml`, `docs-lint.yml`, `api-lint.yml`

### 1.2 Key Issues

| Issue | Impact | Affected Workflows |
|-------|--------|-------------------|
| **Duplication** | Maintenance burden, drift risk | `ci.yml` vs `mvp4-gate.yml` vs `pr-quality-gate.yml` |
| **Inconsistent Gates** | Unclear merge requirements | Multiple workflows define overlapping checks |
| **Non-Blocking Tests** | False sense of green | `continue-on-error: true` scattered across 8+ workflows |
| **No Clear Entry Point** | Developer confusion | Which workflow is authoritative? |
| **Legacy Debt** | Dead code | Workflows referencing deprecated scripts |

---

## 2. TARGET STATE (3-WORKFLOW MODEL)

### 2.1 Workflow Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     PRIMARY WORKFLOWS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  ci-core.yml │  │ ci-verify.yml│  │ci-legacy.yml │    │
│  │              │  │              │  │              │    │
│  │ • Lint       │  │ • Security   │  │ • Quarantine │    │
│  │ • Typecheck  │  │ • Provenance │  │   tests      │    │
│  │ • Unit Tests │  │ • Compliance │  │ • Deprecated │    │
│  │ • Build      │  │ • Governance │  │   checks     │    │
│  │              │  │ • SBOM/SLSA  │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│       ↓                   ↓                   ↓            │
│    BLOCKING           BLOCKING         NON-BLOCKING        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  REUSABLE COMPONENTS                        │
├─────────────────────────────────────────────────────────────┤
│  _reusable-setup.yml                                       │
│  _reusable-test-suite.yml                                  │
│  _reusable-security.yml                                    │
│  _reusable-build.yml                                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Workflow Responsibilities

#### **ci-core.yml** (PRIMARY GATE)

**Purpose**: Core build, lint, typecheck, unit tests, deterministic build.

**Triggers**:
- `pull_request` → `main`
- `push` → `main`

**Jobs**:
1. **Setup** (reusable: `_reusable-setup.yml`)
   - Checkout
   - Install deps (`--frozen-lockfile`)
2. **Lint & Typecheck**
   - `pnpm lint` (strict, `--max-warnings 0`)
   - `pnpm typecheck`
3. **Unit Tests**
   - `pnpm test:unit`
   - Upload coverage
4. **Integration Tests**
   - `pnpm test:integration`
   - Ecosystem export verification
5. **Deterministic Build**
   - Build twice, compare checksums
   - **BLOCKING** (exit 1 if mismatch)
6. **Golden Path**
   - `make bootstrap && make up && make smoke`
   - **BLOCKING**

**Branch Protection**:
- All jobs **required**
- No `continue-on-error` allowed

**Exit Criteria**:
- All jobs green → PR mergeable

---

#### **ci-verify.yml** (SECURITY & COMPLIANCE)

**Purpose**: Security scans, provenance, governance, compliance checks.

**Triggers**:
- `pull_request` → `main`
- `push` → `main`
- `workflow_dispatch` (manual trigger)

**Jobs**:
1. **Security Scan**
   - Gitleaks (`fetch-depth: 0`)
   - `pnpm audit --audit-level critical`
   - Snyk (if token available)
2. **Policy Compliance**
   - `opa check policies/`
   - `opa test policies/ -v`
   - Governance engine checks
3. **Provenance**
   - Generate SBOM
   - Generate SLSA provenance
   - Cosign signing (if release)
4. **Schema Validation**
   - GraphQL schema diff
   - API schema compatibility
5. **Compliance Gates**
   - Audit exception expiry check
   - License compliance
   - Secret scanning

**Branch Protection**:
- **Security Scan**: Required
- **Policy Compliance**: Required (post-MVP4)
- **Provenance**: Informational (required for release)

**Exit Criteria**:
- No secrets detected
- No critical CVEs (or documented exceptions)
- All policies pass

---

#### **ci-legacy.yml** (NON-BLOCKING)

**Purpose**: Flaky tests, deprecated checks, experimental features.

**Triggers**:
- `pull_request` → `main`
- `push` → `main`

**Jobs**:
1. **Quarantine Tests**
   - `pnpm test:quarantine`
   - `continue-on-error: true`
2. **Jest/ts-jest Suite**
   - Legacy test suite (ESM issues)
   - `continue-on-error: true`
3. **Experimental Checks**
   - AI copilot canary
   - Graph guardrail fuzz
   - `continue-on-error: true`
4. **Deprecated Workflows**
   - Schema diff (migrating to ci-verify)
   - Old governance checks

**Branch Protection**:
- **NOT required** for merge
- Failures logged, do not block

**Exit Criteria**:
- Informational only
- Tracked for future stabilization

---

### 2.3 Workflow Consolidation Mapping

| Current Workflow | Consolidates Into | Notes |
|------------------|-------------------|-------|
| `ci.yml` | `ci-core.yml` | Keep structure, remove non-core jobs |
| `mvp4-gate.yml` | `ci-core.yml` + `ci-verify.yml` | Split security/compliance into ci-verify |
| `pr-quality-gate.yml` | `ci-core.yml` | Merge quality checks into core |
| `ci-security.yml` | `ci-verify.yml` | Rename, add governance |
| `slsa-provenance.yml` | `ci-verify.yml` | Job within ci-verify |
| `sbom-scan.yml` | `ci-verify.yml` | Job within ci-verify |
| `compliance.yml` | `ci-verify.yml` | Job within ci-verify |
| `governance-check.yml` | `ci-verify.yml` | Job within ci-verify |
| `unit-test-coverage.yml` | `ci-core.yml` | Job within ci-core |
| `intelgraph-ci.yml` | `ci-core.yml` | Merge into core test suite |
| `hello-service-ci.yml` | `ci-core.yml` | Merge into core test suite |
| `repro-build-check.yml` | `ci-core.yml` | Deterministic build job |
| `graph-guardrail-fuzz.yml` | `ci-legacy.yml` | Experimental, non-blocking |
| `ai-copilot-canary.yml` | `ci-legacy.yml` | Canary, non-blocking |
| `schema-diff.yml` | `ci-legacy.yml` → `ci-verify.yml` | Migrate after fixing loader issues |
| `schema-compat.yml` | `ci-verify.yml` | Schema validation job |
| `secret-scan-warn.yml` | `ci-verify.yml` | Merge into security scan |
| `weekly-assurance.yml` | **KEEP** (scheduled) | Not part of PR workflow |
| `release-*.yml` | **KEEP** (release only) | Not part of PR workflow |
| `deploy-*.yml` | **KEEP** (deployment) | Not part of PR workflow |
| `_reusable-*.yml` | **KEEP** (refactor) | Shared by new workflows |

---

## 3. IMPLEMENTATION PLAN

### 3.1 Phase 1: Create New Workflows (Week 1)

**Tasks**:
1. ✅ Create `ci-core.yml` (this plan)
2. ✅ Create `ci-verify.yml` (this plan)
3. ✅ Create `ci-legacy.yml` (this plan)
4. Test workflows on feature branch
5. Validate branch protection rules

**Success Criteria**:
- New workflows pass on feature branch
- No duplicate jobs across workflows
- All existing gates covered

### 3.2 Phase 2: Parallel Operation (Week 2)

**Tasks**:
1. Enable new workflows alongside old workflows
2. Monitor for parity (new == old results)
3. Fix any gaps or regressions
4. Update branch protection to require new workflows

**Success Criteria**:
- New workflows achieve 100% parity with old workflows
- Zero false negatives (new workflow passes when old fails)
- Zero false positives (new workflow fails when old passes)

### 3.3 Phase 3: Deprecation (Week 3)

**Tasks**:
1. Add deprecation notice to old workflows
2. Redirect developers to new workflows (PR template)
3. Remove old workflows from branch protection
4. Archive old workflows to `.github/workflows/archive/`

**Success Criteria**:
- All PRs use new workflows
- Branch protection references only new workflows
- Old workflows removed from active use

### 3.4 Phase 4: Cleanup (Week 4)

**Tasks**:
1. Delete archived workflows (after 30-day grace period)
2. Update documentation (CONTRIBUTING.md, CI docs)
3. Announce consolidation completion

**Success Criteria**:
- <10 total workflows (down from 51)
- Documentation updated
- Team trained on new structure

---

## 4. BRANCH PROTECTION RULES (NEW)

```yaml
# .github/branch-protection/main.yml (Terraform-managed)
branch: main

required_status_checks:
  strict: true
  checks:
    # ci-core.yml
    - "Lint & Typecheck"
    - "Unit Tests"
    - "Integration Tests"
    - "Deterministic Build"
    - "Golden Path"

    # ci-verify.yml
    - "Security Scan"
    - "Policy Compliance"
    - "Provenance Generation"
    - "Schema Validation"
    - "Compliance Gates"

required_pull_request_reviews:
  required_approving_review_count: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true

required_signatures: true
enforce_admins: true
allow_force_pushes: false
allow_deletions: false
```

**Enforcement**: Terraform apply (`ops/terraform/github/branch-protection.tf`)

---

## 5. REUSABLE WORKFLOW REFACTORING

### 5.1 Keep (Refactor)

| Reusable Workflow | Used By | Changes |
|-------------------|---------|---------|
| `_reusable-setup.yml` | ci-core, ci-verify | Refactor: add Node/pnpm caching |
| `_reusable-test-suite.yml` | ci-core | Refactor: parameterize test type |
| `_reusable-security.yml` | ci-verify | Refactor: add SBOM/SLSA |
| `_reusable-build.yml` | ci-core | Refactor: deterministic mode |

### 5.2 Deprecate (Merge)

| Reusable Workflow | Action |
|-------------------|--------|
| `_reusable-ci-fast.yml` | Merge into `_reusable-test-suite.yml` |
| `_reusable-ci-perf.yml` | Move to `ci-legacy.yml` (non-blocking) |
| `_reusable-node-pnpm-setup.yml` | Merge into `_reusable-setup.yml` |
| `_reusable-toolchain-setup.yml` | Merge into `_reusable-setup.yml` |

---

## 6. TESTING STRATEGY

### 6.1 Validation Tests

**Pre-Merge Checklist**:
- [ ] New workflows pass on feature branch
- [ ] All existing tests pass under new workflows
- [ ] Deterministic build passes twice
- [ ] Security scans pass (no secrets, no critical CVEs)
- [ ] Policy tests pass (`opa test -v`)
- [ ] Golden path passes (`make smoke`)

**Regression Tests**:
- [ ] Compare old vs new workflow results (100% parity)
- [ ] Test on multiple PRs (sample size: 10+)
- [ ] Test on hotfix branch
- [ ] Test on release branch

### 6.2 Rollback Plan

**Trigger**: New workflows cause false positives or false negatives.

**Action**:
1. Disable new workflows (comment out triggers)
2. Re-enable old workflows in branch protection
3. Investigate root cause
4. Fix new workflows on feature branch
5. Re-test, re-deploy

**Rollback Time**: <5 minutes

---

## 7. DOCUMENTATION UPDATES

### 7.1 Required Updates

| Document | Section | Update |
|----------|---------|--------|
| `CONTRIBUTING.md` | CI/CD | Replace workflow references with new workflows |
| `docs/ga/GA_DEFINITION.md` | Part 7 | Update workflow names |
| `docs/ga/TESTING-STRATEGY.md` | CI Gates | Reference new workflows |
| `README.md` | Development | Update CI badge URLs |

### 7.2 New Documentation

- [ ] `docs/ci/WORKFLOW_GUIDE.md` (developer guide to new workflows)
- [ ] `docs/ci/MIGRATION_GUIDE.md` (for contributors using old workflows)
- [ ] `.github/workflows/README.md` (workflow inventory)

---

## 8. METRICS & SUCCESS CRITERIA

### 8.1 Success Metrics

| Metric | Baseline (Current) | Target (Post-Consolidation) |
|--------|-------------------|----------------------------|
| **Total Workflows** | 51 | ≤10 |
| **Required Checks (Branch Protection)** | 15 | 10 |
| **Workflow Execution Time (P50)** | ~8 min | ≤6 min |
| **Workflow Execution Time (P95)** | ~15 min | ≤10 min |
| **False Positive Rate** | ~5% (flaky tests) | <1% |
| **Developer Confusion (Survey)** | N/A | <10% report confusion |

### 8.2 Monitoring

**Dashboards**:
- GitHub Actions usage (cost, duration)
- Workflow success rate (per workflow)
- Time to merge (PR creation → merge)

**Alerts**:
- Workflow failure rate >5% (P2)
- Workflow duration >20 min (P3)
- Deterministic build mismatch (P0)

---

## 9. RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **New workflows break CI** | Low | High | Parallel operation, rollback plan |
| **Parity gap (missing checks)** | Medium | High | Comprehensive mapping, validation tests |
| **Performance regression** | Low | Medium | Optimize reusable workflows, caching |
| **Developer disruption** | Medium | Low | Clear communication, migration guide |
| **False positives** | Low | Medium | Thorough testing, canary rollout |

---

## 10. COMMUNICATION PLAN

### 10.1 Pre-Consolidation

- [ ] Post RFC in team channel (Slack)
- [ ] Present plan at team meeting
- [ ] Gather feedback, iterate

### 10.2 During Consolidation

- [ ] Update PR template to reference new workflows
- [ ] Pin message in Slack: "CI consolidation in progress"
- [ ] Respond to questions in dedicated Slack thread

### 10.3 Post-Consolidation

- [ ] Announce completion (Slack, email)
- [ ] Host Q&A session (office hours)
- [ ] Update onboarding docs

---

## 11. APPENDIX: WORKFLOW TEMPLATES

### 11.1 ci-core.yml (DRAFT)

See Section 12 below (full implementation).

### 11.2 ci-verify.yml (DRAFT)

See Section 13 below (full implementation).

### 11.3 ci-legacy.yml (DRAFT)

See Section 14 below (full implementation).

---

## 12. IMPLEMENTATION: ci-core.yml

**Location**: `.github/workflows/ci-core.yml`

**Purpose**: Primary CI gate (lint, typecheck, unit, build, golden path).

**Status**: Ready for implementation.

**Template**:
```yaml
name: CI Core (Primary Gate)

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  merge_group:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  setup:
    name: Setup
    uses: ./.github/workflows/_reusable-setup.yml

  lint-typecheck:
    name: Lint & Typecheck
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Lint (strict)
        run: pnpm lint --max-warnings 0
      - name: Typecheck
        run: pnpm typecheck

  unit-tests:
    name: Unit Tests
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Run unit tests
        run: pnpm test:unit
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()

  integration-tests:
    name: Integration Tests
    needs: setup
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: summit_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Run migrations
        run: cd server && npx tsx scripts/run-migrations.ts
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/summit_test
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/summit_test
      - name: Verify ecosystem exports
        run: npm test -- test/verification/integrations.node.test.ts --bail
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/summit_test

  deterministic-build:
    name: Deterministic Build
    needs: [lint-typecheck, unit-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Build twice and compare
        run: |
          set -euo pipefail
          export SOURCE_DATE_EPOCH=$(git log -1 --pretty=format:%ct)

          pnpm run build
          find client/dist server/dist -type f -print0 | sort -z | xargs -0 sha256sum > build-checksums-a.txt
          rm -rf client/dist server/dist

          pnpm run build
          find client/dist server/dist -type f -print0 | sort -z | xargs -0 sha256sum > build-checksums-b.txt

          if ! diff -u build-checksums-a.txt build-checksums-b.txt; then
            echo "::error::Build outputs are not deterministic - CI BLOCKED"
            exit 1
          fi
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-checksums
          path: build-checksums-*.txt

  golden-path:
    name: Golden Path
    needs: [deterministic-build, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - name: Bootstrap and smoke test
        run: |
          make bootstrap
          make up
          make smoke
          make down
        if: always()

  ci-core-gate:
    name: CI Core Gate (Summary)
    needs: [lint-typecheck, unit-tests, integration-tests, deterministic-build, golden-path]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Verify all jobs passed
        run: |
          if [[ "${{ needs.lint-typecheck.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.unit-tests.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.integration-tests.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.deterministic-build.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.golden-path.result }}" != "success" ]]; then exit 1; fi
          echo "CI CORE GATE: PASSED"
```

---

## 13. IMPLEMENTATION: ci-verify.yml

**Location**: `.github/workflows/ci-verify.yml`

**Purpose**: Security, provenance, compliance, governance checks.

**Status**: Ready for implementation.

**Template**:
```yaml
name: CI Verify (Security & Compliance)

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for Gitleaks
      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Dependency audit (critical CVEs)
        run: pnpm audit --audit-level critical
      - name: Snyk scan
        if: env.SNYK_TOKEN != ''
        run: npx snyk test
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  policy-compliance:
    name: Policy Compliance
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup OPA
        uses: open-policy-agent/setup-opa@v2
        with:
          version: v0.45.0
      - name: OPA check
        run: opa check policies/
      - name: OPA test
        run: opa test policies/ -v
      - name: Upload OPA results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: opa-test-results
          path: policies/test-results.json

  provenance:
    name: Provenance Generation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Generate SBOM
        run: ./scripts/generate-sbom.sh
      - name: Generate SLSA provenance
        run: ./scripts/attest-slsa.sh
      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
      - name: Upload provenance
        uses: actions/upload-artifact@v4
        with:
          name: slsa-provenance
          path: provenance.json

  schema-validation:
    name: Schema Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: GraphQL schema compatibility
        run: npm run graphql:schema:check

  compliance-gates:
    name: Compliance Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Check audit exception expiry
        run: npx tsx scripts/check-audit-exceptions.ts
      - name: Governance checks
        run: npm run check:governance

  ci-verify-gate:
    name: CI Verify Gate (Summary)
    needs: [security-scan, policy-compliance, provenance, schema-validation, compliance-gates]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Verify all jobs passed
        run: |
          if [[ "${{ needs.security-scan.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.policy-compliance.result }}" != "success" ]]; then exit 1; fi
          # Provenance is informational for PRs, required for releases
          # if [[ "${{ needs.provenance.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.schema-validation.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.compliance-gates.result }}" != "success" ]]; then exit 1; fi
          echo "CI VERIFY GATE: PASSED"
```

---

## 14. IMPLEMENTATION: ci-legacy.yml

**Location**: `.github/workflows/ci-legacy.yml`

**Purpose**: Non-blocking, flaky, experimental checks.

**Status**: Ready for implementation.

**Template**:
```yaml
name: CI Legacy (Non-Blocking)

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quarantine-tests:
    name: Quarantine Tests (Flaky)
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Run quarantined tests
        run: pnpm test:quarantine

  jest-legacy:
    name: Jest/ts-jest Suite (ESM Issues)
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Run Jest suite
        run: npm test

  experimental:
    name: Experimental Checks
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: AI Copilot Canary
        run: make test:ai-canary || true
      - name: Graph Guardrail Fuzz
        run: make test:graph-fuzz || true

  ci-legacy-summary:
    name: CI Legacy Summary (Informational)
    needs: [quarantine-tests, jest-legacy, experimental]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Report results (non-blocking)
        run: |
          echo "Quarantine: ${{ needs.quarantine-tests.result }}"
          echo "Jest: ${{ needs.jest-legacy.result }}"
          echo "Experimental: ${{ needs.experimental.result }}"
          echo "CI LEGACY: INFORMATIONAL (does not block merge)"
```

---

## 15. APPROVAL & SIGN-OFF

**Prepared By**: Release Captain
**Reviewed By**: Security Lead, SRE Lead
**Approved**: ✅ (2026-01-01)

**Decision**: PROCEED with consolidation.

**Next Steps**:
1. Implement workflows (this week)
2. Test on feature branch
3. Enable parallel operation
4. Migrate branch protection rules
5. Archive old workflows

---

**End of CI Consolidation Plan**
