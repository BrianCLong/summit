> **ARCHIVED: GA PROGRAM v1**
> This document is part of the GA Program v1 archive. It is read-only and no longer active.
> **Date:** 2026-01-25

# MVP-4 Stabilization RC → GA Promotion Guide

**Authority**: This document defines the canonical procedure for promoting MVP-4 stabilization release candidates to general availability.

**Version**: 1.0.0
**Last Updated**: 2026-01-07
**Owner**: Platform Engineering

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Promotion Workflow](#promotion-workflow)
4. [Local Verification](#local-verification)
5. [Automated Promotion Guard](#automated-promotion-guard)
6. [Manual Promotion Steps](#manual-promotion-steps)
7. [Post-Promotion](#post-promotion)
8. [Rollback Procedure](#rollback-procedure)
9. [Emergency Procedures](#emergency-procedures)

---

## Overview

### Purpose

This guide ensures safe, deterministic, and auditable promotion of stabilization release candidates to production-ready GA releases.

### Release Nomenclature

- **RC (Release Candidate)**: `v4.1.2-rc.1`, `v4.1.2-rc.2`, etc.
  - Built from `main` branch
  - Deployed to staging/preview environments
  - Stabilization period: 24-48 hours minimum

- **GA (General Availability)**: `v4.1.2`
  - Promoted from validated RC
  - Deployed to production
  - Fully supported and documented

### Promotion Contract

**A release candidate can be promoted to GA if and only if:**

1. All Required CI Checks are GREEN (see `docs/ci/REQUIRED_CHECKS.md`)
2. RC has been stable in staging for minimum 24 hours
3. No critical bugs reported during stabilization period
4. Promotion evidence bundle is generated and archived

---

## Prerequisites

### Required Tools

Install the following tools before proceeding:

```bash
# GitHub CLI (required for workflow verification)
brew install gh

# Verify installation
gh --version
gh auth status

# jq (required for JSON parsing in verification scripts)
brew install jq

# actionlint (required for workflow validation)
brew install actionlint
```

### Required Access

- **GitHub**: Write access to repository (for tagging)
- **CI**: Ability to view workflow runs
- **Deployment**: Access to production deployment pipelines (if applicable)

### Environment Setup

```bash
# Navigate to repository root
cd /path/to/summit

# Ensure you're on main branch
git checkout main
git pull origin main

# Ensure working tree is clean
git status
```

---

## Promotion Workflow

### High-Level Flow

```
[RC Created] → [CI Runs] → [24-48h Stabilization] → [Green Verification] → [Promotion] → [GA Released]
     ↓              ↓              ↓                      ↓                    ↓             ↓
  v4.1.2-rc.1   All checks   Monitor staging      Run promotion guard    Create GA tag   v4.1.2
                  run        No critical bugs     Verify all green       Push to remote  Deploy
```

### Decision Tree

```
Can I promote this RC?
├─ Are all required checks GREEN? ──────────────┐
│  ├─ Yes ─────────────────────────────────────┤
│  └─ No → BLOCKED (fix failures, re-tag RC)   │
│                                               │
├─ Has RC been stable for 24-48 hours? ────────┤
│  ├─ Yes ─────────────────────────────────────┤
│  └─ No → Wait or document exception          │
│                                               │
├─ Any critical bugs in staging? ──────────────┤
│  ├─ No ──────────────────────────────────────┤
│  └─ Yes → BLOCKED (fix bugs, create new RC)  │
│                                               │
└─ Promotion evidence bundle generated? ───────┤
   ├─ Yes ───────────────────────────────────► PROMOTE ✅
   └─ No → Run promotion guard workflow
```

---

## Local Verification

### Step 1: Verify RC is Green

Use the verification script to check if your RC commit has passed all required checks:

```bash
# Basic verification
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1

# Verify specific commit (if RC tag not yet created)
./scripts/release/verify-green-for-tag.sh \
  --tag v4.1.2-rc.1 \
  --commit a8b19638b58

# Verbose output (shows full workflow data)
./scripts/release/verify-green-for-tag.sh \
  --tag v4.1.2-rc.1 \
  --verbose
```

### Expected Output: GREEN

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                          PROMOTION GATE TRUTH TABLE                            ║
╠════════════════════════════════════════════════════════════════════════════════╣
║ Tag:    v4.1.2-rc.1
║ Commit: a8b1963 (a8b19638b58452371e7749f714e2b9bea9f482ad)
╚════════════════════════════════════════════════════════════════════════════════╝

WORKFLOW                            | CONCLUSION   | STATUS     | RUN URL
────────────────────────────────────────────────────────────────────────────────────
Release Readiness Gate              | ✅ SUCCESS   | completed  | https://...
Workflow Lint                       | ✅ SUCCESS   | completed  | https://...
GA Gate                             | ✅ SUCCESS   | completed  | https://...
Unit Tests & Coverage               | ✅ SUCCESS   | completed  | https://...
CI Core (Primary Gate)              | ✅ SUCCESS   | completed  | https://...

════════════════════════════════════════════════════════════════════════════════════

[SUCCESS] PROMOTION ALLOWED: All required checks passed ✅

  ✅ GREEN FOR PROMOTION
```

### What if NOT GREEN?

```
WORKFLOW                            | CONCLUSION   | STATUS     | RUN URL
────────────────────────────────────────────────────────────────────────────────────
Release Readiness Gate              | ✅ SUCCESS   | completed  | https://...
Workflow Lint                       | ✅ SUCCESS   | completed  | https://...
GA Gate                             | ❌ FAILURE   | completed  | https://...  ← FAILED
Unit Tests & Coverage               | ⏳ IN_PROGRESS | in_progress | https://... ← NOT DONE
CI Core (Primary Gate)              | ✅ SUCCESS   | completed  | https://...

[ERROR] PROMOTION BLOCKED: One or more required checks failed ❌

Blocking failures:
  • GA Gate: FAILURE
  • Unit Tests & Coverage: IN_PROGRESS (not completed)

Actions required:
  1. Review failed workflow runs above
  2. Fix any test/build/lint failures
  3. Ensure all workflows complete successfully
  4. Re-run this verification script

  ❌ BLOCKED - NOT SAFE FOR PROMOTION
```

**Resolution**:

1. Click the failed workflow URL
2. Review logs and fix the issue
3. Push fix to main (triggers new CI runs)
4. Create new RC: `v4.1.2-rc.2`
5. Re-verify the new RC

---

## Automated Promotion Guard

### Step 2: Run Promotion Guard Workflow

The Promotion Guard workflow automates verification and generates the promotion evidence bundle.

#### Via GitHub UI

1. Navigate to: **Actions** → **Release Promotion Guard**
2. Click **Run workflow**
3. Fill in inputs:
   - **version**: `4.1.2` (target GA version)
   - **rc_tag**: `v4.1.2-rc.1` (RC to promote)
   - **commit_sha**: (optional, auto-detected from tag)
   - **skip_verification**: `false` (DO NOT skip unless emergency)
4. Click **Run workflow**

#### Via GitHub CLI

```bash
# Standard promotion (recommended)
gh workflow run release-promote-guard.yml \
  -f version=4.1.2 \
  -f rc_tag=v4.1.2-rc.1

# With explicit commit SHA
gh workflow run release-promote-guard.yml \
  -f version=4.1.2 \
  -f rc_tag=v4.1.2-rc.1 \
  -f commit_sha=a8b19638b58452371e7749f714e2b9bea9f482ad

# Emergency bypass (DANGEROUS - requires incident documentation)
gh workflow run release-promote-guard.yml \
  -f version=4.1.2 \
  -f rc_tag=v4.1.2-rc.1 \
  -f skip_verification=true
```

### Step 3: Download Promotion Bundle

Once the workflow completes successfully:

1. Go to workflow run page
2. Scroll to **Artifacts** section
3. Download `promotion-bundle-4.1.2.zip`
4. Extract and review:

```bash
unzip promotion-bundle-4.1.2.zip -d promotion-bundle/
cd promotion-bundle/

# Review promotion evidence
cat promotion_evidence.json

# Review promotion checklist
cat PROMOTION_CHECKLIST.md

# Review summary
cat summary.md
```

---

## Manual Promotion Steps

### Step 4: Create GA Tag

After verifying green and downloading the promotion bundle:

```bash
# Set variables
RC_TAG="v4.1.2-rc.1"
GA_TAG="v4.1.2"
COMMIT_SHA=$(git rev-parse ${RC_TAG}^{commit})

# Create annotated GA tag
git tag -a "${GA_TAG}" "${COMMIT_SHA}" -m "MVP-4 Stabilization Release ${GA_TAG}

Promoted from: ${RC_TAG}
Commit: ${COMMIT_SHA}
Verified at: $(date -u +%Y-%m-%dT%H:%M:%SZ)

This release has passed all required gates:
- Release Readiness Gate
- Workflow Lint
- GA Gate
- Unit Tests & Coverage
- CI Core (Primary Gate)

Evidence: https://github.com/your-org/summit/actions/runs/XXXXXX

Release Notes: docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md
"

# Verify tag created
git tag -v "${GA_TAG}" 2>/dev/null || git show "${GA_TAG}"
```

### Step 5: Push GA Tag

```bash
# Push GA tag to remote
git push origin "${GA_TAG}"

# Verify tag is visible remotely
gh release list | grep "${GA_TAG}"
```

### Step 6: Monitor Release Workflows

```bash
# Watch workflows triggered by the GA tag
gh run watch

# Or list recent runs
gh run list --limit 10

# View specific workflow
gh run view <run-id>
```

---

## Post-Promotion

### Verify Release Artifacts

1. **GitHub Release Page**

   ```bash
   gh release view "${GA_TAG}"
   ```

2. **Docker Images** (if applicable)

   ```bash
   docker pull ghcr.io/your-org/summit:4.1.2
   docker pull ghcr.io/your-org/summit:latest
   ```

3. **Documentation**
   - Verify CHANGELOG.md updated
   - Verify release notes published
   - Verify API documentation updated

### Archive Promotion Evidence

```bash
# Create release artifacts directory
mkdir -p artifacts/release/${GA_TAG}

# Copy promotion evidence
cp promotion-bundle/promotion_evidence.json artifacts/release/${GA_TAG}/
cp promotion-bundle/PROMOTION_CHECKLIST.md artifacts/release/${GA_TAG}/
cp promotion-bundle/summary.md artifacts/release/${GA_TAG}/

# Commit to repository
git add artifacts/release/${GA_TAG}/
git commit -m "docs(release): archive promotion evidence for ${GA_TAG}"
git push origin main
```

### Announce Release

1. **Team Channels**
   - Post in `#releases` Slack channel
   - Include release notes link
   - Mention any breaking changes or migration steps

2. **Update CHANGELOG.md**

   ```bash
   # Add GA release entry
   vim CHANGELOG.md

   # Commit
   git add CHANGELOG.md
   git commit -m "docs(changelog): add ${GA_TAG} release notes"
   git push origin main
   ```

### Monitor Production

- Monitor error rates for 24-48 hours
- Check application metrics/dashboards
- Review user-reported issues
- Be prepared to rollback if critical issues detected

---

## Rollback Procedure

If critical issues are discovered after GA promotion:

### Immediate Mitigation

```bash
# Option 1: Delete GA tag (if not yet deployed to production)
git tag -d "${GA_TAG}"
git push origin :refs/tags/${GA_TAG}

# Option 2: Create hotfix tag pointing to previous stable release
PREVIOUS_TAG="v4.1.1"
git tag -a "v4.1.2-hotfix.1" "${PREVIOUS_TAG}" -m "Emergency rollback to ${PREVIOUS_TAG}"
git push origin "v4.1.2-hotfix.1"
```

### Full Rollback Steps

1. **Identify previous stable version**

   ```bash
   git tag --list 'v4.1.*' --sort=-v:refname
   ```

2. **Deploy previous version to production**

   ```bash
   # Follow deployment procedure for previous tag
   # E.g., v4.1.1
   ```

3. **Document incident**
   - Create post-mortem
   - Update release notes with rollback notice
   - Identify root cause

4. **Plan fix**
   - Create new RC with fix
   - Restart stabilization period
   - Re-verify and promote when ready

---

## Emergency Procedures

### Emergency Hotfix Promotion

**ONLY use in critical security incidents or production-down scenarios.**

1. **Document the incident**
   - Create incident ticket
   - Document why normal process is bypassed
   - Get approval from Platform Engineering lead

2. **Run Promotion Guard with bypass**

   ```bash
   gh workflow run release-promote-guard.yml \
     -f version=4.1.2 \
     -f rc_tag=v4.1.2-rc.1 \
     -f skip_verification=true
   ```

3. **Manual verification**
   - Run local smoke tests
   - Review critical functionality
   - Document manual verification steps

4. **Proceed with promotion**
   - Follow manual promotion steps
   - Deploy immediately
   - Monitor closely

5. **Post-incident**
   - Retroactively verify bypassed checks within 48 hours
   - Update incident post-mortem
   - Add to release notes as emergency hotfix

### Incident Communication

Template for emergency promotion announcement:

```
🚨 EMERGENCY RELEASE: v4.1.2

Reason: [Critical security patch / Production outage fix]
Impact: [Affected systems/users]
Verification: [Manual verification performed / Bypassed checks documented]
Incident: [Link to incident ticket]

Standard promotion verification was bypassed due to emergency conditions.
Post-incident verification in progress.

Deployed by: @username
Approved by: @platform-lead
Timestamp: 2026-01-07T20:00:00Z
```

---

## References

- **Required Checks**: `docs/ci/REQUIRED_CHECKS.md`
- **Tagging Guide**: `docs/releases/MVP-4_STABILIZATION_TAGGING.md`
- **Release Notes Template**: `docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md`
- **Evidence Pack Template**: `docs/releases/MVP-4_STABILIZATION_EVIDENCE_PACK.md`
- **GA Definition**: `docs/GA_DEFINITION.md`

---

## Appendix: Promotion Commands Cheatsheet

### Quick Commands Reference

```bash
# 1. Verify RC is green
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1

# 2. Run Promotion Guard
gh workflow run release-promote-guard.yml \
  -f version=4.1.2 \
  -f rc_tag=v4.1.2-rc.1

# 3. Download and review bundle
# (via GitHub UI: Actions → Workflow Run → Artifacts)

# 4. Create GA tag
git tag -a v4.1.2 $(git rev-parse v4.1.2-rc.1^{commit}) -m "..."

# 5. Push GA tag
git push origin v4.1.2

# 6. Monitor workflows
gh run watch

# 7. Verify release
gh release view v4.1.2

# 8. Archive evidence
cp promotion-bundle/* artifacts/release/v4.1.2/
git add artifacts/release/v4.1.2/
git commit -m "docs(release): archive promotion evidence for v4.1.2"
git push origin main
```

---

## Change History

| Version | Date       | Changes                           |
| ------- | ---------- | --------------------------------- |
| 1.0.0   | 2026-01-07 | Initial promotion guide for MVP-4 |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-07 (or before MVP-5 kickoff)
**Emergency Contact**: @platform-engineering-oncall
