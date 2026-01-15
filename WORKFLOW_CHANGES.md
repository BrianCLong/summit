# Workflow Optimization Changes - Quick Reference

## Summary

- **Total workflows modified**: 24
- **Concurrency added**: 23 workflows
- **Path filters added**: 10 workflows
- **Workflows already optimized**: 8 workflows

## Changes by Workflow

### 1. ga-gate.yml

**Changes:**

- ✅ Added concurrency control
- ✅ Added paths-ignore for docs

**Concurrency:**

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

**Path Filters:**

```yaml
paths-ignore:
  - "**.md"
  - "docs/**"
  - ".github/workflows/*.md"
  - ".github/ISSUE_TEMPLATE/**"
  - ".github/PULL_REQUEST_TEMPLATE/**"
  - "LICENSE"
  - ".gitignore"
```

---

### 2. unit-test-coverage.yml

**Changes:**

- ✅ Added concurrency control
- ✅ Added paths-ignore for docs

**Impact:** Prevents expensive test runs on docs-only changes

---

### 3. ci-core.yml (PRIMARY GATE)

**Changes:**

- ⚠️ Already had concurrency
- ✅ Added paths-ignore for docs

**Impact:** Primary CI gate now skips docs-only PRs, saving significant resources

---

### 4. docker-build.yml (HEAVY)

**Changes:**

- ✅ Added concurrency control
- ✅ Added targeted path filters

**Path Filters:**

```yaml
pull_request:
  paths:
    - "Dockerfile"
    - "docker-compose*.yml"
    - ".dockerignore"
    - "server/**"
    - "client/**"
    - "package.json"
    - "pnpm-lock.yaml"
    - ".github/workflows/docker-build.yml"
```

**Impact:** Multi-arch Docker builds (15-20 min) only run when Docker or code changes

---

### 5. supply-chain-integrity.yml (HEAVY)

**Changes:**

- ✅ Added concurrency control
- ✅ Added targeted path filters

**Path Filters:**

```yaml
pull_request:
  paths:
    - "package.json"
    - "pnpm-lock.yaml"
    - "server/package.json"
    - "client/package.json"
    - "Dockerfile"
    - "scripts/generate-sbom.sh"
    - "scripts/scan-vulnerabilities.sh"
    - "scripts/check-reproducibility.sh"
    - ".github/workflows/supply-chain-integrity.yml"
```

**Impact:** SBOM generation and vulnerability scanning (10-15 min) only run when dependencies change

---

### 6. pr-gates.yml

**Changes:**

- ✅ Added concurrency control
- ✅ Added paths-ignore for docs

---

### 7. agent-guardrails.yml

**Changes:**

- ✅ Added concurrency control

---

### 8. compliance.yml

**Changes:**

- ✅ Added concurrency control
- ✅ Added paths-ignore for docs

**Concurrency:** Conditional cancel for scheduled runs

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

---

### 9. compliance-governance.yml

**Changes:**

- ✅ Added concurrency control
- ✅ Added paths-ignore for docs

---

### 10. governance-check.yml

**Changes:**

- ✅ Added concurrency control

---

### 11. governance-engine.yml

**Changes:**

- ✅ Added concurrency control

---

### 12. pr-quality-gate.yml

**Changes:**

- ✅ Added concurrency control

---

### 13. rc-lockdown.yml

**Changes:**

- ✅ Added concurrency control

---

### 14. release-gate.yml

**Changes:**

- ✅ Added concurrency control

**Concurrency:** Conditional cancel for workflow_dispatch

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

---

### 15. ga-ready.yml

**Changes:**

- ✅ Added concurrency control
- ✅ Added paths-ignore for docs

---

### 16. release-reliability.yml

**Changes:**

- ✅ Added concurrency control

---

### 17. repro-build-check.yml

**Changes:**

- ✅ Added concurrency control

---

### 18. secret-scan-warn.yml

**Changes:**

- ✅ Added concurrency control

**Concurrency:** Conditional cancel for workflow_dispatch and push

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

---

### 19. semver-label.yml

**Changes:**

- ✅ Added concurrency control

---

### 20. ux-governance.yml

**Changes:**

- ✅ Added concurrency control

---

### 21. verify-claims.yml

**Changes:**

- ✅ Added concurrency control

---

### 22. web-accessibility.yml

**Changes:**

- ✅ Added concurrency control
- ⚠️ Already had path filters (apps/web/\*\*)

---

### 23. schema-compat.yml

**Changes:**

- ✅ Added concurrency control
- ⚠️ Already had path filters (scripts/schema-compat/\*\*)

---

### 24. schema-diff.yml

**Changes:**

- ✅ Added concurrency control
- ⚠️ Already had path filters (graphql/schema.graphql, api-schemas/\*\*)

---

## Workflows Already Optimized (No Changes Needed)

### ci.yml

- ✅ Already had concurrency
- ✅ Already had paths-ignore for docs

### codeql.yml

- ✅ Already had concurrency
- ✅ Already had paths-ignore for docs
- **Note:** Uses conditional cancel for PRs only

### ci-verify.yml

- ✅ Already had concurrency

### ci-legacy.yml

- ✅ Already had concurrency

### mvp4-gate.yml

- ✅ Already had concurrency

### release-ga.yml

- ✅ Already had concurrency

### a11y-keyboard-smoke.yml

- ✅ Already had concurrency

---

## Testing Checklist

### Test 1: Docs-only PR

- [ ] Update README.md
- [ ] Verify docker-build.yml skips
- [ ] Verify supply-chain-integrity.yml skips
- [ ] Verify ci-core.yml skips
- [ ] Verify docs-lint.yml runs

### Test 2: Code change PR

- [ ] Update server/src/app.ts
- [ ] Verify all gates run (ci-core, ga-gate, etc.)
- [ ] Verify docker-build runs
- [ ] Verify supply-chain-integrity runs

### Test 3: Dependency change PR

- [ ] Update package.json
- [ ] Verify supply-chain-integrity runs
- [ ] Verify docker-build runs

### Test 4: Docker change PR

- [ ] Update Dockerfile
- [ ] Verify docker-build runs
- [ ] Verify supply-chain-integrity runs

### Test 5: Multiple commits

- [ ] Create PR with commit 1
- [ ] Push commit 2 before commit 1 workflows finish
- [ ] Verify commit 1 workflows are canceled
- [ ] Verify only commit 2 workflows run

---

## Rollback Plan

If issues occur, revert changes to specific workflows:

```bash
# Revert specific workflow
git checkout HEAD~1 .github/workflows/WORKFLOW_NAME.yml

# Or revert all workflow changes
git checkout HEAD~1 .github/workflows/
```

---

## Key Patterns Used

### Standard Concurrency (PR + Push)

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

### Conditional Concurrency (Mixed triggers)

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

### Standard Path Ignore (Docs)

```yaml
paths-ignore:
  - "**.md"
  - "docs/**"
  - ".github/workflows/*.md"
  - ".github/ISSUE_TEMPLATE/**"
  - ".github/PULL_REQUEST_TEMPLATE/**"
  - "LICENSE"
```

### Targeted Paths (Include specific files)

```yaml
paths:
  - "Dockerfile"
  - "package.json"
  - "server/**"
  - ".github/workflows/THIS_WORKFLOW.yml"
```

---

**Last Updated**: 2026-01-07
