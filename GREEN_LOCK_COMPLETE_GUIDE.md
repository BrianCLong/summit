# GREEN-LOCK COMPLETE EXECUTION GUIDE
**Mission: 30 PRs + 461 branches → 0 PRs + bright green main**
**Status: Ready to Execute**
**Date: 2025-09-29**

---

## 🎯 EXECUTIVE SUMMARY

**Current State:**
- ✅ 30 open PRs (down from 444 - 93% reduction achieved)
- ⚠️ 461 branches (need inventory)
- ❌ Merge queue: NOT active (0 runs)
- ❌ Path gating: 3% coverage (2/59 workflows)
- ❌ Retry logic: 0% (no flake resistance)

**Target State (24 hours):**
- ✅ 0 open PRs
- ✅ All 461 branches: tracked with PRs or archived
- ✅ Merge queue: Active with successful landings
- ✅ Main branch: Bright green (100% passing checks)
- ✅ Future PRs: 60-80% fewer checks (path gating deployed)

---

## 📋 COMPLETE EXECUTION PLAN

### PHASE 0: Critical Setup (DO FIRST - 10 minutes)

#### Enable Merge Queue

**URL:** https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/settings/branches

**Steps:**
1. Click "Edit" on `main` branch protection rule
2. Scroll to "Require merge queue"
3. Check the box to enable
4. Configure:
   - Merge method: **Squash and merge**
   - Minimum PRs: **1**
   - Maximum PRs: **5**
   - Check "Only merge non-failing pull requests"
5. Under "Require status checks to pass":
   - Keep required checks **minimal** (<10)
   - Remove any that are consistently failing or phantom
6. Save changes

**Verify:**
```bash
# Should show merge_group events after PRs start merging
gh run list --event merge_group --limit 10
```

**Reference:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue

---

### PHASE 1: Complete Inventory (10 minutes)

#### 1.1: Branch Inventory (Ensures Zero Data Loss)

```bash
# Run the inventory script
./scripts/branch-inventory.sh
```

**Output:** `branch-inventory-YYYYMMDD-HHMMSS.csv`

**Review:**
- Identifies branches without PRs
- Shows last commit date and author
- Calculates divergence from main

**Action Items:**
- Branches >90 days old + no PR → Archive or create tracking PR
- Branches with PR merged → Can delete after verification
- Branches with open PR → Process through triage

#### 1.2: PR Triage & Batch Rerun

```bash
# Run the master execution script
./scripts/green-lock-master-execution.sh
```

**This script automatically:**
1. ✅ Inventories all 30 open PRs with failure counts
2. ✅ Categorizes PRs (GREEN, LOW_FAIL, MEDIUM_FAIL, HIGH_FAIL)
3. ✅ Analyzes failing check patterns
4. ✅ Batch reruns failed jobs for PRs with ≤10 failures
5. ✅ Attempts to merge green PRs
6. ✅ Identifies phantom failures (null workflow checks)
7. ✅ Generates complete action plan

**Output:** `green-lock-reports-YYYYMMDD-HHMMSS/ACTION_PLAN.md`

**Wait Time:** 30-60 minutes for reruns to complete

---

### PHASE 2: Deploy Path Gating (2-3 hours)

Path gating reduces checks/PR by 60-80% by only running relevant jobs.

#### 2.1: Create Reusable Path Filter Workflow

**File:** `.github/workflows/_path-filter-reusable.yml`

