# MVP-4 Stabilization RC to GA Promotion Plan

**Authority:** `docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md`
**Scope:** Promotion of stabilization RC to General Availability (GA)
**Version:** 1.0.0

## Purpose

This document defines the process, preconditions, and commands for promoting a stabilization Release Candidate (RC) to General Availability (GA).

## Preconditions for Promotion

Before promoting an RC to GA, ALL of the following conditions must be met:

### 1. Time-Based Stability Window

- **Minimum RC age:** 24 hours (48 hours recommended)
- **Reasoning:** Allows time for CI to run across multiple environments and for issues to surface
- **Verification:** Check tag creation date
  ```bash
  git show v4.1.2-rc.N --format="%ci" --no-patch
  ```

### 2. CI Green Across All Critical Workflows

All critical workflows must show `success` status:

```bash
# Check workflow status for the RC commit
gh run list --commit $(git rev-parse v4.1.2-rc.N) --limit 20

# Must be GREEN:
# - ci-core.yml
# - unit-test-coverage.yml
# - workflow-lint.yml
# - supply-chain-integrity.yml
# - ga-gate.yml
```

**Rejection criteria:**

- Any critical workflow shows `failure`
- Any required workflow shows `cancelled` or `skipped` (unless explicitly waived)

### 3. No P0 or P1 Issues Discovered

Review issue tracker and monitoring systems:

```bash
# Check GitHub issues created/updated since RC tag
gh issue list --label "P0,P1" --state open --json number,title,createdAt

# Check monitoring dashboards for anomalies
# - Error rates
# - Latency p95/p99
# - Resource utilization
```

**Rejection criteria:**

- Any open P0 issue
- More than 2 open P1 issues without mitigation plan

### 4. Security Scan Clean

Security scans must show no new critical or high vulnerabilities:

```bash
# Run security check
pnpm run security:check

# Generate SBOM and compare to baseline
pnpm run generate:sbom
# Review: artifacts/sbom.json

# Check for new CVEs
pnpm audit --audit-level=high
```

**Rejection criteria:**

- New critical vulnerabilities (CVSS >= 9.0)
- New high vulnerabilities (CVSS >= 7.0) without documented exception

### 5. Local Verification Passes

All verification commands must pass:

```bash
# Run full GA verification suite
pnpm ga:verify
# Must exit with code 0

# Run server CI tests
pnpm --filter intelgraph-server test:ci
# Must show 100% pass rate (excluding quarantined tests)

# Build Docker image
docker build -t intelgraph:4.1.2 .
# Must complete without errors
```

**Rejection criteria:**

- Any verification command exits with non-zero code
- Test failures (excluding documented quarantine)
- Build errors

### 6. Evidence Pack Complete

Verify that the evidence pack is fully populated:

```bash
# Check evidence pack
cat artifacts/release/v4.1.2-rc.N/evidence_pack.md

# Verify all placeholders are filled:
# - CI workflow status (not "PENDING_CI_RUN")
# - Local verification results (not "TO_BE_FILLED")
# - Security scan results (not "TO_BE_FILLED")
# - Performance benchmarks (not "TO_BE_FILLED")
```

**Rejection criteria:**

- Evidence pack has unfilled placeholders
- CI proof section is empty
- Verification results are missing

### 7. Stakeholder Approval

Required approvals:

- [ ] Engineering lead sign-off
- [ ] Security team review (if security changes)
- [ ] Product owner acknowledgment (if user-facing changes)

### 8. Rollback Plan Tested

Ensure rollback procedures are documented and tested:

- Previous stable version identified (v4.1.1)
- Rollback commands verified
- Data migration rollback tested (if applicable)

## Promotion Process

### Step 1: Final Pre-Flight Checks

