> **ARCHIVED: GA PROGRAM v1**
> This document is part of the GA Program v1 archive. It is read-only and no longer active.
> **Date:** 2026-01-25

# Summit v5.0.0-GA Release Runbook

**Version:** v5.0.0-ga
**Runbook Version:** 1.0
**Date:** 2026-01-23
**Operator:** Release Captain / Authorized Releaser

---

## ⚠️ CRITICAL: Read Before Starting

1. **DO NOT** proceed unless ALL preconditions are met
2. **DO NOT** skip steps or execute out of order
3. **DO NOT** publish/push without explicit authorization
4. **STOP** if any step fails and consult rollback plan
5. **VERIFY** each step completion before proceeding

**Estimated Time:** 45-60 minutes (excluding CI wait times)

---

## Table of Contents

1. [Preconditions](#preconditions)
2. [Pre-Release Phase](#pre-release-phase)
3. [Release Execution](#release-execution)
4. [Post-Release Verification](#post-release-verification)
5. [GitHub Release Creation](#github-release-creation)
6. [Evidence Retention](#evidence-retention)
7. [Rollback Plan](#rollback-plan)
8. [Troubleshooting](#troubleshooting)

---

## Preconditions

### Required State
- [ ] On `main` branch at commit `a1f20771eeadcc55fef9f83727edeee0d2c2dbc2`
- [ ] Clean working tree (no uncommitted changes)
- [ ] All required CI checks passing on main
- [ ] No open `release-blocker` issues
- [ ] Required approvals obtained
- [ ] No deploy freeze in effect

### Required Tools
- [ ] `git` >= 2.30
- [ ] `gh` CLI (GitHub CLI) authenticated
- [ ] `node` >= 18.x
- [ ] `pnpm` >= 8.x
- [ ] `jq` for JSON processing

### Required Permissions
- [ ] Write access to `BrianCLong/summit`
- [ ] Ability to push tags
- [ ] Ability to create GitHub Releases
- [ ] Access to GITHUB_TOKEN (for release blocker checks)

### Verification Commands
```bash
# Verify branch and commit
git checkout main
git pull --ff-only
git rev-parse HEAD  # Should be: a1f20771eeadcc55fef9f83727edeee0d2c2dbc2

# Verify clean state
git status --porcelain  # Should be empty

# Verify tools
git --version
gh --version
node --version
pnpm --version
jq --version

# Verify authentication
gh auth status
```

---

## Pre-Release Phase

### Step 1: Sync and Verify Main

```bash
# Ensure on main branch
git checkout main

# Pull latest (fast-forward only)
git pull --ff-only origin main

# Verify we're at expected commit
CURRENT_SHA=$(git rev-parse HEAD)
EXPECTED_SHA="a1f20771eeadcc55fef9f83727edeee0d2c2dbc2"

if [ "$CURRENT_SHA" != "$EXPECTED_SHA" ]; then
  echo "ERROR: Not at expected SHA"
  echo "  Current: $CURRENT_SHA"
  echo "  Expected: $EXPECTED_SHA"
  exit 1
fi

echo "✓ On main at correct SHA"
```

**Expected Output:** Clean pull, SHA matches

**If this fails:** Check for drift, consult team before proceeding

---

### Step 2: Run GA Verification

```bash
# Run comprehensive verification
pnpm ga:verify

# Or directly:
./scripts/release/ga_verify.mjs --verbose
```

**Expected Output:** All checks PASS (green)

**Artifacts Generated:**
- `artifacts/ga-verify/a1f20771e.../ga_verify_report.md`
- `artifacts/evidence/evidence-summary-*.md`

**If this fails:**
- Review report: `cat artifacts/ga-verify/*/ga_verify_report.md`
- Fix failing checks
- Re-run verification
- **DO NOT** proceed until all pass

---

### Step 3: Generate Evidence Bundle

```bash
# Generate comprehensive evidence
./scripts/release/generate_evidence_bundle.sh \
  --category all \
  --update-index \
  --output artifacts/evidence/ga-release-v5.0.0
```

**Expected Output:**
```
Evidence Collection Complete
  Run ID:    20260123-HHMMSS
  Output:    artifacts/evidence/ga-release-v5.0.0
  Summary:   artifacts/evidence/ga-release-v5.0.0/evidence-summary-*.md
```

**Verification:**
```bash
# Check evidence artifacts
ls -lh artifacts/evidence/ga-release-v5.0.0/

# Review summary
cat artifacts/evidence/ga-release-v5.0.0/evidence-summary-*.md
```

---

### Step 4: Build Release Artifacts

```bash
# Clean build
pnpm clean || true
rm -rf dist build .next || true

# Install dependencies (frozen lockfile)
pnpm install --frozen-lockfile

# Run production build
pnpm build

# Verify build outputs
ls -lh dist/
ls -lh server/dist/
ls -lh client/dist/
```

**Expected Output:** Successful builds with no errors

**If this fails:**
- Review build errors
- Ensure dependencies are installed
- Check for TypeScript errors
- **DO NOT** proceed with broken build

---

## Release Execution

### Step 5: Version Bump (COMMIT POINT 1)

**⚠️ WARNING:** This step creates a commit. Verify before proceeding.

```bash
# Checkout GA release branch
git checkout -b claude/ga-release-package-v5.0.0

# Update package.json version
npm version 5.0.0 --no-git-tag-version

# Verify version updated
jq -r '.version' package.json  # Should show: 5.0.0

# Update CHANGELOG.md (manual step - use editor)
# Add v5.0.0 entry at top referencing GA_RELEASE_NOTES.md

# Review changes
git diff

# Stage version bump
git add package.json CHANGELOG.md

# Commit version bump
git commit -m "chore(release): bump version to 5.0.0 for GA release

Prepare for General Availability (GA) release v5.0.0.

- Update package.json to 5.0.0
- Update CHANGELOG.md with GA release entry
- Reference: docs/releases/ga/GA_RELEASE_NOTES.md

Previous version: 4.1.4
Anchor SHA: a1f20771eeadcc55fef9f83727edeee0d2c2dbc2

https://claude.ai/code/session_01B7URNgsB5Fj8X9B1WqiPgY"

# Verify commit
git log -1 --oneline
git show HEAD
```

**Expected Output:** Clean commit with version bump

**Verification Checklist:**
- [ ] package.json shows "version": "5.0.0"
- [ ] CHANGELOG.md has v5.0.0 entry
- [ ] Commit message is clear and references session
- [ ] Only package.json and CHANGELOG.md changed

---

### Step 6: Push Branch and Create PR

```bash
# Push branch to remote
git push -u origin claude/ga-release-package-v5.0.0

# Create PR with gh CLI
gh pr create \
  --title "release(ga): v5.0.0 General Availability Release Package" \
  --body "$(cat <<'EOF'
## GA Release Package v5.0.0

This PR adds the complete General Availability (GA) release package for Summit v5.0.0.

### What's Included

- **Version Bump**: package.json 4.1.4 → 5.0.0
- **Release Notes**: Complete GA release notes with all 71 commits
- **Evidence Manifest**: Deterministic evidence collection specification
- **Verification Script**: ga_verify.mjs for release validation
- **Versioning Plan**: SemVer strategy and tag format
- **Release Runbook**: Step-by-step operator guide

### Files Added/Changed

- `package.json` (version bump)
- `CHANGELOG.md` (v5.0.0 entry)
- `docs/releases/ga/GA_RELEASE_NOTES.md`
- `docs/releases/ga/GA_EVIDENCE_MANIFEST.yml`
- `docs/releases/ga/GA_VERSIONING_PLAN.md`
- `docs/releases/ga/GA_RELEASE_RUNBOOK.md`
- `scripts/release/ga_verify.mjs`

### Verification Evidence

- ✓ All CI checks passing
- ✓ GA verification PASS
- ✓ Evidence bundle generated
- ✓ No open release blockers

### What This PR Does NOT Do

- Does NOT create git tag
- Does NOT publish GitHub Release
- Does NOT deploy or publish artifacts
- Does NOT modify CI/CD workflows

### Next Steps (After Merge)

1. Wait for PR approval
2. Merge to main
3. Follow runbook to create tag: `v5.0.0-ga`
4. Create GitHub Release
5. Publish release notes

### Anchor Commit

Previous: v1.7.0-complete
Anchor SHA: a1f20771eeadcc55fef9f83727edeee0d2c2dbc2
New Version: v5.0.0-ga

---

**Session:** https://claude.ai/code/session_01B7URNgsB5Fj8X9B1WqiPgY
**Runbook:** docs/releases/ga/GA_RELEASE_RUNBOOK.md
EOF
)"

# Get PR URL
gh pr view --web
```

**Expected Output:** PR created successfully, URL displayed

**PR Checklist:**
- [ ] PR title is clear
- [ ] PR body explains what's included
- [ ] PR emphasizes NO publishing actions
- [ ] Required reviewers added (if applicable)
- [ ] CI checks are running

---

### Step 7: Wait for PR Approval and Merge

**⏸ PAUSE POINT:** Wait for PR approval

**Required Approvals:**
- [ ] Technical review (code changes)
- [ ] Release manager approval
- [ ] Any required org approvals

**Once Approved:**
```bash
# Merge PR (use GitHub UI or CLI)
gh pr merge --squash --delete-branch

# Or if you prefer merge commit:
gh pr merge --merge --delete-branch
```

**After Merge:**
```bash
# Switch back to main
git checkout main

# Pull merged changes
git pull --ff-only origin main

# Verify version in package.json
jq -r '.version' package.json  # Should show: 5.0.0
```

---

### Step 8: Create Git Tag (AUTHORIZATION REQUIRED)

**⚠️ CRITICAL:** Only proceed with explicit authorization

```bash
# Ensure on main with merged version bump
git checkout main
git pull --ff-only origin main

# Verify we have version 5.0.0
jq -r '.version' package.json  # Must be: 5.0.0

# Create annotated tag
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

# Verify tag locally
git tag -l v5.0.0-ga
git show v5.0.0-ga

# Verify tag points to correct commit
git rev-list -n 1 v5.0.0-ga
```

**Expected Output:**
- Tag created at commit with version 5.0.0 in package.json
- Tag message is complete and correct

**DO NOT push tag yet - proceed to next step**

---

### Step 9: Push Tag (AUTHORIZATION REQUIRED)

**⚠️ FINAL CHECKPOINT:** Confirm before pushing

**Pre-Push Checklist:**
- [ ] Tag v5.0.0-ga created locally
- [ ] Tag points to correct commit (with version 5.0.0)
- [ ] Tag message is correct
- [ ] No other uncommitted changes
- [ ] Explicit authorization received

```bash
# Push tag to origin
git push origin v5.0.0-ga

# Verify tag on remote
gh release list  # Should NOT see v5.0.0-ga yet (we haven't created release)
git ls-remote --tags origin | grep v5.0.0-ga
```

**Expected Output:**
```
To github.com:BrianCLong/summit.git
 * [new tag]         v5.0.0-ga -> v5.0.0-ga
```

**If push fails:**
- Check network connectivity
- Verify push permissions
- Check for tag conflicts
- See troubleshooting section

---

## Post-Release Verification

### Step 10: Verify Tag on Remote

```bash
# Fetch all tags
git fetch --tags

# Verify tag exists remotely
git ls-remote --tags origin | grep v5.0.0-ga

# Check tag details
git show v5.0.0-ga --quiet

# Verify package.json at tag
git show v5.0.0-ga:package.json | jq -r '.version'  # Should be: 5.0.0
```

**Expected Output:** Tag exists on remote, points to correct commit

---

## GitHub Release Creation

### Step 11: Create GitHub Release (AUTHORIZATION REQUIRED)

**⚠️ WARNING:** This publishes the release publicly

```bash
# Create GitHub Release from tag
gh release create v5.0.0-ga \
  --title "Summit v5.0.0 - General Availability" \
  --notes-file docs/releases/ga/GA_RELEASE_NOTES.md \
  --verify-tag

# Or with attached artifacts:
gh release create v5.0.0-ga \
  --title "Summit v5.0.0 - General Availability" \
  --notes-file docs/releases/ga/GA_RELEASE_NOTES.md \
  --verify-tag \
  artifacts/evidence/ga-release-v5.0.0/evidence-summary-*.md

# Verify release
gh release view v5.0.0-ga
gh release view v5.0.0-ga --web
```

**Expected Output:** GitHub Release created successfully

**Release Checklist:**
- [ ] Release title is "Summit v5.0.0 - General Availability"
- [ ] Release notes render correctly
- [ ] Tag v5.0.0-ga is associated
- [ ] Artifacts attached (if applicable)
- [ ] Release is marked as "Latest"

---

### Step 12: Post-Release Smoke Test

```bash
# Verify release is accessible
gh release view v5.0.0-ga --json tagName,name,publishedAt

# Check release URL
echo "Release URL: https://github.com/BrianCLong/summit/releases/tag/v5.0.0-ga"

# Verify assets (if any)
gh release view v5.0.0-ga --json assets
```

**Manual Verification:**
- [ ] Visit release page in browser
- [ ] Verify release notes display correctly
- [ ] Verify tag link works
- [ ] Check that it's marked as "Latest release"

---

## Evidence Retention

### Step 13: Archive Evidence

```bash
# Create permanent evidence archive
EVIDENCE_ARCHIVE="docs/releases/ga/evidence-archive-v5.0.0"
mkdir -p "$EVIDENCE_ARCHIVE"

# Copy evidence bundle
cp -r artifacts/evidence/ga-release-v5.0.0/* "$EVIDENCE_ARCHIVE/"

# Copy verification report
cp artifacts/ga-verify/a1f20771e*/ga_verify_report.md "$EVIDENCE_ARCHIVE/"

# Create archive manifest
cat > "$EVIDENCE_ARCHIVE/MANIFEST.md" <<EOF
# Evidence Archive for v5.0.0-ga

**Release:** v5.0.0-ga
**Tag SHA:** $(git rev-list -n 1 v5.0.0-ga)
**Archived:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Contents

- evidence-summary-*.md: Evidence collection summary
- ga_verify_report.md: Pre-release verification report
- ci/: CI evidence artifacts
- security/: Security scan results
- governance/: Governance state snapshots
- audits/: Audit reports

## Verification

All evidence was generated from commit: a1f20771eeadcc55fef9f83727edeee0d2c2dbc2

## Retention

Retain for: 7 years (compliance requirement)
EOF

# Commit evidence archive
git add "$EVIDENCE_ARCHIVE"
git commit -m "docs(release): archive evidence for v5.0.0-ga release

Preserve release evidence for compliance and audit.

https://claude.ai/code/session_01B7URNgsB5Fj8X9B1WqiPgY"

git push origin main
```

**Evidence Retention Policy:**
- **Minimum:** 7 years (SOC 2 compliance)
- **Location:** `docs/releases/ga/evidence-archive-v5.0.0/`
- **Format:** Markdown + JSON artifacts
- **Access:** Committed to main branch (permanent Git history)

---

## Rollback Plan

### When to Rollback

Trigger rollback if:
- Critical security vulnerability discovered in release
- Showstopper bug reported
- Evidence tampering detected
- Compliance violation identified

### Rollback Procedure

#### Option 1: Delete GitHub Release (Pre-Deployment)

```bash
# Delete GitHub Release (does NOT delete tag)
gh release delete v5.0.0-ga --yes

# Verify deletion
gh release list  # Should NOT show v5.0.0-ga
```

**Note:** Tag remains on repository. Users can still checkout tag.

#### Option 2: Delete Tag (Extreme Measure)

**⚠️ DANGEROUS:** Only if tag must be removed entirely

```bash
# Delete remote tag
git push origin :refs/tags/v5.0.0-ga

# Delete local tag
git tag -d v5.0.0-ga

# Verify deletion
git ls-remote --tags origin | grep v5.0.0-ga  # Should be empty
```

**Consequences:**
- Users who already pulled tag will keep it
- Cannot re-use tag name (bad practice)
- Creates confusion in Git history

#### Option 3: Hotfix Release (Preferred)

Instead of rollback, publish hotfix:

```bash
# Create hotfix branch
git checkout -b hotfix/v5.0.1 v5.0.0-ga

# Apply fixes
# ... make changes ...

# Commit and tag
git commit -m "fix: critical hotfix for v5.0.0"
git tag -a v5.0.1 -m "Hotfix for v5.0.0"
git push origin v5.0.1

# Create release
gh release create v5.0.1 \
  --title "Summit v5.0.1 - Hotfix" \
  --notes "Hotfix for v5.0.0. See CHANGELOG.md"
```

---

## Troubleshooting

### Issue: Git push fails with 403

**Cause:** Insufficient permissions or branch protection

**Solution:**
```bash
# Verify authentication
gh auth status

# Re-authenticate if needed
gh auth login

# Check remote URL
git remote -v

# Ensure using correct remote
git push origin v5.0.0-ga
```

### Issue: Tag already exists

**Cause:** Tag name conflict

**Solution:**
```bash
# Check existing tags
git tag -l v5.0.0*

# If accidental, delete and retry
git tag -d v5.0.0-ga
git push origin :refs/tags/v5.0.0-ga  # Delete remote

# Or use different tag (e.g., v5.0.0-ga.1)
```

### Issue: ga_verify fails

**Cause:** Pre-release checks not passing

**Solution:**
```bash
# Review detailed report
cat artifacts/ga-verify/*/ga_verify_report.md

# Address specific failures:
# - Lint: pnpm lint --fix
# - Tests: Fix failing tests
# - TypeCheck: Fix TS errors

# Re-run verification
pnpm ga:verify
```

### Issue: Evidence bundle generation fails

**Cause:** Missing scripts or dependencies

**Solution:**
```bash
# Check script exists
ls -l scripts/release/generate_evidence_bundle.sh

# Make executable
chmod +x scripts/release/generate_evidence_bundle.sh

# Run manually
./scripts/release/generate_evidence_bundle.sh --category ci --dry-run

# Check for missing tools
which gitleaks jq pnpm
```

### Issue: GitHub Release creation fails

**Cause:** Tag doesn't exist or notes file missing

**Solution:**
```bash
# Verify tag exists
git tag -l v5.0.0-ga
git ls-remote --tags origin | grep v5.0.0-ga

# Verify notes file exists
cat docs/releases/ga/GA_RELEASE_NOTES.md

# Try creating release manually via web UI
# https://github.com/BrianCLong/summit/releases/new
```

---

## Completion Checklist

### Release Complete When:

- [ ] Version bumped to 5.0.0 in package.json (committed to main)
- [ ] CHANGELOG.md updated with v5.0.0 entry
- [ ] Tag v5.0.0-ga created and pushed to origin
- [ ] GitHub Release created for v5.0.0-ga
- [ ] Release notes published and accessible
- [ ] Evidence bundle archived in Git
- [ ] Smoke tests pass
- [ ] Team notified of release

### Post-Release Actions:

1. **Notify Stakeholders**
   - Post in team Slack/communication channel
   - Email release announcement
   - Update project status boards

2. **Monitor for Issues**
   - Watch GitHub issues for bug reports
   - Monitor CI/CD for main branch
   - Track any hotfix requests

3. **Update Documentation**
   - Update README if version-specific instructions
   - Update deployment guides
   - Archive release runbook execution notes

4. **Celebrate** 🎉
   - First GA release achieved
   - 71 commits of hardening completed
   - Enterprise-ready platform delivered

---

## Quick Reference Commands

```bash
# Pre-flight
git checkout main && git pull --ff-only
pnpm ga:verify

# Version bump
npm version 5.0.0 --no-git-tag-version
git commit -m "chore(release): bump version to 5.0.0"
git push origin claude/ga-release-package-v5.0.0

# Tag and release
git tag -a v5.0.0-ga -m "Summit v5.0.0 - General Availability Release"
git push origin v5.0.0-ga
gh release create v5.0.0-ga --title "Summit v5.0.0 - General Availability" --notes-file docs/releases/ga/GA_RELEASE_NOTES.md

# Verify
gh release view v5.0.0-ga
```

---

**Runbook Version:** 1.0
**Last Updated:** 2026-01-23
**Owner:** Release Captain
**Session:** https://claude.ai/code/session_01B7URNgsB5Fj8X9B1WqiPgY
