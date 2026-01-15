# MVP-4 Post-GA Stabilization Tagging Guide

**Authority:** `docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md`
**Scope:** Release candidate tagging for stabilization releases only
**Date:** 2026-01-07

## Tag Format

All MVP-4 Post-GA Stabilization releases use standard SemVer format:

- **Release Candidate:** `vX.Y.Z-rc.N` (e.g., `v4.1.2-rc.1`)
- **General Availability:** `vX.Y.Z` (e.g., `v4.1.2`)

### Version Components

- `X` = Major version (breaking changes)
- `Y` = Minor version (backward-compatible features)
- `Z` = Patch version (backward-compatible fixes)
- `N` = RC number (incrementing from 1)

## Current Version Context

Based on repository state:

- **Current package.json version:** `4.1.1`
- **Next stabilization RC:** `v4.1.2-rc.1`
- **Next stabilization GA:** `v4.1.2`

## RC Incrementing Rule

### First RC for New Patch Version

When cutting the first RC for a new patch release:

```
Current GA: v4.1.1
Next RC:    v4.1.2-rc.1
```

### Subsequent RCs for Same Patch

If the RC needs to be recut (e.g., CI failures, bugs found):

```
Previous RC: v4.1.2-rc.1
Next RC:     v4.1.2-rc.2
```

Algorithm:

1. Find latest SemVer tag matching `vX.Y.Z` or `vX.Y.Z-rc.N`
2. If latest tag is GA (`vX.Y.Z`), increment patch and set RC to 1: `vX.Y.(Z+1)-rc.1`
3. If latest tag is RC (`vX.Y.Z-rc.N`), increment RC number: `vX.Y.Z-rc.(N+1)`

## Promotion Rule

### RC to GA Promotion

An RC is promoted to GA when:

1. All CI checks are green (no failures in critical workflows)
2. All verification commands pass (see `MVP-4_STABILIZATION_EVIDENCE_PACK.md`)
3. No P0 or P1 issues discovered during RC testing period (minimum 24 hours)
4. Security scans show no new critical/high vulnerabilities
5. Release approval obtained per stabilization plan

Promotion process:

```bash
# Given RC: v4.1.2-rc.3 that passes all gates
# Create GA tag with same version (without -rc.N suffix)
git tag -a v4.1.2 -m "MVP-4 Stabilization Release v4.1.2"
```

### Tag Verification

Before pushing tags, verify:

```bash
# Check tag exists and points to correct commit
git show v4.1.2-rc.1

# Verify tag is signed (if using GPG)
git tag -v v4.1.2-rc.1

# Verify CI status on the tagged commit
gh run list --commit $(git rev-parse v4.1.2-rc.1)
```

## Tag Creation Rules

1. **Clean working tree required:** No uncommitted changes
2. **CI must be green:** All critical workflows passing on HEAD
3. **Annotated tags only:** Use `git tag -a` with descriptive message
4. **No tag rewriting:** If a tag is wrong, create a new RC; never delete/recreate pushed tags
5. **Immutable tags:** Once pushed to origin, tags are permanent

## Tag Message Format

### RC Tag Message

```
MVP-4 Stabilization Release Candidate v4.1.2-rc.1

Stabilization focus:
- CI hardening and workflow reliability
- Test determinism improvements
- Docker build optimization
- TypeScript strict mode compliance

Commit: <SHA>
Date: <ISO-8601>
```

### GA Tag Message

```
MVP-4 Stabilization Release v4.1.2

This release includes critical stability improvements and CI hardening
work completed during the post-GA stabilization window.

Promoted from: v4.1.2-rc.N
Commit: <SHA>
Date: <ISO-8601>
```

## Rollback Procedure

If a tag must be removed (only in emergency, before production deployment):

```bash
# Delete local tag
git tag -d v4.1.2-rc.1

# Delete remote tag (DANGEROUS - requires team coordination)
git push origin :refs/tags/v4.1.2-rc.1

# Document in incident log why tag was removed
```

Note: This should only be used if tag was created in error (e.g., wrong commit, wrong version). Prefer creating a new RC instead.

## Tag Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ Development on main branch                              │
│ - CI hardening commits                                  │
│ - Test improvements                                     │
│ - Bug fixes                                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ RC Tag Created: v4.1.2-rc.1                             │
│ - Run prepare-stabilization-rc.sh                       │
│ - Generate release notes                                │
│ - Create evidence pack                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ RC Testing (24-48 hours)                                │
│ - Monitor CI for stability                              │
│ - Run verification commands                             │
│ - Gather evidence                                       │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ Issues Found │  │ All Gates Pass   │
│ Cut new RC   │  │ Promote to GA    │
│ -rc.2, -rc.3 │  │ Tag: v4.1.2      │
└──────────────┘  └──────────────────┘
```

## Evidence Requirements

Every tag must have corresponding evidence in `artifacts/release/<tag>/`:

- `release_notes.md` - Human-readable release notes
- `evidence.json` - Machine-readable verification proof
- `ci_status.json` - CI workflow status snapshot
- `commits.json` - Commits included in this release

See `MVP-4_STABILIZATION_EVIDENCE_PACK.md` for full schema.

## References

- Stabilization Plan: `docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md`
- Release Automation: `docs/releases/RELEASE_AUTOMATION.md`
- SemVer Spec: https://semver.org/
- Git Tagging: https://git-scm.com/book/en/v2/Git-Basics-Tagging