```bash
# Navigate to repository root
cd /Users/brianlong/Developer/summit

# Ensure working tree is clean
git status
# Must show: "nothing to commit, working tree clean"

# Fetch latest tags
git fetch --tags

# Identify the RC to promote
RC_TAG="v4.1.2-rc.3"  # Replace with actual RC number
echo "Promoting: ${RC_TAG}"

# Verify RC tag exists
git tag -l "${RC_TAG}"

# Get RC commit SHA
RC_COMMIT=$(git rev-parse "${RC_TAG}")
echo "RC Commit: ${RC_COMMIT}"

# Checkout RC commit
git checkout "${RC_TAG}"
```

### Step 2: Run Final Verification

```bash
# Run full verification suite
pnpm ga:verify

# Expected output:
# ✓ typecheck passed
# ✓ lint passed
# ✓ build passed
# ✓ server unit tests passed
# ✓ smoke tests passed

# Capture exit code
if [ $? -ne 0 ]; then
    echo "ERROR: Verification failed. Do not promote."
    exit 1
fi
```

### Step 3: Create GA Tag

```bash
# Define GA version (remove -rc.N suffix)
GA_TAG="v4.1.2"
echo "Creating GA tag: ${GA_TAG}"

# Create annotated GA tag
git tag -a "${GA_TAG}" "${RC_TAG}" -m "MVP-4 Stabilization Release ${GA_TAG}

This release includes critical stability improvements and CI hardening
work completed during the post-GA stabilization window.

Promoted from: ${RC_TAG}
Commit: ${RC_COMMIT}
Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Verification:
- All CI workflows: GREEN
- Security scans: CLEAN
- Local verification: PASS
- RC stability period: 48 hours

See: docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md
"

# Verify tag was created
git tag -l "${GA_TAG}"
git show "${GA_TAG}" --no-patch
```

### Step 4: Update package.json (Optional)

If semantic-release is not handling version bumps:

```bash
# Update version in package.json
npm version "${GA_TAG#v}" --no-git-tag-version

# Commit version bump
git add package.json
git commit -m "chore(release): bump version to ${GA_TAG#v}"
```

**Note:** Skip this step if using semantic-release or if package.json updates are handled separately.

### Step 5: Push GA Tag

```bash
# Push GA tag to origin
git push origin "${GA_TAG}"

# Verify tag was pushed
gh release list | grep "${GA_TAG}"
```

### Step 6: Create GitHub Release

```bash
# Create GitHub release using prepared release notes
gh release create "${GA_TAG}" \
  --title "MVP-4 Stabilization Release ${GA_TAG}" \
  --notes-file "artifacts/release/${RC_TAG}/github_release.md" \
  --verify-tag

# Or manually create release in GitHub UI:
# https://github.com/YOUR_ORG/YOUR_REPO/releases/new
# - Select tag: v4.1.2
# - Title: MVP-4 Stabilization Release v4.1.2
# - Description: Copy from artifacts/release/v4.1.2-rc.N/github_release.md
```

### Step 7: Update Release Documentation

```bash
# Create GA-specific release notes
cp "docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md" \
   "docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES_${GA_TAG}.md"

# Update with GA-specific information
# - Replace all RC references with GA tag
# - Add actual promotion date
# - Add final CI status links
# - Add final metrics/benchmarks

# Commit documentation updates
git add docs/releases/
git commit -m "docs(release): finalize ${GA_TAG} release notes"
git push origin main
```

### Step 8: Post-Promotion Verification

```bash
# Wait for GitHub release to process
sleep 30

# Verify GitHub release exists
gh release view "${GA_TAG}"

# Test installation from release
# (Optional - depends on distribution method)
# npm install your-package@4.1.2
# docker pull your-registry/intelgraph:4.1.2
```

### Step 9: Announce Release

Communication channels:

- [ ] Internal Slack/Teams notification
- [ ] Update release status page
- [ ] Email to stakeholders (if critical)
- [ ] Update CHANGELOG.md (if not automated)

Template:

