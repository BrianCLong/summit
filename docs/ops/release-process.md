# Release Process

> **Last Updated**: 2025-12-06
> **Status**: Automated via semantic-release

This document describes the release process for the Summit/IntelGraph platform. Releases are automated using [semantic-release](https://semantic-release.gitbook.io/), triggered by conventional commits merged to the `main` branch.

---

## Table of Contents

1. [Versioning Scheme](#versioning-scheme)
2. [Tag Naming Convention](#tag-naming-convention)
3. [Release Triggers](#release-triggers)
4. [How Releases Work](#how-releases-work)
5. [Cutting a Release](#cutting-a-release)
6. [Hotfix Process](#hotfix-process)
7. [Pre-release Channels](#pre-release-channels)
8. [Release Artifacts](#release-artifacts)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Versioning Scheme

We follow [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH[-PRERELEASE]

Examples:
  1.0.0      - Initial stable release
  1.1.0      - Minor feature release
  1.1.1      - Patch/bugfix release
  2.0.0      - Major release with breaking changes
  1.2.0-beta.1  - Beta pre-release
  1.2.0-alpha.1 - Alpha pre-release
```

### Version Increment Rules

| Commit Type | Example | Version Bump |
|-------------|---------|--------------|
| `feat:` | `feat(api): add new search endpoint` | **MINOR** |
| `fix:` | `fix(web): resolve login timeout` | **PATCH** |
| `perf:` | `perf(db): optimize query cache` | **PATCH** |
| `refactor:` | `refactor(core): simplify auth flow` | **PATCH** |
| `revert:` | `revert: undo feature X` | **PATCH** |
| `docs:` (README only) | `docs(README): update install steps` | **PATCH** |
| `BREAKING CHANGE:` | Footer or `!` suffix | **MAJOR** |
| `chore:`, `test:`, `style:`, `ci:` | Maintenance commits | **No release** |

### Breaking Changes

Breaking changes trigger a **MAJOR** version bump. Mark them with:

```bash
# Option 1: Footer in commit body
git commit -m "feat(api): redesign auth flow

BREAKING CHANGE: The /auth/login endpoint now requires OAuth2 tokens instead of API keys."

# Option 2: Exclamation mark suffix
git commit -m "feat(api)!: redesign auth flow"
```

---

## Tag Naming Convention

Tags follow the pattern: `vMAJOR.MINOR.PATCH[-PRERELEASE]`

| Channel | Tag Format | Example |
|---------|-----------|---------|
| Production | `vX.Y.Z` | `v1.2.3` |
| Beta | `vX.Y.Z-beta.N` | `v1.3.0-beta.1` |
| Alpha | `vX.Y.Z-alpha.N` | `v2.0.0-alpha.5` |

---

## Release Triggers

Releases are triggered automatically when:

1. **Commits merge to `main`** - Creates a production release (if commit types warrant)
2. **Commits merge to `beta`** - Creates a beta pre-release
3. **Commits merge to `alpha`** - Creates an alpha pre-release
4. **Manual trigger** - Via GitHub Actions workflow_dispatch

### Manual Trigger

```bash
# Via GitHub CLI
gh workflow run semantic-release.yml --ref main

# Via GitHub UI
# Navigate to: Actions → Semantic Release → Run workflow
```

---

## How Releases Work

The release pipeline is fully automated:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Developer merges PR to main                                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  semantic-release.yml workflow triggered                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Checkout code with full history                               │  │
│  │ 2. Install dependencies (pnpm)                                   │  │
│  │ 3. Run build                                                     │  │
│  │ 4. Run tests + linting                                           │  │
│  │ 5. Analyze commits since last tag                                │  │
│  │ 6. Determine next version                                        │  │
│  │ 7. Generate release notes                                        │  │
│  │ 8. Update CHANGELOG.md                                           │  │
│  │ 9. Create git tag (vX.Y.Z)                                       │  │
│  │ 10. Create GitHub Release with notes                             │  │
│  │ 11. Execute prepare-release.sh                                   │  │
│  │ 12. Execute publish-release.sh                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Post-release actions                                                   │
│  - Staging deployment triggered automatically                           │
│  - PRs/issues get "released" label and success comment                  │
│  - Slack notification (if configured)                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cutting a Release

### Standard Release (Recommended)

Simply merge a PR to `main` with conventional commits. The release will be automatic.

```bash
# Example workflow
git checkout -b feat/add-entity-export
# ... make changes ...
git add .
git commit -m "feat(api): add entity export endpoint

Adds POST /api/entities/export for CSV/JSON export.
Closes #123"

git push -u origin feat/add-entity-export
# Create PR via GitHub UI or CLI
gh pr create --fill
```

### Verify Before Merge

Before merging, ensure:

1. **CI passes** - All checks must be green
2. **Commit messages follow convention** - Use `feat:`, `fix:`, etc.
3. **No `[skip ci]`** in commits (blocks release)

### After Merge

1. **Monitor release workflow**: [Actions → Semantic Release](https://github.com/BrianCLong/summit/actions/workflows/semantic-release.yml)
2. **Verify tag created**: `git fetch --tags && git tag -l`
3. **Check GitHub Release**: [Releases page](https://github.com/BrianCLong/summit/releases)
4. **Verify CHANGELOG.md updated**: Review the automated changelog entry

---

## Hotfix Process

For urgent production fixes that need immediate deployment:

### 1. Create Hotfix Branch

```bash
# Start from the latest production tag
git fetch --tags
LATEST_TAG=$(git describe --tags --abbrev=0 origin/main)
git checkout -b hotfix/critical-fix $LATEST_TAG
```

### 2. Apply Fix

```bash
# Make minimal changes to fix the issue
git add .
git commit -m "fix(critical): resolve authentication bypass

Fixes CVE-2025-XXXX security vulnerability.
Closes #456"
```

### 3. Fast-Track to Main

```bash
# Push and create PR
git push -u origin hotfix/critical-fix

# Create PR targeting main with "hotfix" label
gh pr create --base main --title "fix(critical): resolve authentication bypass" --label hotfix

# After approval, merge immediately
gh pr merge --squash
```

### 4. Verify Hotfix Release

The merge will trigger an immediate patch release:
- Monitor: [Actions → Semantic Release](https://github.com/BrianCLong/summit/actions)
- Expected: `vX.Y.Z+1` (patch increment)

### 5. Deploy Hotfix

```bash
# Staging deploys automatically
# For production, trigger manual deployment:
gh workflow run deploy-production.yml -f version=X.Y.Z+1
```

---

## Pre-release Channels

### Beta Releases

For feature validation before production:

```bash
# Create/update beta branch
git checkout main
git pull
git checkout -b beta
git push -u origin beta

# Merge features to beta for testing
git merge feature/new-dashboard
git push
```

Commits to `beta` create releases like `v1.3.0-beta.1`, `v1.3.0-beta.2`, etc.

### Alpha Releases

For early development builds:

```bash
# Same process as beta, but use alpha branch
git checkout -b alpha
git push -u origin alpha
```

### Promoting Pre-releases

When beta is stable, merge to main:

```bash
git checkout main
git merge beta
git push
```

This creates a production release with the same features.

---

## Release Artifacts

Each release produces:

| Artifact | Location | Description |
|----------|----------|-------------|
| Git Tag | `vX.Y.Z` | Immutable version marker |
| GitHub Release | Releases page | Notes, changelog, assets |
| CHANGELOG.md | Repository root | Cumulative changelog |
| Release Notes | `RELEASE_NOTES.md` | Current release summary |
| Release Manifest | `releases/X.Y.Z.json` | Machine-readable metadata |
| Deployment YAML | `releases/vX.Y.Z.yaml` | Kubernetes-style manifest |

### Accessing Release Info

```bash
# Get latest tag
git describe --tags --abbrev=0

# List all releases
gh release list

# View specific release
gh release view v1.2.3

# Download release assets
gh release download v1.2.3
```

---

## Rollback Procedures

### Quick Rollback (Recommended)

Revert to the previous release:

```bash
# Find previous version
git tag -l | sort -V | tail -2

# Trigger rollback deployment
./scripts/auto-rollback.sh
# or
gh workflow run deploy-production.yml -f version=PREVIOUS_VERSION
```

### Git Revert (Creates New Release)

If the issue is in code, revert commits:

```bash
git checkout main
git pull
git revert HEAD --no-edit  # Revert last commit
git push
```

This triggers a new patch release with the fix reverted.

### Emergency Rollback

For critical incidents:

```bash
# Direct Kubernetes rollback
kubectl -n intelgraph-production rollout undo deployment/api-server

# Helm rollback
helm rollback intelgraph -n intelgraph-production
```

---

## Troubleshooting

### Release Not Created

**Symptoms**: Merged PR but no new release

**Check**:
1. Commit messages follow convention (`feat:`, `fix:`, etc.)
2. No `[skip ci]` in commit messages
3. Workflow ran successfully: [Actions page](https://github.com/BrianCLong/summit/actions)

**Fix**:
```bash
# Manually trigger release
gh workflow run semantic-release.yml --ref main
```

### Wrong Version Bump

**Symptoms**: Expected major but got minor

**Check**:
- Breaking change format: Must use `BREAKING CHANGE:` footer or `!` suffix

**Fix**:
Can't change released version. Cut a new release with correct commits.

### CHANGELOG Not Updated

**Check**:
1. `.releaserc.json` has `@semantic-release/changelog` plugin
2. `CHANGELOG.md` exists and is committed

**Fix**:
```bash
# Regenerate changelog manually
npx semantic-release --dry-run
```

### Authentication Errors

**Symptoms**: `GITHUB_TOKEN` or permission errors

**Check**:
- Repository secrets configured
- Workflow has correct permissions

**Fix**:
Contact repository admin to verify secrets and permissions.

---

## Configuration Reference

### semantic-release Configuration

Primary configuration: `.releaserc.json`

```json
{
  "branches": ["main", {"name": "beta", "prerelease": true}, {"name": "alpha", "prerelease": true}],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git",
    "@semantic-release/github",
    "@semantic-release/exec"
  ]
}
```

### Related Files

| File | Purpose |
|------|---------|
| `.releaserc.json` | semantic-release configuration |
| `.github/workflows/semantic-release.yml` | Release workflow |
| `scripts/prepare-release.sh` | Pre-release preparation |
| `scripts/publish-release.sh` | Post-release actions |
| `scripts/gen-release-notes.sh` | Manual release notes |
| `CHANGELOG.md` | Cumulative changelog |

---

## Quick Reference

```bash
# Check current version
cat package.json | jq -r .version

# View recent tags
git tag -l | sort -V | tail -5

# Dry-run release (no changes)
npx semantic-release --dry-run

# Trigger release manually
gh workflow run semantic-release.yml --ref main

# View release status
gh run list --workflow=semantic-release.yml

# Create hotfix
git checkout -b hotfix/fix $(git describe --tags --abbrev=0)

# View changelog
head -100 CHANGELOG.md
```

---

## Support

- **Release Issues**: Open issue with `release` label
- **Emergency**: Contact on-call via PagerDuty
- **Documentation**: See [RUNBOOKS/release.md](../../RUNBOOKS/release.md)
