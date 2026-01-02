# Rollback Runbook

## Purpose

This runbook provides procedures for rolling back deployments when issues are detected in production.

## When to Rollback

Initiate a rollback when:

- **Error rate** increases > 5% above baseline
- **Critical functionality** is broken
- **Data corruption** is detected
- **Security vulnerability** is discovered
- **Performance degradation** > 2x normal latency
- **Database migration** fails or causes issues
- **Canary metrics** show significant degradation

**Decision Time**: Within 15 minutes of detecting issue

---

## Rollback Decision Matrix

| Severity | Symptom | Action | Approval Required |
|----------|---------|--------|-------------------|
| SEV-1 | Complete outage, data loss | Immediate rollback | Platform Lead (can approve after) |
| SEV-2 | Elevated errors > 10% | Rollback within 15 min | Platform Lead |
| SEV-3 | Elevated errors 5-10% | Investigate, prepare rollback | On-call Engineer |
| SEV-4 | Minor issues < 5% | Monitor, schedule fix | None |

---

## Rollback Types

### Type 1: Application Rollback (No DB Changes)

**When**: Deployment without database migrations

**Complexity**: Low
**Time**: 5-10 minutes
**Risk**: Minimal

### Type 2: Application + DB Rollback (Compatible Schema)

**When**: DB migrations are backward-compatible

**Complexity**: Medium
**Time**: 15-20 minutes
**Risk**: Low to Medium

### Type 3: Full Stack Rollback (Breaking DB Changes)

**When**: DB migrations are NOT backward-compatible

**Complexity**: High
**Time**: 30-60 minutes
**Risk**: Medium to High

---

## Standard Rollback Procedure

### Pre-Rollback Checklist

- [ ] Confirm issue is related to recent deployment
- [ ] Verify previous version is available
- [ ] Check rollback will resolve the issue
- [ ] Notify stakeholders (for SEV-1/SEV-2)
- [ ] Prepare monitoring dashboards
- [ ] Have incident commander assigned
- [ ] Document rollback decision and reason

### Step 1: Initiate Rollback

1. **Stop ongoing deployment** (if still in progress)
   ```bash
   # Pause rollout
   kubectl rollout pause deployment/intelgraph-server -n summit-production
   ```

2. **Identify target revision**
   ```bash
   # List recent deployments
   kubectl rollout history deployment/intelgraph-server -n summit-production

   # Get details of specific revision
   kubectl rollout history deployment/intelgraph-server -n summit-production --revision=<NUMBER>
   ```

3. **Execute rollback**

   **Option A: Quick rollback to previous version** (recommended)
   ```bash
   scripts/rollback.sh --environment production --revision previous
   ```

   **Option B: Rollback to specific version**
   ```bash
   scripts/rollback.sh --environment production --revision v4.0.4
   ```

   **Option C: Kubectl rollback** (manual)
   ```bash
   kubectl rollout undo deployment/intelgraph-server -n summit-production
   ```

   **Option D: Rollback to specific revision number**
   ```bash
   kubectl rollout undo deployment/intelgraph-server -n summit-production --to-revision=<NUMBER>
   ```

### Step 2: Monitor Rollback

1. **Watch rollback progress**
   ```bash
   # Monitor rollout status
   kubectl rollout status deployment/intelgraph-server -n summit-production

   # Watch pods being replaced
   kubectl get pods -n summit-production -l app=intelgraph-server -w
   ```

2. **Verify rollback completion**
   ```bash
   # Check deployment revision
   kubectl get deployment intelgraph-server -n summit-production -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}'

   # Check all pods are running old version
   kubectl get pods -n summit-production -l app=intelgraph-server -o jsonpath='{.items[*].spec.containers[0].image}'
   ```

### Step 3: Verify Service Recovery

1. **Run smoke tests**
   ```bash
   make smoke ENVIRONMENT=production
   ```

2. **Check critical paths**
   ```bash
   # Authentication
   scripts/verify/check-auth.sh --environment production

   # API health
   curl -f https://api.summit.production/health

   # Database connectivity
   scripts/verify/check-database.sh --environment production
   ```

3. **Monitor key metrics** (watch for 30 minutes)
   ```bash
   scripts/monitoring/watch-production-metrics.sh
   ```

   **Expected results after successful rollback:**
   - Error rate returns to < 1%
   - Response times return to normal
   - No new errors in logs
   - All health checks pass

### Step 4: Post-Rollback Actions

1. **Confirm service stability**
   - Monitor for at least 30 minutes
   - Verify error rates remain normal
   - Check no regression in other services