```
🎉 MVP-4 Stabilization Release v4.1.2 is now GA!

This release includes critical CI hardening and stability improvements.

📋 Release Notes: https://github.com/YOUR_ORG/YOUR_REPO/releases/tag/v4.1.2
🔍 Evidence Pack: artifacts/release/v4.1.2-rc.N/evidence_pack.md
📊 Metrics: [Link to monitoring dashboard]

Promoted from RC after 48 hours of stability testing.
All verification gates passed. No breaking changes.
```

### Step 10: Post-Promotion Monitoring

Monitor for the first 24-48 hours after GA:

```bash
# Monitor error rates
# (Use your monitoring tool - Grafana, Datadog, etc.)

# Check for new issues
gh issue list --label "bug" --state open --json number,title,createdAt

# Monitor CI on main branch
gh run list --branch main --limit 10
```

## Rollback Procedure

If critical issues are discovered post-promotion:

### Emergency Rollback (Within 24 Hours)

```bash
# Option 1: Revert to previous stable version
PREVIOUS_TAG="v4.1.1"

# Create hotfix branch
git checkout -b hotfix/rollback-${GA_TAG}

# Revert problematic changes
git revert ${RC_COMMIT}

# Tag hotfix
git tag -a v4.1.3 -m "Hotfix: Rollback ${GA_TAG} due to [ISSUE]"
git push origin v4.1.3
```

### Long-term Rollback (After 24 Hours)

If GA has been deployed to production:

```bash
# DO NOT delete GA tag once released
# Instead, create a new patch release

# Identify problematic commits
git log v4.1.1..v4.1.2 --oneline

# Create fix branch
git checkout -b fix/issue-description v4.1.1

# Cherry-pick safe commits or write new fix
git cherry-pick [SAFE_COMMITS]

# Create new RC
./scripts/release/prepare-stabilization-rc.sh --live --version 4.1.3-rc.1
```

**IMPORTANT:** Never delete or force-push over a GA tag that has been publicly released.

## Governance and Compliance

### Evidence Archive

After promotion, archive all evidence:

```bash
# Create evidence archive
tar -czf "artifacts/release/v4.1.2-ga-evidence.tar.gz" \
  "artifacts/release/v4.1.2-rc."*

# Store in long-term storage (e.g., S3, artifact repository)
# Retention: Minimum 1 year for compliance
```

### Audit Trail

Maintain audit trail in `docs/releases/RELEASE_HISTORY.md`:

```markdown
## v4.1.2 - 2026-01-09

- **Type:** Stabilization Release
- **Promoted from:** v4.1.2-rc.3
- **RC Created:** 2026-01-07
- **GA Promoted:** 2026-01-09
- **Approvers:** [Name], [Name]
- **CI Status:** All green
- **Issues:** 0 P0, 0 P1
- **Evidence:** artifacts/release/v4.1.2-ga-evidence.tar.gz
```

## Decision Log

Document promotion decision:

```markdown
## Promotion Decision: v4.1.2-rc.3 → v4.1.2 GA

**Date:** 2026-01-09
**Decision:** PROMOTE
**Rationale:**

- All CI workflows green for 48 hours
- Zero P0/P1 issues discovered during RC period
- Security scans clean (no new critical/high CVEs)
- All verification gates passed
- Performance metrics within acceptable ranges

**Risks Accepted:**

- [None / List any known issues with mitigation]

**Approvers:**

- Engineering Lead: [Name]
- Security Team: [Name]
- Product Owner: [Name]

**Next Steps:**

- Monitor for 48 hours post-GA
- Continue Week 2 stabilization work per plan
```

## References

- **Tagging Guide:** `docs/releases/MVP-4_STABILIZATION_TAGGING.md`
- **Release Notes:** `docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md`
- **Evidence Pack:** `docs/releases/MVP-4_STABILIZATION_EVIDENCE_PACK.md`
- **Stabilization Plan:** `docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md`
- **SemVer Spec:** https://semver.org/

## Change Log

| Version | Date       | Changes                        |
| ------- | ---------- | ------------------------------ |
| 1.0.0   | 2026-01-07 | Initial promotion plan created |

---

**Template Version:** 1.0.0
**Last Updated:** 2026-01-07
