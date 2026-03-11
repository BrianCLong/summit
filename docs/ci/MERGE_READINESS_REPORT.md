# Merge-Readiness Audit Report

**Branch**: `claude/merge-readiness-hardening-aAnSl`
**Audited against**: `origin/main`
**Policy authority**: `docs/ci/REQUIRED_CHECKS_POLICY.yml`

---

## Summary

| Category | Finding | Status |
|----------|---------|--------|
| Duplicate action steps in primary CI | Fixed | ✅ |
| Release workflow concurrency collision | Fixed | ✅ |
| Phantom required check (no matching workflow) | Fixed | ✅ |
| JSON policy / YAML policy divergence | Fixed | ✅ |
| Required check name alignment (yml ↔ json) | Fixed | ✅ |
| Scripts referenced by release pipeline | Verified present | ✅ |

---

## PHASE 1 — Merge Blockers Found

### BLOCKER-1: Duplicate `pnpm/action-setup@v4` in `ci-core.yml` (FIXED)

**File**: `.github/workflows/ci-core.yml`
**Jobs**: `config-preflight` (duplicate pnpm setup), `lint-typecheck` (two `setup-node@v4` steps, missing pnpm setup)

`config-preflight` called `pnpm/action-setup@v4` twice in sequence. `lint-typecheck` called
`actions/setup-node@v4` twice with slightly-different `with:` blocks while missing `pnpm/action-setup@v4`
entirely — meaning pnpm would rely on a runner-provided binary.

**Impact**: The primary CI gate (`CI Core Gate ✅`) would inconsistently resolve pnpm, causing flaky
`pnpm install --frozen-lockfile` failures in lint-typecheck depending on runner pnpm availability.

**Fix**: Removed duplicate `pnpm/action-setup@v4` from `config-preflight`. Replaced duplicate
`setup-node` pair in `lint-typecheck` with `pnpm/action-setup@v4` + single `setup-node@v4`.

---

### BLOCKER-2: Concurrency group collision between `release-ga.yml` and `release-ga-pipeline.yml` (FIXED)

**Files**: `.github/workflows/release-ga.yml`, `.github/workflows/release-ga-pipeline.yml`

Both workflows share the concurrency group key:
```
release-ga-${{ github.ref_name || inputs.tag }}
```
Both trigger on `push: tags: v*.*.*`. With `cancel-in-progress: false`, the second workflow queues
behind the first, then runs duplicate release steps, producing two competing `ga-release` environment
approval requests for the same tag.

**Fix**: Renamed `release-ga.yml` group to `release-ga-simple-${{ github.ref_name || inputs.tag }}`.

---

### BLOCKER-3: Phantom required check — `Routing Resilience Validation` (FIXED)

**File**: `.github/required-checks.yml`

`Routing Resilience Validation` was listed in the required-checks manifest but **no workflow produces
a status check with this name**. Any automated verification tool checking that all required checks
are green would permanently report this as "MISSING", blocking all release automation that depends on
the required-checks file.

**Fix**: Removed from `.github/required-checks.yml`. No workflow produces this check; when a
workflow is added, it should be reintroduced then.

---

### BLOCKER-4: `docs/ci/REQUIRED_CHECKS_POLICY.json` has stale/wrong check names (FIXED)

**File**: `docs/ci/REQUIRED_CHECKS_POLICY.json`

The JSON policy (legacy fallback for `verify-green-for-tag.sh` when `yq` is unavailable) listed:
- `"GA Gate"` — actual job name is `"gate"` (in `ga-gate.yml`)
- `"Unit Tests & Coverage"` — actual check name is `"Unit Tests"` (in `ci-pr.yml`)
- `"CI Core (Primary Gate)"` — actual job name is `"CI Core Gate ✅"` (in `ci-core.yml`)
- Missing: `meta-gate`, `Workflow Validity Check`, `test (20.x)`

When `yq` is absent, `verify-green-for-tag.sh` falls back to JSON. With wrong check names, the
script would look for non-existent checks and mark real passing checks as "not required", silently
allowing promotion with unverified gates.

