# Quick Start Guide: CI/CD Release Automation

## 🚀 Get Started in 5 Minutes

This guide gets you up and running with the automated CI/CD release system.

## Prerequisites

- GitHub repository access
- Node.js 18+ and pnpm 9+
- Basic understanding of Git

## Step-by-Step Setup

### 1. Make Your First Release (2 minutes)

```bash
# 1. Make a change and commit with conventional format
git checkout -b feature/my-first-feature
echo "# New Feature" >> README.md
git add README.md
git commit -m "feat: add new feature documentation"

# 2. Push and create PR
git push origin feature/my-first-feature
gh pr create --title "feat: Add new feature" --body "My first automated release"

# 3. Merge PR (via GitHub UI or CLI)
gh pr merge --squash

# 4. Watch the magic happen!
gh run watch
```

**What just happened?**
- ✅ Semantic-release analyzed your commit
- ✅ Version bumped from 1.0.0 → 1.1.0 (minor release for `feat`)
- ✅ Changelog updated automatically
- ✅ Git tag created (v1.1.0)
- ✅ GitHub release created
- ✅ Docker images built and pushed
- ✅ Deployed to staging automatically

### 2. Use Feature Flags (3 minutes)

#### In Your Code

```typescript
// server/src/api/routes/dashboard.ts
import { getFeatureFlagService } from '../../services/FeatureFlagService';

export async function getDashboard(req, res) {
  const user = req.user;
  const flags = getFeatureFlagService();

  // Check if new dashboard is enabled
  const useNewDashboard = await flags.isEnabled('new-ui-dashboard', {
    key: user.id,
    email: user.email,
    organization: user.organization,
  });

  if (useNewDashboard) {
    return res.json(await getNewDashboard(user));
  }

  return res.json(await getOldDashboard(user));
}
```

#### Control Flags

```bash
# Via LaunchDarkly CLI
ldcli flag-update --flag new-ui-dashboard --value true --env production

# Or via script
./scripts/feature-flag-manager.js --flag new-ui-dashboard --enable --percentage 25
```

### 3. Deploy to Production (1 minute)

```bash
# Trigger production deployment
gh workflow run deploy-production.yml -f version=1.1.0

# Approve in GitHub UI
# Navigate to: Actions → Deploy to Production → Review deployments
```

## Common Use Cases

### Use Case 1: Bug Fix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug

# 2. Fix the bug
# ... make changes ...

# 3. Commit with fix: prefix
git commit -m "fix: resolve memory leak in graph query"

# 4. Push and merge
git push origin hotfix/critical-bug
gh pr create --title "fix: Critical bug" --body "Resolves #123"
gh pr merge --squash

# Result: Patch release (1.1.0 → 1.1.1)
```

### Use Case 2: New Feature with Flag

```bash
# 1. Add feature code with flag check
cat > server/src/features/collaboration.ts << 'EOF'
import { getFeatureFlagService } from '../services/FeatureFlagService';

export async function enableCollaboration(user) {
  const flags = getFeatureFlagService();

  const enabled = await flags.isEnabled('real-time-collaboration', {
    key: user.id,
    organization: user.organization
  });

  return enabled;
}
EOF

# 2. Commit and deploy
git add server/src/features/collaboration.ts
git commit -m "feat: add real-time collaboration (behind feature flag)"
git push

# 3. Gradual rollout
# Day 1: Enable for internal (0%)
# Day 3: Enable for 10%
# Day 7: Enable for 50%
# Day 14: Enable for 100%
```

### Use Case 3: Breaking Change

```bash
# 1. Make breaking change
git commit -m "feat!: migrate to new authentication system

BREAKING CHANGE: All API clients must update to OAuth2 flow.
See migration guide: docs/MIGRATION_AUTH.md"

# 2. This triggers major release (1.1.1 → 2.0.0)
# 3. Migration guide is automatically included in release notes
```

### Use Case 4: Rollback Deployment

```bash
# Automatic rollback (if health checks fail)
# - Monitoring detects issues
# - Automatic rollback triggered
# - Team notified via Slack

# Manual rollback
./scripts/rollback-deployment.sh production

# Or rollback to specific version
./scripts/rollback-deployment.sh production v1.1.0
```

## Cheat Sheet

### Commit Types → Version Bumps

| Commit Type | Example | Version Change |
|-------------|---------|----------------|
| `fix:` | `fix: resolve bug` | 1.0.0 → 1.0.1 (patch) |
| `feat:` | `feat: add feature` | 1.0.0 → 1.1.0 (minor) |
| `feat!:` or `BREAKING CHANGE:` | `feat!: new API` | 1.0.0 → 2.0.0 (major) |
| `chore:`, `docs:`, `style:` | `chore: update deps` | No release |

### Useful Commands

```bash
# Check what next release would be (without releasing)
pnpm run release:dry-run

