# GA Release Versioning Plan

**Prepared for:** Summit GA Release
**Date:** 2026-01-23
**Current Version:** 4.1.4
**Previous Tag:** v1.7.0-complete

---

## Current State

### Version Sources
- **package.json**: `4.1.4`
- **Last Git Tag**: `v1.7.0-complete`
- **Main SHA**: `a1f20771eeadcc55fef9f83727edeee0d2c2dbc2`

### Existing Tags (Last 20)
```
v2025.12.08.1709
v2025.12.08.2127
v2026.01.07.1518
v24.0.0
v24.0.0-rc1
v4.0.0-OMEGA-PUBLICATION
v4.0.0-beta.1
v4.0.0-ga
v4.0.0-rc1
v4.0.0-rc2
v4.0.0-summit-ga-complete
v4.0.1
v4.0.1-ga
v4.0.2
v4.0.3
v4.0.4
v4.1.0
v4.1.1
v4.1.4
v4.1.4-governance.1
```

---

## Versioning Strategy

### Semantic Versioning (SemVer)
This repository follows **Semantic Versioning 2.0.0** (semver.org):
- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

### Proposed Version: v5.0.0-ga

#### Rationale for MAJOR version bump (4.x → 5.x):

1. **Significant Infrastructure Changes**
   - Enterprise multi-tenancy architecture (#16591)
   - Comprehensive CI/CD pipeline overhaul (#16619)
   - GA-grade governance and compliance framework (#16635)
   - Redis cluster + event store partitioning (#16617)

2. **Security Hardening**
   - Critical security patches (RCE vulnerabilities, export manifest signing)
   - New security trust separation architecture
   - Supply chain security improvements

3. **Testing & Quality Gates**
   - New deterministic typecheck gates (client + server)
   - Evidence bundle generation requirements
   - Governance lockfile signing

4. **Operational Maturity**
   - This is the **General Availability (GA)** release
   - Represents production-ready, enterprise-grade stability
   - 71 commits of consolidation and hardening since v1.7.0-complete

#### Why NOT 4.2.0?
- While technically backward-compatible, the scope of changes (71 commits)
- GA designation represents a major milestone
- Infrastructure changes (Redis cluster, multi-tenancy) are foundational
- Governance requirements are new mandatory gates

#### Why NOT 24.x.x or date-based?
- Repository has mixed versioning history (v4.x, v24.x, date-based)
- SemVer (4.x → 5.x) provides clearer upgrade path
- Maintains compatibility with existing package.json version (4.1.4 → 5.0.0)

---

## Tag Name Format

### Recommended: `v5.0.0-ga`

Format: `v<MAJOR>.<MINOR>.<PATCH>-<PRERELEASE>`

- **Prefix**: `v` (matches repository convention)
- **Version**: `5.0.0` (major bump)
- **Prerelease**: `ga` (general availability designation)

### Alternative Tags (if needed):
- `v5.0.0` (clean version, no prerelease)
- `v5.0.0-ga.1` (if iteration needed)

---

## Version Bump Implementation

### Option 1: Manual Version Bump (Recommended for GA)

**package.json** root:
```json
{
  "version": "5.0.0"
}
```

**Affected Files:**
1. `package.json` (root)
2. `packages/*/package.json` (if monorepo, update workspace versions)
3. `CHANGELOG.md` (add v5.0.0 entry)

**Commands:**
```bash
# Update root package.json
npm version 5.0.0 --no-git-tag-version

# If monorepo with workspace versioning:
pnpm -r exec npm version 5.0.0 --no-git-tag-version

# Or manually edit package.json files
```

### Option 2: Using Existing Release Script

The repository has `scripts/release/release.mjs` which supports:
```bash
pnpm release:cut --version 5.0.0 --skip-tag --skip-gh-release --dry-run
```

This will:
- Update package.json versions
- Generate release notes
- Prepare artifacts
- **Skip** tag creation (we'll do manually)
- **Skip** GitHub release (we'll do manually)

---

## Tag Creation (DO NOT EXECUTE YET)

### Command (for runbook reference):
```bash
# After version bump commit is on main
git tag -a v5.0.0-ga -m "Summit v5.0.0 - General Availability Release

This GA release represents enterprise-grade stability with:
- 71 commits of security, CI/CD, and governance improvements
- Enterprise multi-tenancy support
- Comprehensive compliance and evidence framework
- Critical security patches and supply chain hardening

Anchor SHA: a1f20771eeadcc55fef9f83727edeee0d2c2dbc2
Previous: v1.7.0-complete

Release Notes: docs/releases/ga/GA_RELEASE_NOTES.md
Evidence: docs/releases/ga/GA_EVIDENCE_MANIFEST.yml

Session: https://claude.ai/code/session_01B7URNgsB5Fj8X9B1WqiPgY"

# Verify tag
git tag -v v5.0.0-ga

# Push tag (ONLY when authorized)
git push origin v5.0.0-ga
```

---

## Changelog Update

**CHANGELOG.md** should be updated with:

```markdown
## [5.0.0-ga] - 2026-01-23

### General Availability Release

This release represents the first production-ready General Availability (GA) version
of Summit, consolidating 71 commits of enterprise hardening, security improvements,
and compliance infrastructure.

For complete release notes, see: docs/releases/ga/GA_RELEASE_NOTES.md

### Highlights

- Enterprise multi-tenancy and access control
- Comprehensive CI/CD testing suite
- Security hardening (RCE patches, supply chain audit)
- GA governance and compliance framework
- Redis cluster and event store partitioning

### Breaking Changes

None. Backward compatible with v4.x versions.

### Upgrade Path

From v4.x:
- Standard update process
- No migration required
- New governance gates will apply to future PRs
```

---

## Version Consistency Check

Before tagging, verify:

1. **package.json version matches tag**
   ```bash
   jq -r '.version' package.json  # Should output: 5.0.0
   ```

2. **Workspace packages aligned** (if monorepo)
   ```bash
   find packages -name package.json -exec jq -r '.version' {} \;
   ```

3. **CHANGELOG.md includes v5.0.0**
   ```bash
   grep "## \[5.0.0" CHANGELOG.md
   ```

4. **No uncommitted changes**
   ```bash
   git status --porcelain  # Should be empty
   ```

---

## Risk Assessment

### Low Risk
- ✓ Backward compatible (no breaking API changes)
- ✓ Extensive CI testing infrastructure in place
- ✓ Evidence bundle validation

### Medium Risk
- ⚠ Large number of commits (71) since last tag
- ⚠ New governance gates may require adjustment period
- ⚠ Infrastructure changes (Redis cluster) need operational validation

### Mitigation
- Comprehensive GA verification script (`ga_verify.mjs`)
- Evidence bundle generation
- Gradual rollout recommended
- Hotfix process documented in runbook

---

## Decision Record

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Version** | 5.0.0 | Major bump for GA + significant infrastructure changes |
| **Tag Format** | v5.0.0-ga | SemVer with GA prerelease identifier |
| **Versioning Scheme** | SemVer | Clearer than date-based for users |
| **Bump Type** | Manual | Operator control for GA milestone |
| **package.json** | 5.0.0 | Aligned with tag version |

---

## Approval Checklist

Before proceeding with version bump and tag:

- [ ] All required checks pass on main (`a1f20771e`)
- [ ] GA verification report shows PASS (`pnpm ga:verify`)
- [ ] No open release-blocker issues
- [ ] Evidence bundle generated successfully
- [ ] Governance lockfile verified
- [ ] Release notes reviewed and approved
- [ ] Changelog updated
- [ ] Version bump commit ready
- [ ] Tag message prepared
- [ ] Rollback plan understood

---

**Prepared By:** Release Captain
**Session:** https://claude.ai/code/session_01B7URNgsB5Fj8X9B1WqiPgY
**Status:** PENDING APPROVAL - Do not execute version bump or tagging yet