2. **Update status**
   - Update incident channel
   - Update status page (if applicable)
   - Notify stakeholders

3. **Document rollback**
   ```bash
   scripts/incidents/log-rollback.sh \
     --from-version v4.0.5 \
     --to-version v4.0.4 \
     --reason "Elevated error rate" \
     --duration "15m"
   ```

4. **Schedule post-mortem**
   - Within 24 hours for SEV-1
   - Within 48 hours for SEV-2

---

## Database Rollback Procedures

### Scenario A: Backward-Compatible Migration (Additive Changes)

**Examples**: Adding columns, adding indexes, adding tables

**Procedure**:
```bash
# 1. Rollback application first
scripts/rollback.sh --environment production --revision previous

# 2. Database schema can stay (backward compatible)
# No database rollback needed

# 3. Verify application works with newer schema
make smoke ENVIRONMENT=production
```

### Scenario B: Breaking Schema Changes

**Examples**: Dropping columns, renaming columns, changing data types

**Procedure**:
```bash
# 1. Enable maintenance mode
kubectl set env deployment/intelgraph-server -n summit-production MAINTENANCE_MODE=true

# 2. Create database backup BEFORE rollback
scripts/dr/backup-database.sh --reason "pre-rollback-v4.0.5"

# 3. Rollback database migration
kubectl exec -n summit-production deploy/intelgraph-server -- \
  npx tsx scripts/rollback-migration.ts --migration <migration-name>

# 4. Verify migration rollback
kubectl exec -n summit-production deploy/intelgraph-server -- \
  npx tsx scripts/migration-status.ts

# 5. Rollback application
scripts/rollback.sh --environment production --revision previous

# 6. Disable maintenance mode
kubectl set env deployment/intelgraph-server -n summit-production MAINTENANCE_MODE=false

# 7. Verify service health
make smoke ENVIRONMENT=production
```

### Scenario C: Data Corruption Detected

**When**: Bad migration corrupted data

**Procedure**:
```bash
# 1. STOP ALL WRITES IMMEDIATELY
kubectl scale deployment/intelgraph-server -n summit-production --replicas=0

# 2. Assess corruption extent
scripts/db/assess-corruption.sh

# 3. If recent (< 1 hour), restore from backup
scripts/dr/restore-database.sh --backup pre-migration-v4.0.5

# 4. If older, use point-in-time recovery
scripts/dr/restore-database.sh --point-in-time "2026-01-02 14:30:00"

# 5. Verify data integrity
scripts/db/verify-data-integrity.sh

# 6. Rollback application to compatible version
scripts/rollback.sh --environment production --revision v4.0.4

# 7. Scale application back up
kubectl scale deployment/intelgraph-server -n summit-production --replicas=3

# 8. Extensive verification
make smoke ENVIRONMENT=production
scripts/db/verify-data-integrity.sh --comprehensive
```

---

## Blue-Green Rollback

If deployment used blue-green strategy:

```bash
# 1. Identify current color
CURRENT_COLOR=$(scripts/deploy/blue-green-status.sh --get-active)

# 2. Switch back to previous color
if [ "$CURRENT_COLOR" == "green" ]; then
  scripts/deploy/blue-green-switch.sh --to blue
else
  scripts/deploy/blue-green-switch.sh --to green
fi

# 3. Verify traffic switched
scripts/deploy/blue-green-status.sh --verify

# 4. Monitor for 15 minutes
scripts/monitoring/watch-production-metrics.sh

# 5. Decommission failed deployment
scripts/deploy/blue-green-decommission.sh --color $CURRENT_COLOR
```

---

## Canary Rollback

If issue detected in canary deployment:

```bash
# 1. Immediately stop canary traffic
scripts/deploy/canary-stop.sh

# 2. Route all traffic to stable version
scripts/deploy/canary-rollback.sh

# 3. Decommission canary instances
kubectl delete deployment intelgraph-server-canary -n summit-production

# 4. Verify production is stable
make smoke ENVIRONMENT=production
scripts/monitoring/watch-production-metrics.sh
```

---

## Emergency Rollback (SEV-1)

For complete outages requiring immediate action:

```bash
# ONE-LINE EMERGENCY ROLLBACK
scripts/rollback.sh --environment production --emergency

# This automatically:
# - Rolls back to last known good version
# - Skips approval gates
# - Notifies on-call team
# - Captures logs for investigation
# - Creates incident ticket
```

**Post-emergency actions:**
1. Verify service is restored
2. Document emergency rollback decision
3. Conduct immediate investigation
4. Schedule post-mortem within 24 hours