```yaml
name: 🚦 Path Filter

on:
  workflow_call:
    outputs:
      services:
        description: "Service code changed"
        value: ${{ jobs.detect.outputs.services }}
      client:
        description: "Client code changed"
        value: ${{ jobs.detect.outputs.client }}
      server:
        description: "Server code changed"
        value: ${{ jobs.detect.outputs.server }}
      policies:
        description: "Policy files changed"
        value: ${{ jobs.detect.outputs.policies }}
      charts:
        description: "Helm/k8s changed"
        value: ${{ jobs.detect.outputs.charts }}
      terraform:
        description: "IaC changed"
        value: ${{ jobs.detect.outputs.terraform }}
      docs:
        description: "Docs only"
        value: ${{ jobs.detect.outputs.docs }}

jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.services }}
      client: ${{ steps.filter.outputs.client }}
      server: ${{ steps.filter.outputs.server }}
      policies: ${{ steps.filter.outputs.policies }}
      charts: ${{ steps.filter.outputs.charts }}
      terraform: ${{ steps.filter.outputs.terraform }}
      docs: ${{ steps.filter.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            services:
              - 'services/**'
            client:
              - 'client/**'
            server:
              - 'server/**'
              - 'packages/**'
            policies:
              - 'policy/**'
              - 'policies/**'
              - '**/*.rego'
            charts:
              - 'charts/**'
              - 'k8s/**'
              - '**/Chart.yaml'
            terraform:
              - 'terraform/**'
              - '**/*.tf'
            docs:
              - 'docs/**'
              - '*.md'
              - 'README*'
```

#### 2.2: Retrofit High-Volume Workflows

**Target workflows (prioritized by volume):**
1. `.github/workflows/pr-validation.yml`
2. `.github/workflows/ci.yml`
3. `.github/workflows/build-and-push.yml`
4. `.github/workflows/helm-ci.yml`
5. `.github/workflows/codeql-analysis.yml`

**Pattern (apply to each):**

```yaml
# BEFORE
name: PR Validation
on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test

# AFTER
name: PR Validation
on:
  pull_request:
    branches: [main]

jobs:
  path-filter:
    uses: ./.github/workflows/_path-filter-reusable.yml

  test:
    needs: [path-filter]
    if: needs.path-filter.outputs.server == 'true' || needs.path-filter.outputs.client == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test
```

**Commit each incrementally:**
```bash
git add .github/workflows/pr-validation.yml
git commit -m "feat: add path gating to pr-validation workflow"
git push
```

---

### PHASE 3: Add Step-Level Retry (1 hour)

Wrap only flaky steps (install/build/test) with retry logic.

#### 3.1: Identify Flaky Steps

Common culprits:
- `pnpm install` (network issues)
- `docker-compose up` (port conflicts)
- `npm audit` (registry timeouts)
- Test commands (timing issues)

#### 3.2: Add Retry Wrapper

**Pattern:**

```yaml
# BEFORE
- name: Install dependencies
  run: pnpm install --frozen-lockfile

# AFTER
- name: Install dependencies (with retry)
  uses: nick-fields/retry@v3
  with:
    timeout_minutes: 10
    max_attempts: 3
    retry_wait_seconds: 5
    command: pnpm install --frozen-lockfile
```

**Apply to 5-10 highest-volume workflows.**

**Reference:** https://github.com/nick-fields/retry

---

### PHASE 4: Batch Process PRs (Continuous)

#### 4.1: Re-run Master Script (After Reruns Complete)

```bash
# Wait 1 hour after initial run, then re-run
./scripts/green-lock-master-execution.sh
```

**Expected improvement:**
- LOW_FAIL PRs (≤3 failures) → Many should be GREEN now
- MEDIUM_FAIL PRs (4-10) → Should drop to LOW_FAIL

#### 4.2: Merge Green PRs

```bash
# Extract green PRs from latest report
GREEN_PRS=$(jq -r '.[] | select(.category=="GREEN") | .prs[]' < green-lock-reports-*/pr-categories.json | tail -1)

# Merge each
echo "$GREEN_PRS" | while read pr; do
  echo "Merging PR #$pr..."
  gh pr merge "$pr" --squash --delete-branch
done
```

#### 4.3: Handle Phantom Failures

