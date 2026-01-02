# Deployment Runbook

## Purpose

This runbook provides standardized deployment procedures for the Summit platform across all environments.

## Deployment Strategy

Summit uses a **multi-stage deployment pipeline** with automated gates and manual approval points:

```
Development → Staging → Canary → Production
```

### Deployment Environments

| Environment | Purpose | Auto-Deploy | Approval Required |
|-------------|---------|-------------|-------------------|
| `development` | Feature development | Yes (on PR merge) | No |
| `staging` | Pre-production testing | Yes (on main merge) | No |
| `canary` | Production subset (5% traffic) | No | Yes (Platform Lead) |
| `production` | Full production | No | Yes (2 approvers) |

---

## Pre-Deployment Checklist

Before initiating any production deployment:

- [ ] All CI checks pass (tests, lint, security scans)
- [ ] Code review approved by at least 2 reviewers
- [ ] Staging deployment successful and verified
- [ ] Database migrations tested in staging
- [ ] Rollback plan documented
- [ ] Feature flags configured (if applicable)
- [ ] Monitoring dashboards ready
- [ ] On-call team notified
- [ ] Deployment window scheduled (outside peak hours)
- [ ] Stakeholders notified (for major releases)

---

## Standard Deployment Procedure

### Step 1: Prepare Release