# View current release
gh release view

# List all releases
gh release list

# View deployment status
gh run list --workflow=deploy-production.yml

# Check feature flag status
curl https://intelgraph.io/api/feature-flags

# View metrics
curl https://intelgraph.io/metrics

# View logs
kubectl logs -n intelgraph-production -l app=api --tail=100

# Emergency: Enable maintenance mode
./scripts/feature-flag-manager.js --flag maintenance-mode --enable
```

### Feature Flag Patterns

```typescript
// Boolean flag
const enabled = await flags.isEnabled('feature-name', user);

// String flag (A/B testing)
const variant = await flags.getValue('ui-variant', user, 'control');
if (variant === 'treatment') {
  // Show variant B
}

// JSON flag (configuration)
const config = await flags.getJSONValue('api-config', user, {
  rateLimit: 100,
  timeout: 5000
});

// Kill switch
const isMaintenanceMode = await flags.isEnabled('maintenance-mode', user);
if (isMaintenanceMode) {
  return res.status(503).json({ message: 'Under maintenance' });
}
```

## Monitoring

### View Deployment Metrics

```bash
# Grafana dashboards
open https://grafana.intelgraph.io/d/deployments

# Prometheus queries
open https://prometheus.intelgraph.io/graph

# Application logs
kubectl logs -f deployment/api -n intelgraph-production
```

### Key Metrics to Watch

- **Deployment Success Rate**: Should be > 95%
- **Deployment Duration**: Should be < 10 minutes
- **Rollback Rate**: Should be < 5%
- **Feature Flag Evaluation Latency**: Should be < 10ms
- **Error Rate**: Should be < 1%

## Troubleshooting

### Release Not Created

**Problem:** Pushed to main but no release created

**Solution:**
```bash
# Check if commits use conventional format
git log --oneline -5

# If not, make a properly formatted commit
git commit --allow-empty -m "fix: trigger release"
git push
```

### Deployment Failed

**Problem:** Staging deployment failed

**Solution:**
```bash
# Check logs
gh run view --log-failed

# Check pod status
kubectl get pods -n intelgraph-staging

# Check pod logs
kubectl logs -n intelgraph-staging deployment/api

# Retry deployment
gh run rerun <run-id>
```

### Feature Flag Not Working

**Problem:** Feature flag always returns default value

**Solution:**
```bash
# 1. Check flag exists
curl https://intelgraph.io/api/feature-flags

# 2. Check LaunchDarkly configuration
ldcli flags list

# 3. Check logs for errors
kubectl logs -n intelgraph-production deployment/api | grep "feature_flag"

# 4. Clear cache
curl -X POST https://intelgraph.io/api/feature-flags/cache/clear \
  -H "Authorization: Bearer ${API_KEY}"
```

## Best Practices

### ✅ Do

- Use conventional commit format for all commits
- Write clear, descriptive commit messages
- Use feature flags for new functionality
- Monitor deployments in real-time
- Test in staging before production
- Keep commits focused and atomic
- Document breaking changes clearly

### ❌ Don't

- Don't commit directly to main (use PRs)
- Don't skip staging environment
- Don't deploy on Fridays (unless necessary)
- Don't use `[skip ci]` unless you're sure
- Don't ignore failed health checks
- Don't remove feature flags too quickly (wait 30 days)

## Examples Repository

See `examples/` directory for complete working examples:

- `examples/feature-flag-integration/` - Feature flag usage patterns
- `examples/deployment-scripts/` - Custom deployment scripts
- `examples/monitoring-dashboards/` - Grafana dashboard configs
- `examples/rollback-scenarios/` - Rollback procedures

## Next Steps

1. ✅ Make your first automated release
2. ✅ Add feature flags to a new feature
3. ✅ Deploy to staging and verify
4. ✅ Deploy to production
5. ✅ Set up monitoring dashboards
6. ✅ Configure alerts
7. ✅ Train your team

## Resources

- [Full Release Process Documentation](./RELEASE_PROCESS.md)
- [Feature Flags Guide](./FEATURE_FLAGS.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

## Support

- **Slack:** #platform-engineering, #deployments
- **Documentation:** https://docs.intelgraph.io
- **Issues:** https://github.com/BrianCLong/summit/issues

---

**Questions?** Ask in #platform-engineering on Slack!