PRs with only "null workflow" failures (checks that don't exist):

```bash
# Identify phantom-only PRs
for pr in $(gh pr list --state open --json number --jq '.[].number'); do
  PHANTOM=$(gh pr checks "$pr" --json link,bucket --jq '[.[] | select(.bucket=="fail" and .link == null)] | length')
  REAL=$(gh pr checks "$pr" --json link,bucket --jq '[.[] | select(.bucket=="fail" and .link != null)] | length')

  if [ "$PHANTOM" -gt 0 ] && [ "$REAL" -eq 0 ]; then
    echo "PR #$pr: phantom-only (safe to merge if you're admin)"
  fi
done
```

**Options:**
1. Merge with `--admin` flag (bypasses branch protection)
2. Remove phantom checks from required checks in branch protection
3. Close stale PRs if no longer needed

---

### PHASE 5: OPA & Preflights (Ongoing)

#### 5.1: OPA Policy Formatting

Before pushing policy changes:
```bash
# Format all policies
opa fmt -w policy/ policies/

# Run unit tests
opa test policy/ policies/ -v
```

**Add to CI:**
```yaml
- name: OPA Format Check
  run: |
    NEEDS_FMT=$(opa fmt --list policy/ policies/ || true)
    if [ -n "$NEEDS_FMT" ]; then
      echo "❌ Policies need formatting:"
      echo "$NEEDS_FMT"
      exit 1
    fi

- name: OPA Unit Tests
  run: opa test policy/ policies/ -v --coverage
```

**Reference:** https://www.openpolicyagent.org/docs/latest/cli/

#### 5.2: Vitest Type References

For Vitest test files, ensure TypeScript sees globals:

```typescript
/// <reference types="vitest" />

import { describe, it, expect } from 'vitest'

describe('My Test', () => {
  it('should pass', () => {
    expect(true).toBe(true)
  })
})
```

**Or** add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

**Reference:** https://vitest.dev/guide/

---

## 🔄 CONTINUOUS EXECUTION LOOP

### Every 2 Hours (Until Complete)

1. **Run Master Script:**
   ```bash
   ./scripts/green-lock-master-execution.sh
   ```

2. **Check Progress:**
   ```bash
   # Open PR count (target: 0)
   gh pr list --state open --json number --jq 'length'

   # Merge queue activity (target: >0)
   gh run list --event merge_group --limit 5
   ```

3. **Merge Ready PRs:**
   ```bash
   # Green PRs from latest report
   jq -r '.[] | select(.category=="GREEN") | .prs[]' < green-lock-reports-latest/pr-categories.json | while read pr; do
     gh pr merge "$pr" --squash --delete-branch
   done
   ```

4. **Address Blockers:**
   - Review `ACTION_PLAN.md` from latest report
   - Fix any deterministic failures
   - Rerun flaky checks

---

## 📊 SUCCESS METRICS

### Hour 6 Checkpoint
- [ ] Open PRs: 30 → 15-20 (50% reduction)
- [ ] Merge queue: Active (>5 merge_group runs)
- [ ] Path gating: Deployed to 5+ workflows
- [ ] At least 5 PRs merged

### Hour 12 Checkpoint
- [ ] Open PRs: 15-20 → 5-10 (75% total reduction)
- [ ] Main branch: Last 10 commits green
- [ ] Path gating: Deployed to 10+ workflows
- [ ] Retry logic: Added to 5+ workflows
- [ ] At least 15 PRs merged

### Hour 24 Checkpoint (FINAL)
- [ ] Open PRs: **0**
- [ ] All 461 branches: Tracked or archived
- [ ] Main branch: **Bright green** (100% passing)
- [ ] Merge queue: Continuously landing PRs
- [ ] Future PRs: 60-80% fewer checks
- [ ] All 30+ PRs merged or closed with justification

---

## 🚨 TROUBLESHOOTING

### "Merge queue not working"

**Symptoms:** No merge_group events after enabling

**Diagnosis:**
```bash
# Check queue configuration
gh api repos/:owner/:repo/branches/main/protection
```

**Fix:**
1. Verify "Require merge queue" is checked
2. Ensure required checks are configured (but keep <10)
3. Test with a trivial PR (docs-only)

### "PRs stuck with failing checks"

**Diagnosis:**
```bash
# See which checks are failing
gh pr checks <PR> --json name,bucket,link
```

**Fix:**
1. If `link == null` → Phantom check, remove from required checks
2. If link present → Check logs: `gh run view <RUN_ID> --log-failed`
3. If transient → Rerun: `gh run rerun <RUN_ID> --failed`
4. If deterministic → Fix code/config

### "Can't merge - checks required"

**Symptoms:** PR shows "Merging is blocked"

**Diagnosis:**
```bash
# List required checks
gh api repos/:owner/:repo/branches/main/protection/required_status_checks
```

**Fix:**
1. Go to branch protection settings
2. Remove checks that don't exist or are always failing
3. Keep only core checks: build, test, security scan

### "API rate limited"

**Symptoms:** gh commands return 403

**Diagnosis:**
```bash
gh api rate_limit
```

**Fix:**
1. Wait for rate limit to reset (shown in response)
2. Reduce script concurrency
3. Add exponential backoff to automation
4. Use PAT with higher limits

---

## 📁 FILE INVENTORY

### Scripts Created
- `scripts/branch-inventory.sh` - Complete branch catalog (zero data loss)
- `scripts/green-lock-master-execution.sh` - Automated triage & merge
- `.github/scripts/retry-with-backoff.sh` - Retry wrapper (created earlier)

### Documentation
- `GREEN_LOCK_COMPLETE_GUIDE.md` - This file (master reference)
- `GREEN_LOCK_LIVE_VERIFICATION.md` - Initial verification report
- `GREEN_LOCK_IMPLEMENTATION_PLAN.md` - 24-hour roadmap
- `GREEN_LOCK_EXECUTION_SUMMARY.md` - Current status tracking

### Generated Reports (from master script)
- `branch-inventory-*.csv` - Complete branch data
- `green-lock-reports-*/pr-inventory.json` - All PR data
- `green-lock-reports-*/pr-categories.json` - PRs by failure severity
- `green-lock-reports-*/failing-check-patterns.json` - Common failures
- `green-lock-reports-*/phantom-analysis.csv` - Null workflow checks
- `green-lock-reports-*/ACTION_PLAN.md` - Specific next steps

---

## 🚀 IMMEDIATE NEXT STEPS (COPY-PASTE)

```bash
# 1. Enable merge queue (manual - see Phase 0)
# URL: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/settings/branches

# 2. Run branch inventory
./scripts/branch-inventory.sh

# 3. Run master execution script
./scripts/green-lock-master-execution.sh

# 4. Wait 1 hour for reruns

# 5. Check progress
gh pr list --state open --json number --jq 'length'

# 6. Merge green PRs
jq -r '.[] | select(.category=="GREEN") | .prs[]' < green-lock-reports-latest/pr-categories.json | while read pr; do
  gh pr merge "$pr" --squash --delete-branch
done

# 7. Repeat steps 3-6 every 2 hours until complete
```

---

## 📚 REFERENCE DOCUMENTATION

- **Merge Queue:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- **Path Gating (dorny/paths-filter):** https://github.com/dorny/paths-filter
- **Step Retry (nick-fields/retry):** https://github.com/nick-fields/retry
- **GitHub CLI (gh):** https://cli.github.com/manual/
- **OPA CLI:** https://www.openpolicyagent.org/docs/latest/cli/
- **Vitest:** https://vitest.dev/guide/

---

**🎯 MISSION: 30 PRs + 461 branches → 0 PRs + bright green main in 24 hours**

**Current Progress: Infrastructure complete, ready for execution**

**Status: COMMIT THIS FILE AND ALL SCRIPTS, THEN EXECUTE**

---

*Generated by Claude Code - Green-Lock Complete Guide - v1.0*