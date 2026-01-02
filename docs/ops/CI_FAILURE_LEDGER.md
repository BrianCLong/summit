# CI Failure Ledger

## Summary

This document tracks the root causes and fixes for supply-chain and GA workflow failures.

---

## Workflow 1: supply-chain-integrity.yml

### Run URLs (Examples)

- https://github.com/BrianCLong/summit/actions/runs/20667335070
- https://github.com/BrianCLong/summit/actions/runs/20667312031
- https://github.com/BrianCLong/summit/actions/runs/20667260716

### Root Cause Classification

**Category: Cache Configuration Mismatch**

The workflow used `cache: 'npm'` in the `actions/setup-node@v4` step, but the project uses pnpm as its package manager (evidenced by `"packageManager": "pnpm@10.0.0"` in package.json and the presence of pnpm-lock.yaml).

### Evidence

`.github/workflows/supply-chain-integrity.yml` lines 27-31 (before fix):

```yaml
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm" # INCORRECT - project uses pnpm
```

### Fix Applied

Added pnpm setup step and changed cache to pnpm:

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4

- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "pnpm" # CORRECTED
```

### Commit

`fix/supply-chain-workflows-ga-unblock` branch, commit: "fix(ci): use pnpm cache instead of npm in supply-chain-integrity workflow"

---

## Workflow 2: golden-path-supply-chain.yml

### Run URLs (Examples)

- https://github.com/BrianCLong/summit/actions/runs/20667335136
- https://github.com/BrianCLong/summit/actions/runs/20667311951
- https://github.com/BrianCLong/summit/actions/runs/20667260785

### Root Cause Classification

**Category: Workflow Structure Issue**

The workflow is intentionally disabled (jobs have `if: false`) but the workflow file structure itself may cause issues. The workflow only has `workflow_dispatch` trigger, so it should NOT run on PRs. However, the workflow runs are appearing on PR branches.

### Current Status

The workflow has:

1. A placeholder job that runs successfully
2. `build-reference` job with `if: false` (disabled)
3. `publish-evidence` job with `if: false` (disabled)

The runs on PR branches suggest either:

- Misidentification of workflow runs in the GitHub Actions UI
- Stale workflow runs from before the workflow was disabled

### Resolution

No code changes needed. The placeholder job should pass and disabled jobs are skipped. If failures persist after supply-chain-integrity fix, the workflow should be reviewed for trigger conditions.

---

## Security Patch Consolidation Analysis

### PRs with Path Traversal Fixes

#### PR #15373: Sentinel Fix Path Traversal

- **Branch:** `sentinel-fix-path-traversal-recipes-9225132464907612930`
- **Status:** OPEN, MERGEABLE
- **Files Changed:**
  - `server/src/routes/recipes.ts` (+13, -1)
  - `reproduce_issue.test.ts` (deleted)
- **Approach:** Uses `path.relative()` for validation

```javascript
const rel = path.relative(recipesRoot, fullPath);
if (rel.startsWith('..') || path.isAbsolute(rel)) {
  console.warn(`[SECURITY] Blocked path traversal attempt: ${file}`);
  continue;
}
```

#### PR #15380: Sprint 2026.02 Hard Gates

- **Branch:** `sprint-2026-02-hard-gates-336599783514769177`
- **Status:** OPEN, CONFLICTING
- **Files Changed:** 17 files (many unrelated to security)
  - `server/src/routes/recipes.ts` (+9, -2)
  - `server/src/recipes/loader.ts` (+15, -5)
  - Plus: dependency monitoring, quality gates, performance baseline, etc.
- **Approach:** Uses `startsWith()` for validation

```javascript
if (!fullPath.startsWith(recipesDir + path.sep)) {
  continue;
}
```

### Recommendation

1. **Land PR #15373 first**
   - Focused, clean security fix
   - More thorough validation using `path.relative()`
   - Smaller diff, easier to review
   - MERGEABLE status

2. **Rebase PR #15380 after #15373 merges**
   - Currently has CONFLICTING status
   - The loader.ts fix is good defense-in-depth
   - Other features in the PR can be reviewed separately

3. **Do NOT land both as-is**
   - Both PRs modify `server/src/routes/recipes.ts`
   - Will cause merge conflicts
   - Risk of duplicate/conflicting implementations

---

## Before/After Evidence

### Before (main branch)

**File:** `server/src/routes/recipes.ts:37-43`

```javascript
let validRecipeFile = null;
for (const file of recipeFiles) {
  const fullPath = path.join(process.cwd(), "recipes", file);
  if (fs.existsSync(fullPath)) {
    validRecipeFile = file;
    break;
  }
}
```

**Vulnerability:** No path traversal protection. User input directly joined with path.

### After (PR #15373)

```javascript
let validRecipeFile = null;
const recipesRoot = path.resolve(process.cwd(), "recipes");

for (const file of recipeFiles) {
  const fullPath = path.resolve(recipesRoot, file);
  const rel = path.relative(recipesRoot, fullPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    console.warn(`[SECURITY] Blocked path traversal attempt: ${file}`);
    continue;
  }
  if (fs.existsSync(fullPath)) {
    validRecipeFile = file;
    break;
  }
}
```

**Fix:** Validates resolved path is within recipes directory using `path.relative()`.

---

## Action Items

- [x] Fix supply-chain-integrity.yml pnpm cache issue
- [x] Push fix branch and create PR (#15406)
- [ ] Wait for PR #15406 CI to complete (currently queued - runner backlog)
- [ ] Merge PR #15406 (supply-chain fix)
- [ ] Merge PR #15373 (path traversal fix)
- [ ] Rebase PR #15380 on updated main
- [ ] Verify all supply-chain workflows pass on main

---

## Current Status (2026-01-02 23:50 UTC)

### PR #15406 - Supply Chain Workflow Fix
- **Branch:** `fix/supply-chain-workflows-ga-unblock`
- **Status:** OPEN, MERGEABLE
- **CI Status:** 33 checks queued, 0 failed, 1 completed
- **Fix Applied:** Added pnpm/action-setup@v4, changed cache from 'npm' to 'pnpm'

### PR #15373 - Security Path Traversal Fix
- **Branch:** `sentinel-fix-path-traversal-recipes-9225132464907612930`
- **Status:** OPEN, MERGEABLE
- **CI Status:** 35 checks queued, 3 in progress, 75 completed (70 cancelled from previous run)
- **Fix Applied:** Added path.relative() validation in recipes.ts

### PR #15380 - Sprint 2026.02 Hard Gates
- **Branch:** `sprint-2026-02-hard-gates-336599783514769177`
- **Status:** OPEN, CONFLICTING
- **Action Required:** Rebase after PR #15373 merges

### Merge Order Recommendation
1. PR #15406 (supply-chain fix) - unblocks main CI
2. PR #15373 (security fix) - clean, focused security patch
3. PR #15380 (rebase required) - larger sprint bundle

---

Generated: 2026-01-02
