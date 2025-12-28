# Summit MVP-3 Incident Response Runbook

## Incident Severity Levels

| Level | Definition             | Response Time | Examples                           |
| ----- | ---------------------- | ------------- | ---------------------------------- |
| SEV1  | Critical system outage | 15 minutes    | Complete service down, data breach |
| SEV2  | Major degradation      | 1 hour        | High error rates, partial outage   |
| SEV3  | Minor impact           | 4 hours       | Single component issues            |
| SEV4  | Low priority           | 24 hours      | Cosmetic issues, minor bugs        |

## Quick Reference

### High Error Rate (>5%)

```bash
# 1. Check current error rate
curl -s localhost:9090/api/v1/query?query=sum(rate(http_requests_total{status=~"5.."}[5m]))/sum(rate(http_requests_total[5m]))*100

# 2. Identify error sources
curl -s localhost:9090/api/v1/query?query=topk(5,sum(rate(http_requests_total{status=~"5.."}[5m]))by(handler))

# 3. Check recent deployments
git log --oneline -10

# 4. Review logs for patterns
kubectl logs -l app=summit-api --since=30m | grep -i error | head -50

# 5. If caused by recent deploy, rollback
kubectl rollout undo deployment/summit-api
```

### High Latency (P95 > 2s)

```bash
# 1. Check slow endpoints
curl -s localhost:9090/api/v1/query?query=topk(5,histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(le,handler)))

# 2. Check database query times
curl -s localhost:9090/api/v1/query?query=topk(5,histogram_quantile(0.95,sum(rate(db_query_duration_seconds_bucket[5m]))by(le,query_type)))

# 3. Check connection pool status
psql -c "SELECT count(*) as active, max_conn FROM pg_stat_activity, (SELECT setting::int FROM pg_settings WHERE name='max_connections') as mc GROUP BY max_conn;"

# 4. Check for lock contention
psql -c "SELECT pid, query, state, wait_event_type FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"
```

### Governance Service Degraded

```bash
# 1. Check governance service health
curl -s http://localhost:3000/health/governance

# 2. Check OPA status
curl -s http://opa:8181/health

# 3. Review governance verdict metrics
curl -s localhost:9090/api/v1/query?query=governance_verdicts_total

# 4. Check policy loading
curl -s http://opa:8181/v1/policies | jq '.result | length'

# 5. Restart governance service if needed
kubectl rollout restart deployment/governance-service
```

### Provenance Chain Failure

**CRITICAL: This is a compliance-impacting event**

```bash
# 1. Immediately alert security team
# 2. Check chain verification status
curl -s http://localhost:3000/api/v1/provenance/verify

# 3. Identify affected records
psql -c "SELECT * FROM provenance_ledger WHERE verified = false ORDER BY created_at DESC LIMIT 20;"

# 4. Check chain integrity
curl -s http://localhost:3000/api/v1/provenance/audit

# 5. Document all findings for compliance
# Create incident report in audit/incidents/
```

### Tenant Isolation Violation

**CRITICAL: Security incident requiring immediate action**

```bash
# 1. IMMEDIATELY revoke affected sessions
psql -c "DELETE FROM sessions WHERE tenant_id IN (SELECT DISTINCT tenant_id FROM isolation_violations);"

# 2. Block affected API keys
curl -X POST http://localhost:3000/api/v1/admin/security/lockdown \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"reason": "isolation_violation"}'

# 3. Capture forensic data
./scripts/capture-forensics.sh

# 4. Notify security team and legal
# 5. Prepare breach notification if required
```

### Database Connection Exhaustion

```bash
# 1. Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# 2. Identify connection hogs
psql -c "SELECT application_name, count(*) FROM pg_stat_activity GROUP BY 1 ORDER BY 2 DESC;"

# 3. Kill idle connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '30 minutes';"

# 4. Scale API replicas if needed
kubectl scale deployment/summit-api --replicas=5
```

## Escalation Matrix

| Severity | Primary          | Secondary        | Executive |
| -------- | ---------------- | ---------------- | --------- |
| SEV1     | On-call Engineer | Engineering Lead | CTO       |
| SEV2     | On-call Engineer | Team Lead        | -         |
| SEV3     | On-call Engineer | -                | -         |
| SEV4     | Ticketed         | -                | -         |

## Post-Incident

1. **Within 24 hours**: Create incident report
2. **Within 48 hours**: Complete root cause analysis
3. **Within 1 week**: Implement preventive measures
4. **Within 2 weeks**: Update runbooks and documentation

## Incident Report Template

```markdown
# Incident Report: [INCIDENT-YYYY-MM-DD-NNN]

## Summary

- **Severity**: SEV[1-4]
- **Duration**: [start] - [end]
- **Impact**: [user/system impact]

## Timeline

- HH:MM - Event detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Mitigation applied
- HH:MM - Service restored

## Root Cause

[Description of root cause]

## Resolution

[Steps taken to resolve]

## Action Items

- [ ] [Action 1]
- [ ] [Action 2]

## Lessons Learned

[What we learned]
```