1. **Create release branch** (if not using trunk-based development)
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/v4.0.5
   ```

2. **Update version numbers**
   ```bash
   # Update package.json versions
   npm version patch -m "Bump version to %s"

   # Update CHANGELOG.md
   vi CHANGELOG.md
   ```

3. **Run pre-flight checks**
   ```bash
   # Ensure clean working directory
   git status

   # Run full test suite
   pnpm test

   # Run verification suite
   pnpm verify

   # Run security scans
   make security-scan

   # Build artifacts
   pnpm build
   ```

4. **Create release PR**
   ```bash
   git push origin release/v4.0.5
   gh pr create --title "Release v4.0.5" --body "$(cat CHANGELOG.md | head -50)"
   ```

### Step 2: Deploy to Staging

1. **Merge to main** (triggers auto-deploy to staging)
   ```bash
   gh pr merge --auto --squash
   ```

2. **Wait for CI/CD pipeline**
   - Monitor GitHub Actions workflow
   - Ensure all gates pass (tests, security, compliance)

3. **Verify staging deployment**
   ```bash
   # Check deployment status
   kubectl rollout status deployment/intelgraph-server -n summit-staging

   # Run smoke tests
   make smoke ENVIRONMENT=staging

   # Run integration tests
   make integration ENVIRONMENT=staging

   # Manual verification
   curl -f https://staging.summit.internal/api/health
   ```

4. **Validate database migrations** (if applicable)
   ```bash
   # Check migration status
   kubectl exec -n summit-staging deploy/intelgraph-server -- npx tsx scripts/migration-status.ts

   # Verify no migration errors
   kubectl logs -n summit-staging -l app=intelgraph-server | grep -i "migration"
   ```

### Step 3: Deploy to Canary (Production Subset)

1. **Initiate canary deployment**
   ```bash
   # Deploy to canary environment
   make deploy ENVIRONMENT=canary VERSION=v4.0.5

   # Or use deployment script
   scripts/deploy/deploy-canary.sh --version v4.0.5
   ```

2. **Monitor canary metrics** (30-60 minutes)
   ```bash
   # Watch error rates
   scripts/monitoring/watch-canary-metrics.sh

   # Compare canary vs production baseline
   scripts/monitoring/compare-canary.sh
   ```

   **Key metrics to monitor:**
   - Error rate (should be < 1% and similar to production)
   - Latency P50, P95, P99 (should be within 10% of production)
   - Success rate (should be > 99%)
   - Database query performance
   - Memory and CPU usage

3. **Decision point: Proceed or rollback**
   - ✅ If metrics are healthy: Proceed to full production
   - ❌ If metrics are degraded: [Rollback canary](#rollback-canary)

### Step 4: Deploy to Full Production

1. **Final approval checkpoint**
   - Platform Lead approval required
   - Second approver (CTO or Senior Engineer) required
   - Verify canary metrics are healthy

2. **Initiate production deployment**
   ```bash
   # Deploy to production with blue-green strategy
   make deploy ENVIRONMENT=production VERSION=v4.0.5 STRATEGY=blue-green

   # Or use deployment script
   scripts/deploy/deploy-production.sh --version v4.0.5 --strategy blue-green
   ```

3. **Progressive rollout** (recommended for large changes)
   ```bash
   # Roll out to 10% of production
   scripts/deploy/progressive-rollout.sh --version v4.0.5 --percentage 10

   # Wait 15 minutes, monitor metrics
   sleep 900
   scripts/monitoring/watch-production-metrics.sh

   # Roll out to 50%
   scripts/deploy/progressive-rollout.sh --version v4.0.5 --percentage 50

   # Wait 15 minutes, monitor metrics
   sleep 900

   # Complete rollout to 100%
   scripts/deploy/progressive-rollout.sh --version v4.0.5 --percentage 100
   ```

4. **Monitor production deployment**
   ```bash
   # Watch rollout status
   kubectl rollout status deployment/intelgraph-server -n summit-production

   # Monitor real-time metrics
   scripts/monitoring/production-dashboard.sh

   # Watch error logs
   kubectl logs -n summit-production -l app=intelgraph-server -f | grep ERROR
   ```

### Step 5: Post-Deployment Verification

1. **Run smoke tests**
   ```bash
   make smoke ENVIRONMENT=production
   ```

2. **Verify critical paths**
   ```bash
   # Authentication
   scripts/verify/check-auth.sh --environment production

   # API health
   scripts/verify/check-api.sh --environment production

   # Database connectivity
   scripts/verify/check-database.sh --environment production

   # Graph queries
   scripts/verify/check-neo4j.sh --environment production
   ```

3. **Check key metrics** (monitor for 1 hour minimum)
   - Error rate < 0.5%
   - Response time P95 < 500ms
   - Database connections healthy
   - No memory leaks
   - No unexpected errors

4. **Verify feature flags** (if used)
   ```bash
   scripts/feature-flags/verify-flags.sh --environment production
   ```

### Step 6: Finalize Release

1. **Tag release**
   ```bash
   git tag -a v4.0.5 -m "Release v4.0.5"
   git push origin v4.0.5
   ```

2. **Create GitHub release**
   ```bash
   gh release create v4.0.5 --title "v4.0.5" --notes "$(cat CHANGELOG.md | head -50)"
   ```

3. **Generate release artifacts**
   ```bash
   # Generate SBOM
   scripts/compliance/generate-sbom.ts --version v4.0.5

   # Generate provenance attestation
   scripts/compliance/generate-provenance.ts --version v4.0.5

   # Upload to artifact repository
   scripts/release/upload-artifacts.sh --version v4.0.5
   ```

4. **Update documentation**
   - Update version in README.md
   - Update API documentation (if changed)
   - Notify stakeholders of release

---

## Database Migration Deployments

For deployments that include database migrations, follow these additional steps:

### Pre-Migration

1. **Backup production database**
   ```bash
   scripts/dr/backup-database.sh --reason "pre-migration-v4.0.5"
   ```

2. **Test migration in staging**
   ```bash
   # Run migration in staging
   kubectl exec -n summit-staging deploy/intelgraph-server -- npx tsx scripts/run-migrations.ts

   # Verify migration succeeded
   kubectl exec -n summit-staging deploy/intelgraph-server -- npx tsx scripts/migration-status.ts
   ```

3. **Create rollback migration** (if not auto-generated)
   ```bash
   # Document rollback procedure
   vi migrations/rollback-v4.0.5.sql
   ```

### Migration Execution

1. **Enable maintenance mode** (optional, for breaking changes)
   ```bash
   kubectl set env deployment/intelgraph-server -n summit-production MAINTENANCE_MODE=true
   ```

2. **Run migration**
   ```bash
   kubectl exec -n summit-production deploy/intelgraph-server -- npx tsx scripts/run-migrations.ts
   ```

3. **Verify migration**
   ```bash
   # Check migration status
   kubectl exec -n summit-production deploy/intelgraph-server -- npx tsx scripts/migration-status.ts

   # Verify data integrity
   scripts/db/verify-data-integrity.sh
   ```

4. **Disable maintenance mode**
   ```bash
   kubectl set env deployment/intelgraph-server -n summit-production MAINTENANCE_MODE=false
   ```

---

## Hotfix Deployment

For urgent production fixes that can't wait for the standard release cycle:

1. **Create hotfix branch from production tag**
   ```bash
   git checkout v4.0.5
   git checkout -b hotfix/critical-auth-fix
   ```

2. **Make minimal fix**
   - Keep changes as small as possible
   - Only fix the critical issue
   - Avoid refactoring or feature additions

3. **Fast-track testing**
   ```bash
   # Run relevant tests
   pnpm test:unit -- auth

   # Run security scan
   make security-scan

   # Deploy to staging first
   make deploy ENVIRONMENT=staging
   ```

4. **Emergency approval**
   - Get approval from Platform Lead
   - Document justification for fast-track

5. **Deploy directly to production**
   ```bash
   scripts/deploy/deploy-hotfix.sh --branch hotfix/critical-auth-fix
   ```

6. **Immediate verification**
   - Watch logs closely
   - Monitor error rates
   - Verify fix resolves the issue

7. **Backport to main**
   ```bash
   git checkout main
   git merge hotfix/critical-auth-fix
   git push origin main
   ```

---

## Rollback Procedures

If issues are detected post-deployment, see [ROLLBACK.md](./ROLLBACK.md) for detailed rollback procedures.

**Quick rollback**:
```bash
scripts/rollback.sh --environment production --revision previous
```

---

## Deployment Types

### Blue-Green Deployment

Used for zero-downtime deployments of major changes.

```bash
# Deploy new version to "green" environment
scripts/deploy/blue-green.sh --version v4.0.5 --color green

