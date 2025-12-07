# Release Runbook

> **Last Updated**: 2025-12-06
> **On-Call Escalation**: See [INCIDENT_RESPONSE_PLAYBOOK.md](./INCIDENT_RESPONSE_PLAYBOOK.md)

## Overview

This runbook covers operational procedures for releasing the Summit/IntelGraph platform.

For detailed release process documentation, see: [docs/ops/release-process.md](../docs/ops/release-process.md)

---

## Quick Reference

### Trigger Standard Release

```bash
# Merge PR with conventional commits to main
# Release is automatic

# Or manually trigger:
gh workflow run semantic-release.yml --ref main
```

### Check Release Status

```bash
# View recent releases
gh release list --limit 5

# View specific release
gh release view v1.2.3

# View workflow runs
gh run list --workflow=semantic-release.yml --limit 5
```

### Emergency Hotfix

```bash
# 1. Create hotfix branch from latest tag
git fetch --tags
git checkout -b hotfix/critical-fix $(git describe --tags --abbrev=0)

# 2. Make fix
git commit -m "fix(critical): description"

# 3. Push and create PR
git push -u origin hotfix/critical-fix
gh pr create --base main --title "fix(critical): description" --label hotfix

# 4. After merge, release is automatic
```

---

## Pre-Release Checklist

Run the automated check:

```bash
pnpm release:check
```

Manual verification:

- [ ] All CI checks passing on main
- [ ] No critical security vulnerabilities (Dependabot/Snyk)
- [ ] Staging environment healthy
- [ ] Feature flags configured for new features
- [ ] Database migrations tested
- [ ] Rollback procedure verified

---

## Release Procedures

### Standard Release (Automatic)

1. **Merge PR to main**
   - Ensure PR has conventional commit messages
   - All CI checks must pass
   - Code review approved

2. **Monitor release workflow**
   ```bash
   gh run watch $(gh run list --workflow=semantic-release.yml --limit 1 --json databaseId -q '.[0].databaseId')
   ```

3. **Verify release created**
   ```bash
   gh release list --limit 1
   git fetch --tags && git tag -l | tail -1
   ```

4. **Verify staging deployment**
   ```bash
   curl -s https://staging.intelgraph.io/health | jq
   ```

5. **Deploy to production** (requires approval)
   ```bash
   gh workflow run deploy-production.yml -f version=<version>
   ```

### Manual Release (Emergency)

If automatic release fails:

1. **Check semantic-release dry run**
   ```bash
   pnpm release:dry-run
   ```

2. **Generate changelog manually**
   ```bash
   pnpm release:changelog:preview
   ```

3. **Create tag manually**
   ```bash
   VERSION=1.2.3
   git tag -a v$VERSION -m "Release v$VERSION"
   git push origin v$VERSION
   ```

4. **Create GitHub release**
   ```bash
   gh release create v$VERSION --generate-notes
   ```

### Pre-release (Beta/Alpha)

1. **Create/update pre-release branch**
   ```bash
   git checkout main && git pull
   git checkout -b beta  # or alpha
   git push -u origin beta
   ```

2. **Merge features to pre-release branch**
   ```bash
   git merge feature/new-feature
   git push
   ```

3. **Release is automatic** with pre-release version (e.g., `v1.3.0-beta.1`)

4. **Promote to production**
   ```bash
   git checkout main
   git merge beta
   git push
   ```

---

## Rollback Procedures

### Quick Rollback (Kubernetes)

```bash
# Immediate rollback to previous revision
kubectl -n intelgraph-production rollout undo deployment/api-server
kubectl -n intelgraph-production rollout undo deployment/web-server

# Verify rollback
kubectl -n intelgraph-production rollout status deployment/api-server
```

### Helm Rollback

```bash
# List revisions
helm history intelgraph -n intelgraph-production

# Rollback to previous
helm rollback intelgraph -n intelgraph-production

# Rollback to specific revision
helm rollback intelgraph 5 -n intelgraph-production
```

### Deploy Previous Version

```bash
# Find previous version
git tag -l | sort -V | tail -5

# Deploy specific version
gh workflow run deploy-production.yml -f version=1.2.2
```

### Git Revert (Creates New Release)

```bash
# Revert last commit and push
git checkout main
git revert HEAD --no-edit
git push

# This triggers a new patch release with the fix reverted
```

---

## Troubleshooting

### Release Not Created

**Symptoms**: Merged PR but no new release

**Diagnosis**:
```bash
# Check workflow run
gh run list --workflow=semantic-release.yml --limit 5

# View logs of failed run
gh run view <run-id> --log-failed
```

**Common Causes**:
1. No releasable commits (only `chore:`, `test:`, etc.)
2. `[skip ci]` in commit message
3. GitHub token permissions
4. Semantic-release config error

**Resolution**:
```bash
# Manual trigger
gh workflow run semantic-release.yml --ref main

# Check config
cat .releaserc.json | jq
```

### Wrong Version Bump

**Symptoms**: Expected major but got minor/patch

**Cause**: Breaking change not properly marked

**Prevention**:
```bash
# Use BREAKING CHANGE footer
git commit -m "feat(api): redesign auth

BREAKING CHANGE: New auth flow requires OAuth2"

# Or use ! suffix
git commit -m "feat(api)!: redesign auth"
```

### Staging Deployment Failed

**Diagnosis**:
```bash
# Check deployment workflow
gh run list --workflow=deploy-staging.yml --limit 5
gh run view <run-id> --log-failed

# Check Kubernetes status
kubectl -n intelgraph-staging get pods
kubectl -n intelgraph-staging describe pod <pod-name>
```

**Resolution**:
```bash
# Retry deployment
gh workflow run deploy-staging.yml -f version=<version>

# Or rollback
kubectl -n intelgraph-staging rollout undo deployment/api-server
```

### CHANGELOG Not Updated

**Diagnosis**:
```bash
# Check if CHANGELOG.md was modified
git diff HEAD~1 CHANGELOG.md
```

**Resolution**:
```bash
# Regenerate manually
pnpm release:changelog --output CHANGELOG.md
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG.md"
git push
```

---

## Monitoring & Alerts

### Release Health Dashboard

- **GitHub Actions**: https://github.com/BrianCLong/summit/actions
- **Releases**: https://github.com/BrianCLong/summit/releases
- **Grafana Dashboard**: https://grafana.intelgraph.io/d/releases

### Key Metrics to Monitor Post-Release

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 1% | Investigate logs |
| P99 latency | > 2s | Check for regression |
| Pod restarts | > 3 | Investigate OOM/crashes |
| 5xx responses | > 0.5% | Consider rollback |

### Alerts

- **PagerDuty**: Automatic for production incidents
- **Slack**: #releases channel for release notifications

---

## Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Release Manager | @release-team | Approve production deploys |
| SRE On-Call | See PagerDuty | Infrastructure issues |
| Security | @security-team | CVE/security releases |

---

## Related Documents

- [Release Process](../docs/ops/release-process.md)
- [Deployment Playbook](../docs/ops/deployment-playbook.md)
- [Incident Response](./INCIDENT_RESPONSE_PLAYBOOK.md)
- [DR/BCP](./DR.md)
