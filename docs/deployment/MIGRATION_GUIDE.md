# Migration Guide: CI/CD Release Automation

## Overview

This guide helps you migrate to the new automated CI/CD release system with semantic versioning, feature flags, and zero-downtime deployments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Breaking Changes](#breaking-changes)
3. [Migration Steps](#migration-steps)
4. [Configuration Updates](#configuration-updates)
5. [Testing the Migration](#testing-the-migration)
6. [Rollback Plan](#rollback-plan)
7. [FAQs](#faqs)

## Prerequisites

### Required Tools

- Node.js >= 18.x
- pnpm >= 9.x
- Docker >= 20.x
- kubectl >= 1.27.x
- Helm >= 3.13.x
- GitHub CLI (gh) >= 2.x

### Required Permissions

- GitHub repository admin access
- AWS/Cloud provider credentials
- LaunchDarkly account (for feature flags)
- Slack/Discord webhook (for notifications)

### Required Secrets

Add these secrets to your GitHub repository:

```bash
# AWS Credentials
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT:role/intelgraph-gh-deployer
AWS_ROLE_ARN_PRODUCTION=arn:aws:iam::ACCOUNT:role/intelgraph-gh-prod-deployer

# LaunchDarkly
LAUNCHDARKLY_SDK_KEY_STAGING=sdk-XXXXXXXX
LAUNCHDARKLY_SDK_KEY_PRODUCTION=sdk-XXXXXXXX

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX

# Environment-specific
STAGING_DATABASE_URL=postgresql://...
STAGING_REDIS_URL=redis://...
STAGING_NEO4J_URI=bolt://...
STAGING_NEO4J_PASSWORD=...

PRODUCTION_DATABASE_URL=postgresql://...
PRODUCTION_REDIS_URL=redis://...
PRODUCTION_NEO4J_URI=bolt://...
PRODUCTION_NEO4J_PASSWORD=...
```

## Breaking Changes

### 1. Commit Message Format

**Old:** Freeform commit messages

**New:** Conventional Commits required

```bash
# ❌ Old (will not trigger release)
git commit -m "fixed bug"

# ✅ New (triggers patch release)
git commit -m "fix: resolve authentication timeout issue"
```

**Migration Action:** Update your team's commit practices.

### 2. Release Process

**Old:** Manual version bumping in package.json

**New:** Automated versioning via semantic-release

**Migration Action:**
1. Remove any manual version management scripts
2. Update CI/CD workflows to use new release pipeline
3. Train team on conventional commits

### 3. Deployment Strategy

**Old:** Direct deployment to production

**New:** Multi-stage pipeline (staging → approval → production)

**Migration Action:**
1. Set up staging environment if not exists
2. Configure GitHub Environments with protection rules
3. Update deployment scripts

### 4. Feature Flag System

**New Addition:** Feature flags for gradual rollouts

**Migration Action:**
1. Install feature flag dependencies
2. Integrate FeatureFlagService in your application
3. Wrap new features with feature flags

## Migration Steps

### Step 1: Install Dependencies

```bash
# Install semantic-release and plugins
pnpm add -D semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/exec conventional-changelog-conventionalcommits

# Install LaunchDarkly SDK
pnpm add launchdarkly-node-server-sdk

# Install Prometheus client (for metrics)
pnpm add prom-client
```

### Step 2: Configure GitHub Environments

1. Go to Repository Settings → Environments
2. Create `staging` environment
3. Create `production` environment with:
   - Required reviewers: Add your deployment approvers
   - Wait timer: 0 minutes (manual approval only)
   - Deployment branches: Only `main` branch

### Step 3: Set Up LaunchDarkly

```bash
# 1. Create LaunchDarkly project
# 2. Copy SDK keys for staging and production
# 3. Add to GitHub secrets

# 4. Import feature flag configuration
curl -X POST https://app.launchdarkly.com/api/v2/flags/default \
  -H "Authorization: ${LD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @config/feature-flags.json
```

### Step 4: Update Application Code

#### Integrate Feature Flags

```typescript
// server/src/app.ts
import { FeatureFlagService } from './services/FeatureFlagService';

// Initialize feature flag service
const flagService = new FeatureFlagService({
  provider: process.env.NODE_ENV === 'production' ? 'launchdarkly' : 'local',
  config: {
    sdkKey: process.env.LAUNCHDARKLY_SDK_KEY,
    file: './config/feature-flags.json',
  },
});

await flagService.initialize();
```

#### Add Metrics Endpoint

```typescript
// server/src/routes/metrics.ts
import { Router } from 'express';
import { getMetrics } from '../middleware/deployment-metrics';

const router = Router();

router.get('/metrics', async (req, res) => {
  const metrics = getMetrics();
  const data = await metrics.getMetrics();

  res.set('Content-Type', 'text/plain');
  res.send(data);
});

export default router;
```

### Step 5: Migrate Existing Workflows

#### Before

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: ./deploy.sh production
```

#### After

Delete old workflow and use new semantic-release workflow:

```bash
# Delete old workflow
rm .github/workflows/deploy.yml

# New workflows are already in place:
# - .github/workflows/semantic-release.yml
# - .github/workflows/deploy-staging.yml
# - .github/workflows/deploy-production.yml
```

### Step 6: Update Package.json

Add semantic-release configuration reference:

```json
{
  "name": "intelgraph-platform",
  "version": "1.0.0",
  "release": {
    "extends": "./.releaserc.json"
  },
  "scripts": {
    "release": "semantic-release",
    "release:dry-run": "semantic-release --dry-run"
  }
}
```

### Step 7: Create First Release

```bash
# 1. Merge all pending changes to main
git checkout main
git pull origin main

# 2. Make a commit with conventional format
git commit --allow-empty -m "chore: migrate to automated CI/CD pipeline"

# 3. Push to trigger first release
git push origin main

# 4. Monitor GitHub Actions
gh run watch
```

### Step 8: Configure Monitoring

#### Prometheus

Add scrape config:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'intelgraph'
    static_configs:
      - targets: ['api.intelgraph.io:4000']
    metrics_path: '/metrics'
```

#### Grafana

Import dashboard from `monitoring/grafana/dashboards/deployment.json`:

```bash
# Upload dashboard
curl -X POST http://grafana.intelgraph.io/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -d @monitoring/grafana/dashboards/deployment.json
```

## Configuration Updates

### Environment Variables

Add to your `.env` files:

```bash
# .env.staging
NODE_ENV=staging
APP_VERSION=${CI_COMMIT_TAG}
METRICS_ENABLED=true
LAUNCHDARKLY_SDK_KEY=sdk-XXXXXXXX

# Feature flags
FEATURE_FLAGS_PROVIDER=launchdarkly
FEATURE_FLAGS_TIMEOUT=5000

# Deployment
DEPLOYMENT_ENVIRONMENT=staging
DEPLOYMENT_STRATEGY=blue-green
```

### Helm Values

Update `helm/intelgraph/values.yaml`:

```yaml
# Add deployment metadata
deployment:
  annotations:
    deployment.intelgraph.io/version: "{{ .Values.image.tag }}"
    deployment.intelgraph.io/timestamp: "{{ now | date \"2006-01-02T15:04:05Z07:00\" }}"

# Add feature flags configuration
featureFlags:
  enabled: true
  provider: launchdarkly
  sdkKey: ${LAUNCHDARKLY_SDK_KEY}

# Add metrics configuration
metrics:
  enabled: true
  port: 9090
  path: /metrics

# Add service monitor for Prometheus
serviceMonitor:
  enabled: true
  interval: 30s
  path: /metrics
```

## Testing the Migration

### 1. Test Local Development

```bash
# Start local environment
docker-compose up -d

# Verify feature flags work
curl http://localhost:4000/api/feature-flags

# Verify metrics endpoint
curl http://localhost:4000/metrics
```

### 2. Test Staging Deployment

```bash
# Create a test commit
git checkout -b test/migration
echo "test" >> README.md
git add README.md
git commit -m "test: verify automated deployment"

# Merge to main (or create PR)
git push origin test/migration
gh pr create --title "Test: Migration" --body "Testing new CI/CD pipeline"

# Monitor deployment
gh run watch
```

### 3. Test Feature Flags

```bash
# Enable a test flag in LaunchDarkly dashboard
# Or via CLI:
ldcli flag-update --flag test-feature --value true --env staging

# Verify in application
curl http://staging.intelgraph.io/api/feature-flags/test-feature
```

### 4. Test Rollback

```bash
# Trigger a rollback
./scripts/rollback-deployment.sh staging

# Verify rollback succeeded
kubectl -n intelgraph-staging get pods
kubectl -n intelgraph-staging rollout status deployment/api
```

## Rollback Plan

If you need to rollback the migration:

### Option 1: Use Old Workflows

```bash
# 1. Disable new workflows
gh workflow disable semantic-release.yml
gh workflow disable deploy-staging.yml
gh workflow disable deploy-production.yml

# 2. Re-enable old workflow
git revert <commit-hash-of-migration>
git push origin main
```

### Option 2: Manual Deployment

```bash
# Deploy specific version manually
./scripts/deploy-production.sh <previous-version>

# Or using Helm
helm rollback intelgraph -n intelgraph-production
```

### Option 3: Emergency Hotfix

```bash
# Create hotfix branch from last known good commit
git checkout -b hotfix/<issue> <last-good-commit>

# Make fix
git commit -m "hotfix: <description>"

# Deploy directly
./scripts/emergency-deploy.sh production
```

## FAQs

### Q: Do I need to migrate all at once?

**A:** No. You can migrate incrementally:
1. Start with semantic-release only
2. Add staging deployment
3. Add feature flags
4. Add production deployment

### Q: What if my commit messages don't follow the convention?

**A:** Commits without conventional format won't trigger releases. This is safe - just make a properly formatted commit to trigger the next release.

### Q: Can I still deploy manually?

**A:** Yes! You can always trigger workflows manually:

```bash
gh workflow run deploy-production.yml -f version=1.2.3
```

### Q: What happens to my existing releases?

**A:** They remain unchanged. The new system will create releases starting from your current version.

### Q: How do I handle hotfixes?

**A:** Create a hotfix branch, use conventional commits, and the system will create a patch release:

```bash
git checkout -b hotfix/critical-bug
git commit -m "fix: resolve critical security issue"
git push origin hotfix/critical-bug
```

### Q: Can I customize the release process?

**A:** Yes! Edit `.releaserc.json` to customize:
- Release rules
- Changelog format
- Git tag format
- Release notes template

### Q: How do I test without deploying?

**A:** Use dry-run mode:

```bash
pnpm run release:dry-run
```

## Support

For issues or questions:

- **Documentation:** https://docs.intelgraph.io
- **Slack:** #platform-engineering
- **Email:** platform-team@intelgraph.io
- **Issues:** https://github.com/BrianCLong/summit/issues

## Next Steps

After successful migration:

1. ✅ Train team on conventional commits
2. ✅ Set up monitoring dashboards
3. ✅ Configure alerting rules
4. ✅ Document team-specific processes
5. ✅ Schedule regular release retrospectives

---

**Migration Checklist:**

- [ ] Install dependencies
- [ ] Configure GitHub secrets
- [ ] Set up GitHub Environments
- [ ] Configure LaunchDarkly
- [ ] Update application code
- [ ] Test in staging
- [ ] Train team
- [ ] Document custom processes
- [ ] First production deployment
- [ ] Monitor and iterate

**Estimated Migration Time:** 4-8 hours