**Fix**: Updated JSON `always_required` entries to match exact status-check names from workflow
job definitions. Added missing entries. Added `_note` field documenting legacy-fallback purpose.
Bumped version to `2.1.0`.

---

## PHASE 2 — Remaining Risks (Not Fixed in This PR)

### RISK-1: Three-way documentation divergence for branch protection checks

**Files**:
- `.github/required-checks.yml` — 8 checks (after fix)
- `.github/branch-protection-config.yml` — lists different checks: `constitution-enforcement`,
  `evidence-governance`, `stability-envelope-check`, `meta-governance-lock-verification`
- `.github/branch-protection-rules.md` — lists: `quality-gates`, `chaos-test`

These three files are now in three different states. The `.github/branch-protection-config.yml`
appears to be from an older governance-lock architecture. The `branch-protection-rules.md` is
an even older stub.

**Recommendation**: Deprecate `branch-protection-rules.md` and add a header to
`branch-protection-config.yml` clarifying it is an aspirational/governance-lock config, not the
live required-check list. Tracked as a documentation cleanup task.

### RISK-2: `release-ga.yml` and `release-ga-pipeline.yml` still both trigger on GA tags

The minimal `release-ga.yml` (added as a "bypass" fix) now has a distinct concurrency group but
still runs duplicate release logic on every GA tag. The `publish` job in `release-ga.yml` could
race against `release-ga-pipeline.yml`'s `publish` stage. Consider whether `release-ga.yml` should
have its `push: tags: v*.*.*` trigger removed once `release-ga-pipeline.yml` is fully stable.

### RISK-3: `ci-pr.yml` `Unit Tests` check name not confirmed

The YAML policy maps `"Unit Tests"` to `ci-pr.yml`. This was not independently verified against
the actual GitHub status-check name emitted by that workflow. Recommend running a live PR to
confirm the exact string.

### RISK-4: `config-preflight` in `ci-core.yml` does not install Node.js

After fix, `config-preflight` has `pnpm/action-setup@v4` but no `actions/setup-node@v4`. The
`validate-jest-config.cjs` script runs via `node`, which is pre-installed on `ubuntu-latest`
runners. This is acceptable but worth noting.

---

## Required Checks — Canonical Alignment Table

| Status Check Name | Workflow File | Job Name | Branch-Protection Listed |
|---|---|---|---|
| `meta-gate` | `governance-meta-gate.yml` | `meta-gate` | ✅ |
| `CI Core Gate ✅` | `ci-core.yml` | `CI Core Gate ✅` | ✅ |
| `Workflow Validity Check` | `workflow-validity.yml` | `Workflow Validity Check` | ✅ |
| `gate` | `ga-gate.yml` | `gate` | ✅ |
| `Release Readiness Gate` | `release-readiness.yml` | `Release Readiness Gate` | ✅ |
| `Unit Tests` | `ci-pr.yml` | *(unconfirmed)* | ✅ |
| `SOC Controls` | `soc-controls.yml` | *(unconfirmed)* | ✅ |
| `test (20.x)` | `unit-test-coverage.yml` | *(unconfirmed)* | ✅ |

---

## Files Changed

| File | Change |
|------|--------|
| `.github/workflows/ci-core.yml` | Removed duplicate pnpm setup in config-preflight; fixed lint-typecheck to have pnpm setup + single node setup |
| `.github/workflows/release-ga.yml` | Renamed concurrency group to avoid collision with release-ga-pipeline.yml |
| `.github/required-checks.yml` | Removed phantom `Routing Resilience Validation` check |
| `docs/ci/REQUIRED_CHECKS_POLICY.json` | Aligned check names with canonical YAML; added missing entries; bumped to v2.1.0 |
| `docs/ci/MERGE_READINESS_REPORT.md` | This file (deterministic audit artifact) |
| `docs/ci/GATE_ALIGNMENT_REPORT.json` | Deterministic gate alignment evidence |
