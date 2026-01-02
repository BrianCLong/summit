# Incident Response Runbook

## Purpose

This runbook provides step-by-step procedures for responding to production incidents in the Summit platform.

## Severity Levels

### SEV-1 (Critical)
- Complete platform outage
- Data breach or security compromise
- Widespread authentication failures
- Database corruption or data loss

**Response Time**: Immediate (< 15 minutes)
**Escalation**: CTO, Security Lead, Platform Lead

### SEV-2 (High)
- Partial service degradation
- Elevated error rates (> 5%)
- Performance degradation (> 2x normal latency)
- Regional outage

**Response Time**: < 30 minutes
**Escalation**: Platform Lead, On-call Engineer

### SEV-3 (Medium)
- Minor feature degradation
- Non-critical service failures
- Elevated warnings in logs

**Response Time**: < 2 hours
**Escalation**: On-call Engineer

### SEV-4 (Low)
- Cosmetic issues
- Non-urgent bugs
- Monitoring alerts (non-critical)

**Response Time**: Next business day

---

## Incident Response Process

### Phase 1: Detection & Triage (0-5 minutes)

1. **Confirm the incident**
   ```bash
   # Check system health
   make health-check

   # Check service status
   kubectl get pods -n summit-production

   # Review recent deployments
   kubectl rollout history deployment/intelgraph-server -n summit-production
   ```

2. **Determine severity** using the levels above

3. **Declare incident**
   - Create incident channel: `#incident-<YYYY-MM-DD>-<description>`
   - Update status page (if SEV-1 or SEV-2)
   - Page on-call team (use PagerDuty or configured alerting)

4. **Assign roles**
   - **Incident Commander (IC)**: Coordinates response
   - **Technical Lead**: Drives technical investigation
   - **Communications Lead**: Manages stakeholder updates
   - **Scribe**: Documents timeline and actions

### Phase 2: Containment (5-15 minutes)

1. **Assess blast radius**
   ```bash
   # Check affected services
   kubectl get events -n summit-production --sort-by='.lastTimestamp'

   # Check error rates
   curl -s http://localhost:9090/api/v1/query?query=rate(http_errors_total[5m])

   # Check database connections
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```