---

## Partial Rollback (Feature Flag)

If issue is isolated to a specific feature:

```bash
# 1. Disable feature flag
scripts/feature-flags/disable-flag.sh --flag NEW_UI

# 2. Verify issue is resolved
scripts/monitoring/watch-production-metrics.sh

# 3. Optionally rollback only affected service
kubectl set image deployment/intelgraph-ui -n summit-production \
  intelgraph-ui=intelgraph-ui:v4.0.4
```

---

## Rollback Verification Checklist

After any rollback, verify:

- [ ] All pods running and healthy
- [ ] Error rate < 1%
- [ ] Response time P95 < 500ms
- [ ] Authentication working
- [ ] Database connections healthy
- [ ] Critical API endpoints responding
- [ ] No errors in recent logs (last 15 minutes)
- [ ] External integrations working
- [ ] Smoke tests passing
- [ ] User-reported issues resolved

---

## Common Rollback Scenarios

### Scenario: High Error Rate After Deployment

```bash
# Quick check
scripts/monitoring/error-rate.sh --last 15m

# If > 5%, immediate rollback
scripts/rollback.sh --environment production --revision previous

# Monitor recovery
scripts/monitoring/watch-production-metrics.sh
```

### Scenario: Performance Degradation

```bash
# Check response times
scripts/monitoring/latency.sh --last 15m

# If P95 > 2x baseline, rollback
scripts/rollback.sh --environment production --revision previous

# Verify performance restored
scripts/monitoring/latency.sh --last 15m
```

### Scenario: Authentication Failures

```bash
# Critical - immediate rollback
scripts/rollback.sh --environment production --emergency

# Verify auth restored
scripts/verify/check-auth.sh --environment production
```

### Scenario: Database Connection Exhaustion

```bash
# May be related to new code
# Quick rollback
scripts/rollback.sh --environment production --revision previous

# Monitor database connections
watch 'psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"'
```

---

## Rollback Testing

To ensure rollback procedures work, conduct quarterly rollback drills:

```bash
# 1. Deploy test version to staging
make deploy ENVIRONMENT=staging VERSION=test-rollback

# 2. Intentionally break something
scripts/chaos/inject-error.sh --error-rate 10

# 3. Practice rollback
scripts/rollback.sh --environment staging --revision previous

# 4. Verify recovery
make smoke ENVIRONMENT=staging

# 5. Document lessons learned
```

---

## Rollback Automation

All rollback procedures are automated via scripts in `scripts/rollback.sh`:

```bash
# Usage examples

# Quick rollback to previous version
scripts/rollback.sh --environment production --revision previous

# Rollback to specific version
scripts/rollback.sh --environment production --revision v4.0.3

# Emergency rollback (skips confirmations)
scripts/rollback.sh --environment production --emergency

# Dry-run (preview what will happen)
scripts/rollback.sh --environment production --revision previous --dry-run

# Rollback with custom timeout
scripts/rollback.sh --environment production --revision previous --timeout 300
```

---

## Post-Rollback Investigation

After successful rollback:

1. **Preserve evidence**
   ```bash
   # Collect logs from failed deployment
   kubectl logs -n summit-production -l app=intelgraph-server \
     --previous > failed-deployment-logs-$(date +%Y%m%d-%H%M%S).log

   # Collect metrics during incident
   scripts/monitoring/export-metrics.sh \
     --start "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
     --end "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     > incident-metrics-$(date +%Y%m%d-%H%M%S).json
   ```

2. **Identify root cause**
   - Review code changes
   - Review configuration changes
   - Review infrastructure changes
   - Analyze logs and metrics

3. **Prevent recurrence**
   - Add monitoring/alerting
   - Improve testing
   - Update deployment procedures
   - Add circuit breakers/feature flags

4. **Document in post-mortem**

---

## Rollback Risks & Mitigation

### Risk: Data Loss

**Mitigation**:
- Always backup before rollback
- Use point-in-time recovery if available
- Test rollback in staging first

### Risk: Breaking Dependencies

**Mitigation**:
- Maintain backward compatibility
- Use API versioning
- Deploy services in correct order

### Risk: Incomplete Rollback

**Mitigation**:
- Use automated rollback scripts
- Verify all components rolled back
- Check all environments affected

---

## Related Runbooks

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident response
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - DR procedures

---

**Last Updated**: 2026-01-02
**Owner**: Platform Engineering Team
**Review Cycle**: Quarterly (after each rollback event)
