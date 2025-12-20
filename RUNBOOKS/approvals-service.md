# Approvals Service Runbook

> **Service**: `approvals-service`
> **Team**: Platform / CompanyOS
> **On-Call**: #platform-oncall
> **Dashboard**: [Grafana - Approvals Service](http://grafana:3001/d/approvals-service)

## Overview

The Approvals Service provides policy-gated approval workflows for high-risk operations in Summit/CompanyOS. It integrates with:

- **OPA (Open Policy Agent)**: Policy evaluation for approval requirements
- **PostgreSQL**: Persistent storage for approval requests and decisions
- **Provenance Ledger**: Signed receipts for audit trail

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client    │────▶│ Approvals Service │────▶│  PostgreSQL │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              ┌──────────┐    ┌────────────────┐
              │   OPA    │    │ Provenance Svc │
              └──────────┘    └────────────────┘
```

## Health Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Basic liveness | `{"status": "healthy"}` |
| `GET /health/ready` | Full readiness | `{"ready": true, "checks": {...}}` |
| `GET /health/live` | Kubernetes liveness | `{"live": true}` |
| `GET /metrics` | Prometheus metrics | Prometheus text format |

---

## Alert Response Procedures

### ApprovalsHighLatency / ApprovalsLatencyCritical

**Severity**: Warning / Critical
**Impact**: Slow approval workflows, potential timeouts

#### Symptoms
- p95 latency > 1.5s (warning) or > 3s (critical)
- Users report slow approval UI
- Timeout errors in client logs

#### Diagnosis

1. **Check dashboard** for latency breakdown:
   ```
   http://grafana:3001/d/approvals-service
   ```

2. **Identify slow endpoints**:
   ```promql
   histogram_quantile(0.95,
     sum(rate(approvals_http_request_duration_seconds_bucket[5m])) by (le, route)
   )
   ```

3. **Check OPA latency**:
   ```promql
   histogram_quantile(0.95,
     sum(rate(approvals_opa_latency_seconds_bucket[5m])) by (le)
   )
   ```

4. **Check database latency**:
   ```promql
   histogram_quantile(0.95,
     sum(rate(approvals_db_query_duration_seconds_bucket[5m])) by (le, operation)
   )
   ```

#### Mitigation

1. **If OPA is slow**:
   - Check OPA pod resources: `kubectl top pods -l app=opa`
   - Restart OPA if needed: `kubectl rollout restart deployment/opa`
   - Check policy bundle size and complexity

2. **If database is slow**:
   - Check connection pool: `approvals_db_connections_active`
   - Look for long-running queries in PostgreSQL
   - Consider adding indexes or query optimization

3. **If service is overloaded**:
   - Scale horizontally: `kubectl scale deployment/approvals-service --replicas=3`
   - Check for traffic spikes

#### Resolution Verification
- p95 latency returns below 1s
- No timeout errors in logs

---

### ApprovalsHighErrorRate / ApprovalsErrorRateCritical

**Severity**: Warning / Critical
**Impact**: Failed approval requests, blocked workflows

#### Symptoms
- Error rate > 0.5% (warning) or > 1% (critical)
- 5xx errors in API responses
- Failed approval submissions

#### Diagnosis

1. **Check error distribution**:
   ```promql
   sum(rate(approvals_http_requests_total{status_code=~"5.."}[5m])) by (route, status_code)
   ```

2. **Check application logs**:
   ```bash
   kubectl logs -l app=approvals-service --tail=100 | grep -i error
   ```

3. **Check dependent services**:
   - OPA health: `curl http://opa:8181/health`
   - Database connectivity
   - Provenance service health

#### Mitigation

1. **Database connection issues**:
   ```bash
   # Check PostgreSQL
   kubectl exec -it postgres-0 -- psql -U summit -c "SELECT count(*) FROM pg_stat_activity;"
   ```

2. **OPA unavailable**: See [ApprovalsOPAUnavailable](#approvalsopaunavailable)

3. **Application errors**:
   - Check for recent deployments
   - Review error stack traces
   - Consider rollback if recent change

#### Resolution Verification
- Error rate returns below 0.5%
- All health checks pass

---

### ApprovalsOPAUnavailable

**Severity**: Critical
**Impact**: All policy evaluations fail, approvals blocked

#### Symptoms
- OPA errors increasing
- All approval requests failing with policy errors
- `approvals_opa_errors_total{error_type="unavailable"}` increasing

#### Diagnosis

1. **Check OPA pods**:
   ```bash
   kubectl get pods -l app=opa
   kubectl describe pod <opa-pod>
   ```

2. **Check OPA health directly**:
   ```bash
   kubectl exec -it <approvals-pod> -- curl -s http://opa:8181/health
   ```

3. **Check network policies**:
   ```bash
   kubectl get networkpolicies
   ```

#### Mitigation

1. **Restart OPA**:
   ```bash
   kubectl rollout restart deployment/opa
   ```

2. **If OPA crashlooping**:
   - Check logs: `kubectl logs -l app=opa --previous`
   - Check memory/CPU limits
   - Check policy bundle validity

3. **Emergency: Enable fail-open mode** (use with caution):
   ```bash
   kubectl set env deployment/approvals-service OPA_FAIL_CLOSED=false
   ```
   ⚠️ This allows requests without policy evaluation. Re-enable ASAP.

#### Resolution Verification
- OPA pods running and healthy
- `approvals_opa_errors_total` stops increasing
- Re-enable `OPA_FAIL_CLOSED=true`

---

### ApprovalsDatabaseErrors

**Severity**: Critical
**Impact**: Cannot create or update approval requests

#### Symptoms
- Database error count increasing
- 500 errors on API calls
- "connection refused" or "too many connections" in logs

#### Diagnosis

1. **Check database status**:
   ```bash
   kubectl exec -it postgres-0 -- pg_isready
   ```

2. **Check connections**:
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```

3. **Check for locks**:
   ```sql
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

#### Mitigation

1. **Connection pool exhausted**:
   - Increase pool size in config
   - Kill idle connections:
     ```sql
     SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE state = 'idle' AND query_start < now() - interval '10 minutes';
     ```

2. **Database overloaded**:
   - Scale read replicas
   - Review slow queries
   - Add missing indexes

3. **Database down**:
   - Check PostgreSQL operator/StatefulSet
   - Failover to replica if available

---

### ApprovalsProvenanceErrors

**Severity**: Warning
**Impact**: Audit trail incomplete, but approvals still work

#### Symptoms
- Provenance receipt creation failing
- `approvals_provenance_errors_total` increasing
- Receipts missing from audit queries

#### Diagnosis

1. **Check provenance service**:
   ```bash
   curl http://provenance-service:3020/health
   ```

2. **Check approvals logs**:
   ```bash
   kubectl logs -l app=approvals-service | grep -i provenance
   ```

#### Mitigation

1. **Provenance service down**:
   - Restart provenance service
   - Check its dependencies (database, signing keys)

2. **Network issues**:
   - Verify service discovery
   - Check network policies

3. **Receipts are stored locally** as backup. Once provenance service recovers:
   - Receipts will be synced from local cache
   - Run reconciliation job if needed

---

### ApprovalsPendingBacklog

**Severity**: Warning
**Impact**: Business workflows may be blocked

#### Symptoms
- Large number of pending approvals (> 100)
- Users complaining about stuck workflows

#### Diagnosis

1. **Check pending requests by tenant**:
   ```promql
   sum(approvals_requests_active) by (tenant_id)
   ```

2. **Check request age distribution**:
   ```sql
   SELECT
     tenant_id,
     count(*),
     avg(extract(epoch from (now() - created_at))) as avg_age_seconds
   FROM approval_requests
   WHERE status = 'pending'
   GROUP BY tenant_id;
   ```

#### Mitigation

1. **Alert approvers**: Notify via Slack/email that approvals are pending

2. **Check for stuck requests**:
   - Look for requests with policy errors
   - Check if required approvers are available

3. **Extend expiration** if needed:
   ```sql
   UPDATE approval_requests
   SET expires_at = expires_at + interval '24 hours'
   WHERE status = 'pending' AND expires_at < now() + interval '1 hour';
   ```

---

### ApprovalsServiceDown

**Severity**: Critical
**Impact**: All approval workflows blocked

#### Immediate Actions

1. **Check pod status**:
   ```bash
   kubectl get pods -l app=approvals-service
   kubectl describe pod <pod-name>
   ```

2. **Check recent events**:
   ```bash
   kubectl get events --sort-by=.lastTimestamp | grep approvals
   ```

3. **Check node status**:
   ```bash
   kubectl get nodes
   ```

#### Common Causes

1. **OOM killed**: Increase memory limits
2. **Crashloop**: Check logs for startup errors
3. **Image pull failure**: Check registry access
4. **Node failure**: Reschedule to healthy node

#### Restart Procedure

```bash
# Force restart
kubectl rollout restart deployment/approvals-service

# Watch rollout
kubectl rollout status deployment/approvals-service

# If stuck, check events
kubectl describe deployment/approvals-service
```

---

## Manual Override Procedure

In emergency situations where the approvals service is unavailable but a critical operation must proceed:

### Prerequisites

- Two senior engineers or admins must be present (dual control)
- Incident ticket must be created
- Post-incident review scheduled within 24 hours

### Steps

1. **Create manual approval record** in database:
   ```sql
   INSERT INTO approval_requests (
     id, tenant_id, resource_type, resource_id, resource_data,
     action, requestor_id, requestor_data, status,
     justification, created_at, finalized_at
   ) VALUES (
     gen_random_uuid(),
     'tenant-id',
     'emergency-override',
     'operation-id',
     '{"description": "Emergency manual approval"}',
     'emergency-override',
     'admin-user-id',
     '{"id": "admin-user-id", "email": "admin@company.io", "roles": ["admin"]}',
     'approved',
     'Emergency override - Incident #INC-123',
     now(),
     now()
   );
   ```

2. **Create manual provenance receipt**:
   ```sql
   INSERT INTO provenance_receipts (
     id, approval_id, tenant_id, actor_id,
     action_type, input_hash, policy_version,
     signature, key_id
   ) VALUES (
     'manual-receipt-' || gen_random_uuid(),
     '<approval-id-from-above>',
     'tenant-id',
     'admin-user-id',
     'emergency-override',
     sha256('emergency override'),
     'manual-v1',
     'manual-dual-control',
     'manual'
   );
   ```

3. **Document in incident ticket**:
   - Both approving engineers
   - Reason for override
   - What operation was approved
   - Link to manual records

4. **Post-incident**: Review and backfill proper audit trail

---

## Maintenance Procedures

### Database Maintenance

**Monthly**: Vacuum and analyze
```sql
VACUUM ANALYZE approval_requests;
VACUUM ANALYZE approval_decisions;
VACUUM ANALYZE provenance_receipts;
```

**Weekly**: Check index health
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%pkey%';
```

### Log Rotation

Logs are automatically rotated by the container runtime. Ensure:
- Log retention: 7 days
- Log level: `info` in production, `debug` for troubleshooting

### Backup Verification

Weekly: Verify backup restoration works
```bash
# Restore to test environment
pg_restore -d summit_approvals_test /backups/latest.dump

# Verify data integrity
psql -d summit_approvals_test -c "SELECT count(*) FROM approval_requests;"
```

---

## Contacts

| Role | Contact |
|------|---------|
| Service Owner | platform-team@company.io |
| On-Call | #platform-oncall (Slack) |
| Escalation | VP Engineering |
| Security | security@company.io |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2024-01-15 | Platform Team | Initial version |