2. **Stop the bleeding**
   - If recent deployment: [Initiate Rollback](#emergency-rollback)
   - If traffic spike: Enable rate limiting
   - If database issue: Enable read-only mode
   - If security breach: [Initiate Security Response](#security-incident-response)

3. **Preserve evidence**
   ```bash
   # Capture logs
   kubectl logs -n summit-production deployment/intelgraph-server --since=1h > incident-logs-$(date +%Y%m%d-%H%M%S).log

   # Capture metrics snapshot
   curl -s http://localhost:9090/api/v1/query_range?query=rate(http_requests_total[5m])&start=$(date -u -d '1 hour ago' +%s)&end=$(date -u +%s)&step=60 > incident-metrics-$(date +%Y%m%d-%H%M%S).json

   # Capture database state
   scripts/dr/capture-db-state.sh > incident-db-state-$(date +%Y%m%d-%H%M%S).json
   ```

### Phase 3: Investigation (15-60 minutes)

1. **Check recent changes**
   ```bash
   # Review recent commits
   git log --oneline --since="2 hours ago"

   # Review recent deployments
   kubectl get events -n summit-production --field-selector type!=Normal

   # Review configuration changes
   git -C infra log --oneline --since="2 hours ago"
   ```

2. **Analyze logs**
   ```bash
   # Server errors
   kubectl logs -n summit-production -l app=intelgraph-server --tail=1000 | grep -i error

   # Database errors
   kubectl logs -n summit-production -l app=postgres --tail=1000

   # Authentication errors
   grep "authentication failed" incident-logs-*.log | head -20
   ```

3. **Check dependencies**
   ```bash
   # Database health
   scripts/health/check-database.sh

   # Redis health
   kubectl exec -n summit-production deploy/redis -- redis-cli ping

   # Neo4j health
   curl -u neo4j:$NEO4J_PASSWORD http://neo4j:7474/db/data/
   ```

4. **Identify root cause**
   - Document hypothesis
   - Test hypothesis in staging
   - Confirm with evidence

### Phase 4: Remediation (Variable)

1. **Implement fix**

   **Option A: Rollback** (preferred for deployment issues)
   ```bash
   # See ROLLBACK.md for detailed procedures
   scripts/rollback.sh --environment production --revision previous
   ```

   **Option B: Hotfix** (for critical bugs)
   ```bash
   # Create hotfix branch
   git checkout -b hotfix/incident-$(date +%Y%m%d)

   # Make minimal fix
   # ... edit files ...

   # Fast-track deployment
   make deploy-hotfix ENVIRONMENT=production
   ```

   **Option C: Configuration change**
   ```bash
   # Update configuration
   kubectl edit configmap summit-config -n summit-production

   # Restart affected services
   kubectl rollout restart deployment/intelgraph-server -n summit-production
   ```

   **Option D: Manual intervention**
   ```bash
   # Execute remediation script
   npx tsx scripts/remediation/<specific-fix>.ts
   ```

2. **Verify fix**
   ```bash
   # Check service health
   make health-check

   # Monitor error rates
   scripts/monitoring/watch-errors.sh

   # Run smoke tests
   make smoke ENVIRONMENT=production
   ```

3. **Monitor for regression**
   - Watch for 30 minutes minimum
   - Check all key metrics return to normal
   - Verify no new errors introduced

### Phase 5: Recovery & Communication (60+ minutes)

1. **Restore full service**
   - Remove any temporary mitigations
   - Re-enable rate limits to normal
   - Restore normal capacity

2. **Update stakeholders**
   - Post incident resolution to status page
   - Notify affected customers
   - Update internal channels

3. **Close incident**
   - Document timeline
   - Archive logs and evidence
   - Schedule post-mortem within 48 hours

---

## Emergency Rollback

For deployment-related incidents, use the rollback procedure:

```bash
# Quick rollback to previous version
scripts/rollback.sh --environment production --revision previous

# Rollback to specific version
scripts/rollback.sh --environment production --revision v4.0.3

# Verify rollback
kubectl rollout status deployment/intelgraph-server -n summit-production
make smoke ENVIRONMENT=production
```

See [ROLLBACK.md](./ROLLBACK.md) for detailed rollback procedures.

---

## Security Incident Response

For security incidents (SEV-1), follow additional procedures:

1. **Immediate containment**
   ```bash
   # Enable enhanced logging
   kubectl set env deployment/intelgraph-server -n summit-production SECURITY_LOG_LEVEL=debug

   # Enable IP blocking (if applicable)
   scripts/security/block-ips.sh --ips <malicious-ips>

   # Rotate credentials (if compromised)
   # See SECRET_ROTATION.md
   ```

2. **Activate security team**
   - Page security lead
   - Activate security incident response team
   - Contact legal (if required)

3. **Preserve forensic evidence**
   ```bash
   # Capture full system state
   scripts/forensics/capture-state.sh > forensic-capture-$(date +%Y%m%d-%H%M%S).tar.gz

   # Snapshot affected databases
   scripts/dr/snapshot-database.sh --reason "security-incident-$(date +%Y%m%d)"
   ```

4. **Follow breach notification procedures**
   - See `SECURITY/incident-response.md` for details
   - Comply with regulatory requirements (GDPR, SOC2, etc.)

---

## Common Incident Scenarios

### Scenario: Database Connection Pool Exhausted

**Symptoms**: 503 errors, "too many connections" in logs

**Immediate fix**:
```bash
# Increase connection pool temporarily
kubectl set env deployment/intelgraph-server -n summit-production DB_POOL_MAX=50

# Restart to apply
kubectl rollout restart deployment/intelgraph-server -n summit-production

# Monitor connections
watch 'psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"'
```

**Root cause investigation**: Check for connection leaks, review recent code changes

---

### Scenario: Redis Cache Failure

**Symptoms**: Elevated database load, slower response times

**Immediate fix**:
```bash
# Check Redis health
kubectl exec -n summit-production deploy/redis -- redis-cli ping

# If unhealthy, restart Redis
kubectl rollout restart deployment/redis -n summit-production

# Clear cache if corrupted
kubectl exec -n summit-production deploy/redis -- redis-cli FLUSHALL
```

---

### Scenario: Authentication Service Down

**Symptoms**: 401/403 errors, unable to log in

**Immediate fix**:
```bash
# Check auth service
kubectl get pods -n summit-production -l app=auth-service

# Check JWT secret
kubectl get secret jwt-secret -n summit-production -o jsonpath='{.data.secret}' | base64 -d | wc -c

# Restart auth service
kubectl rollout restart deployment/auth-service -n summit-production
```

---

### Scenario: Elevated Error Rate (No Clear Cause)

**Symptoms**: > 5% error rate, no obvious deployment trigger

**Investigation steps**:
```bash
# Check for upstream dependency issues
scripts/health/check-dependencies.sh

# Review error distribution
kubectl logs -n summit-production -l app=intelgraph-server | grep ERROR | cut -d' ' -f4- | sort | uniq -c | sort -rn | head -20

# Check for quota/rate limiting
scripts/monitoring/check-quotas.sh

# Check for resource exhaustion
kubectl top pods -n summit-production
kubectl top nodes
```

---

## Post-Incident Activities

### Immediate (Within 24 hours)

1. **Create incident report**
   - Timeline of events
   - Actions taken
   - Impact assessment
   - Evidence links

2. **Update incident tracking**
   ```bash
   # Log incident to tracking system
   scripts/incidents/log-incident.sh \
     --severity SEV-1 \
     --summary "Brief description" \
     --duration "2h 15m" \
     --affected-users "12,000"
   ```

### Short-term (Within 48 hours)

1. **Conduct post-mortem**
   - Blameless review
   - Identify root cause
   - Document lessons learned
   - Create action items

2. **Update runbooks**
   - Document new scenarios
   - Improve procedures
   - Update automation

### Long-term (Within 1 week)

1. **Implement preventive measures**
   - Add monitoring/alerting
   - Improve automation
   - Update architecture (if needed)

2. **Track remediation items**
   - Create JIRA tickets
   - Assign ownership
   - Set deadlines

---

## Escalation Contacts

| Role | Primary | Secondary | PagerDuty |
|------|---------|-----------|-----------|
| Platform Lead | TBD | TBD | @platform-oncall |
| Security Lead | TBD | TBD | @security-oncall |
| Database Admin | TBD | TBD | @dba-oncall |
| Network Engineer | TBD | TBD | @network-oncall |
| CTO | TBD | TBD | (emergency only) |

---

## Compliance & Audit Requirements

For compliance (SOC2, ISO 27001, etc.), ensure:

1. **All incidents are logged** in the compliance evidence system
   ```bash
   scripts/compliance/log-incident.sh --incident-id <ID>
   ```

2. **Evidence is preserved** for audit trail
   - Logs retained for 2 years
   - Incident reports archived
   - Post-mortems documented

3. **Controls are verified** after remediation
   ```bash
   # Verify controls are restored
   scripts/compliance/verify-controls.sh
   ```

---

## Related Runbooks

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [ROLLBACK.md](./ROLLBACK.md) - Rollback procedures
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - DR procedures
- [SECRET_ROTATION.md](./SECRET_ROTATION.md) - Secret rotation procedures

---

**Last Updated**: 2026-01-02
**Owner**: Platform Engineering Team
**Review Cycle**: Quarterly (after major incidents)
