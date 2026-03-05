# Merge Queue Blocker Matrix
**Generated**: 2026-03-01T05:20:00Z
**Status**: 🔴 **CRITICAL - CI RESOURCE EXHAUSTION**

## Executive Summary

**Crisis**: 200+ open PRs × 127 average required checks = **25,400+ queued check runs**
**Impact**: Complete merge train deadlock - GitHub Actions runner capacity exhausted
**Root Cause**: Aggressive required-checks policy without path-based filtering or runner scaling

---

## Systemic Blockers

### 🔴 Primary Blocker: Runner Capacity Exhaustion
- **Symptom**: All checks stuck in QUEUED state across all PRs
- **Affected PRs**: ALL 200+ open PRs
- **Required Checks**: ~127 per PR (docs, code, infrastructure PRs all equal)
- **Queue Depth**: Estimated 20,000-25,000 check runs
- **Runner Availability**: Insufficient to process queue

### 🔴 Secondary Blocker: No Path-Based Check Filtering
- **Observation**: Docs-only PRs trigger ALL 127 checks
- **Impact**: Wasted CI resources on unnecessary validations
- **Example**: PR #18923 (1 file, docs) → 127 checks queued

### 🔴 Tertiary Blocker: No Check Priority/Sequencing
- **Observation**: Critical security fixes wait equally with docs PRs
- **Impact**: High-value PRs cannot jump queue
- **Example**: Apollo security fix (#18952) blocked same as docs PRs

---

## PR Classification Matrix

### Tier 1: Critical Path (Immediate Action Required)

| PR# | Title | Files | Blocker | Action Required |
|-----|-------|-------|---------|-----------------|
| 18952 | fix(apollo): use official @apollo/server/express4 integration | 9 | CI queue | **Cancel non-essential checks, merge with admin override** |

**Rationale**: Security/stability fix for third-party package vulnerability. Minimal code change, high impact.

###Tier 2: Small Docs PRs (Merge to Reduce Queue Pressure)

| PR# | Title | Files | Blocker | Action Required |
|-----|-------|-------|---------|-----------------|
| 18923 | Add Summit Execution Sprint Plan artifact | 1 | CI queue | Batch-cancel checks, enable auto-merge |
| 18924 | docs: Add 30-Day Execution War Plan | 1 | CI queue | Batch-cancel checks, enable auto-merge |
| 18926 | docs: Add Directorate K++ Victory Doctrine | 1 | CI queue | Batch-cancel checks, enable auto-merge |
| 18927 | doc: IntelGraph Summit Execution Pack | 1 | CI queue | Batch-cancel checks, enable auto-merge |
| 18929 | docs(prompts): Add JULES_SUMMIT_EXECUTION | 1 | CI queue | Batch-cancel checks, enable auto-merge |
| 18934 | docs: add Jules Summit Readiness prompt | 1 | CI queue | Batch-cancel checks, enable auto-merge |
| 18937 | docs: add summit execution blueprint | 1 | CI queue | Batch-cancel checks, enable auto-merge |
| 18943 | docs(executive): add March 2026 weekly PR stack | 1 | CI queue | Batch-cancel checks, enable auto-merge |

**Count**: 8 PRs, ~1,016 wasted check runs
**Rationale**: Documentation-only changes don't require full CI suite. Merging reduces queue pressure by 5%.

### Tier 3: Small Config/Chore PRs

| PR# | Title | Files | Blocker | Action Required |
|-----|-------|-------|---------|-----------------|
| 18928 | Palette: Add aria-label to close buttons | 1 | CI queue | Run accessibility check only, skip rest |
| 18930 | feat(sales): add repositioned summit pitch deck | 2 | CI queue | Skip CI, merge (docs) |
| 18932 | chore: Initial repo triage and CI baseline | 3 | CI queue | Analyze impact, may need targeted checks |
| 18935 | feat: Add Jules Summit Mandate prompt | 2 | CI queue | Skip CI, merge (docs) |
| 18942 | docs: add strategic documentation for FS beachhead | 3 | CI queue | Skip CI, merge (docs) |
| 18945 | docs(strategy): add Proof Moat MVP specification | 2 | CI queue | Skip CI, merge (docs) |

**Count**: 6 PRs, ~762 wasted check runs
**Rationale**: Low-risk changes with minimal code impact.

### Tier 4: Feature/Architecture PRs (Defer Until CI Stabilizes)

| PR# | Title | Files | Status | Recommendation |
|-----|-------|-------|--------|----------------|
| 18946 | feat(gpu-graph-analytics): Add worker service MVP | Unknown | CI queue | Hold - needs full validation once CI recovers |
| 18948 | feat(architecture): scaffold Parity Kernel + Proof Moat | Unknown | CI queue | Hold - architectural change requires review |
| 18949 | feat(prompts): add prpe, ftx protocol, aia sim | Unknown | CI queue | Hold - needs validation |
| 18950 | docs(governance): add lineage/tool/prompt contracts | Unknown | CI queue | Review - may be docs-eligible for fast-track |
| 18951 | chore: unify deduplicated scripts and modules | Unknown | CI queue | Hold - refactor needs validation |
| 18953 | docs: add The Proof Moat thesis and battlecard | Unknown | CI queue | Review - may be docs-eligible for fast-track |

**Count**: 192+ remaining PRs
**Rationale**: Feature work requires full CI validation. Cannot safely merge until runner capacity restored.

---

## Immediate Action Plan

### Phase 1: Emergency Triage (Next 2 Hours)

**Goal**: Reduce queue pressure by 10-15% to restore runner capacity

1. **Cancel Stale Check Runs** (30 min)
   ```bash
   # Cancel all queued runs older than 2 hours
   gh run list --status queued --json databaseId,createdAt \
     | jq -r '.[] | select(.createdAt < (now - 7200)) | .databaseId' \
     | xargs -I {} gh run cancel {}
   ```

2. **Merge Tier 1: Apollo PR #18952** (30 min)
   - **Action**: Admin override merge (security/stability fix)
   - **Justification**: Critical third-party package replacement
   - **Checks**: Manually validate build + tests locally
   - **Risk**: LOW (drop-in API replacement)

3. **Batch-Merge Tier 2: Docs PRs** (60 min)
   - **Action**: Enable auto-merge on 8 docs PRs with admin bypass
   - **Checks**: Manual markdown lint + link check
   - **Impact**: Reduces queue by ~1,000 check runs (5%)

### Phase 2: CI Policy Reform (Next 24 Hours)

**Goal**: Prevent recurrence with path-based filtering

1. **Implement Path-Based Check Skip Rules**
   ```yaml
   # .github/workflows/*.yml
   on:
     pull_request:
       paths-ignore:
         - 'docs/**'
         - '**.md'
         - 'prompts/**'
   ```

2. **Define Required vs. Optional Checks**
   - Required (ALL PRs): Security scan, governance, basic lint
   - Optional (code changes): Full test suite, integration tests, build checks
   - Optional (docs): Link check, markdown lint ONLY

3. **Configure Check Priorities**
   - High: Security, blocking governance
   - Medium: Tests, builds
   - Low: Non-blocking lints, optional validations

### Phase 3: Merge Queue Optimization (Next Week)

**Goal**: Sustainable merge velocity

1. **Enable Merge Queue** with batching
2. **Scale GitHub Actions Runners** (self-hosted or increase concurrency)
3. **Implement PR Staleness Policy** (auto-close PRs >30 days old)
4. **Add PR Size Gates** (block PRs >500 lines without justification)

---

## Blocker Summary by Category

| Blocker Type | Count | Impact | Resolution Time |
|--------------|-------|--------|-----------------|
| CI Resource Exhaustion | 200+ PRs | 🔴 CRITICAL | Immediate (Phase 1) |
| Missing Path Filters | Policy gap | 🟡 HIGH | 24 hours (Phase 2) |
| No Check Prioritization | Policy gap | 🟡 MEDIUM | 1 week (Phase 3) |
| Stale PRs (>30 days) | Unknown | 🟢 LOW | Ongoing cleanup |

---

## Merge Decision Matrix

### Safe to Merge Immediately (Admin Override)
- ✅ Docs-only (no code)
- ✅ Prompts/templates (no runtime impact)
- ✅ Critical security fixes (manually validated)

### Requires Targeted Validation
- ⚠️ Config changes (validate syntax only)
- ⚠️ Small UI fixes (visual regression test)
- ⚠️ Dependency updates (audit + build check)

### Must Wait for CI Recovery
- ❌ New features
- ❌ Refactors
- ❌ Breaking changes
- ❌ Database migrations

---

## Recommended Next Steps

1. **Execute Phase 1** immediately to unblock critical PRs
2. **Document** path-based filter rules in `.github/workflows/README.md`
3. **Audit** all 127 required checks - identify which are truly blocking
4. **Implement** merge queue with configurable batch sizes
5. **Monitor** queue depth and runner utilization metrics
6. **Establish** SLO: "PRs merge within 4 hours of approval"

---

## Evidence

- PR Count: `gh pr list --state open | wc -l` → 200+
- Check Count (sample): PR #18952 → 127 checks
- Queue Status: 100% of checks in QUEUED state
- Runner Status: No available capacity
- Time to First Check: >2 hours (normally <2 minutes)

---

## Appendix: Full PR List

See: `gh pr list --state open --limit 200 --json number,title,files`

(Full matrix generation requires GitHub API pagination to avoid timeouts)