# Smoke test green environment
make smoke ENVIRONMENT=production-green

# Switch traffic to green
scripts/deploy/blue-green-switch.sh --to green

# Monitor for 30 minutes
scripts/monitoring/watch-production-metrics.sh

# Decommission blue (old version)
scripts/deploy/blue-green-decommission.sh --color blue
```

### Canary Deployment

Used for gradual rollout of changes.

```bash
# Deploy canary (5% traffic)
scripts/deploy/canary.sh --version v4.0.5 --percentage 5

# Monitor canary
scripts/monitoring/watch-canary-metrics.sh

# Increase to 25%
scripts/deploy/canary.sh --version v4.0.5 --percentage 25

# Continue until 100%
scripts/deploy/canary.sh --version v4.0.5 --percentage 100
```

### Feature Flag Deployment

Used for deploying code that is not yet enabled.

```bash
# Deploy with feature flag disabled
make deploy ENVIRONMENT=production VERSION=v4.0.5 FEATURE_NEW_UI=false

# Gradually enable feature
scripts/feature-flags/set-flag.sh --flag NEW_UI --percentage 10
scripts/feature-flags/set-flag.sh --flag NEW_UI --percentage 50
scripts/feature-flags/set-flag.sh --flag NEW_UI --percentage 100
```

---

## Monitoring & Alerting

### Key Dashboards

- **Deployment Dashboard**: https://grafana.summit.internal/d/deployments
- **Error Rate Dashboard**: https://grafana.summit.internal/d/errors
- **Performance Dashboard**: https://grafana.summit.internal/d/performance
- **Database Dashboard**: https://grafana.summit.internal/d/database

### Critical Alerts

Set up alerts for:
- Error rate > 1%
- Response time P95 > 1000ms
- Database connection errors
- Memory usage > 85%
- CPU usage > 80%

---

## Deployment Automation

All deployments are automated via GitHub Actions:

- **Workflow**: `.github/workflows/release-ga.yml`
- **Reusable workflow**: `.github/workflows/reusable-golden-path.yml`
- **Deployment scripts**: `scripts/deploy/`

---

## Compliance & Audit

For SOC2/ISO compliance, ensure:

1. **Deployment is logged**
   ```bash
   scripts/compliance/log-deployment.sh --version v4.0.5 --environment production
   ```

2. **Approvals are documented**
   - GitHub PR approvals recorded
   - Release notes include approvers

3. **Provenance is generated**
   ```bash
   scripts/compliance/generate-provenance.ts --version v4.0.5
   ```

4. **SBOM is generated**
   ```bash
   scripts/compliance/generate-sbom.ts --version v4.0.5
   ```

---

## Troubleshooting

### Deployment Fails During Rollout

```bash
# Check rollout status
kubectl rollout status deployment/intelgraph-server -n summit-production

# Check events
kubectl get events -n summit-production --sort-by='.lastTimestamp' | tail -20

# Check pod status
kubectl get pods -n summit-production -l app=intelgraph-server

# Check logs
kubectl logs -n summit-production -l app=intelgraph-server --tail=100
```

### Database Migration Fails

```bash
# Check migration status
kubectl exec -n summit-production deploy/intelgraph-server -- npx tsx scripts/migration-status.ts

# Rollback migration
kubectl exec -n summit-production deploy/intelgraph-server -- npx tsx scripts/rollback-migration.ts

# Restore from backup (if necessary)
scripts/dr/restore-database.sh --backup pre-migration-v4.0.5
```

### Health Checks Fail After Deployment

```bash
# Check service health
kubectl get pods -n summit-production -l app=intelgraph-server

# Check readiness probes
kubectl describe pod <pod-name> -n summit-production | grep -A 5 "Readiness"

# Check application logs
kubectl logs -n summit-production <pod-name> --tail=200

# Rollback if critical
scripts/rollback.sh --environment production --revision previous
```

---

## Related Runbooks

- [ROLLBACK.md](./ROLLBACK.md) - Rollback procedures
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident response
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - DR procedures

---

**Last Updated**: 2026-01-02
**Owner**: Platform Engineering Team
**Review Cycle**: Quarterly
