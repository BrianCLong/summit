# Safe Mutations Rollback Plan

**Priority: P0 - Critical System Recovery**
**Expected Recovery Time: < 5 minutes**

## 🚨 Emergency Rollback (Fast Path)

### Immediate Actions (< 2 minutes)

1. **Feature Flag Rollback**

   ```bash
   # Emergency bypass - use only if absolutely necessary
   kubectl set env deployment/intelgraph-api PQ_PHASE=log PQ_BYPASS=1

   # Wait for pods to restart
   kubectl rollout status deployment/intelgraph-api --timeout=60s
   ```

2. **OPA Policy Emergency Override**

   ```bash
   # Push emergency approval policy (2-hour TTL)
   curl -X PUT "$OPA_BUNDLE_URL/emergency-override" \
     -H "Authorization: Bearer $OPA_TOKEN" \
     -d @ops/emergency-override-bundle.tar.gz

   # Verify policy loaded
   curl -X GET "$OPA_BUNDLE_URL/status" | jq '.bundles["emergency-override"]'
   ```

### Verification (< 1 minute)

```bash
# Test mutation flow works
curl -X POST "$API/graphql" \
  -H "Content-Type: application/json" \
  -H "X-Tenant: demo" \
  -d '{"query":"mutation { SafeNoop }"}'

# Should succeed without persisted query requirement
```

## 🔄 Staged Rollback (Controlled Path)

### Phase 1: Policy Softening (2-3 minutes)

1. **Reduce Budget Enforcement**

   ```sql
   -- Temporarily raise canary limits by 20%
   UPDATE budget_limits
   SET daily_usd_limit = daily_usd_limit * 1.2,
       monthly_usd_limit = monthly_usd_limit * 1.2
   WHERE tenant_id IN ('demo', 'test', 'maestro-internal')
     AND environment = 'canary';

   -- Log the change
   INSERT INTO audit_log (action, details, reason, created_by)
   VALUES ('budget_adjustment',
           jsonb_build_object('multiplier', 1.2, 'tenants', ARRAY['demo','test','maestro-internal']),
           'Emergency rollback - temporary budget increase',
           'system');
   ```

2. **Disable Four-Eyes for Low-Risk Operations**

   ```bash
   # Update OPA bundle with relaxed approval rules
   cat > /tmp/relaxed-approval.rego <<EOF
   package approval

   requires_4eyes := false {
       input.est_usd <= 10
       not input.risk_tag in high_risk_tags
   }

   high_risk_tags := ["bulk_delete", "purge", "cross_tenant_move", "schema_change"]
   EOF

   # Deploy with 4-hour TTL
   opa build -b /tmp/relaxed-approval.rego -o /tmp/relaxed-bundle.tar.gz
   curl -X PUT "$OPA_BUNDLE_URL/rollback-relaxed" \
     -H "Authorization: Bearer $OPA_TOKEN" \
     -d @/tmp/relaxed-bundle.tar.gz
   ```

### Phase 2: Deployment Rollback (3-5 minutes)

1. **Blue-Green Switch Back**

   ```bash
   # Switch traffic back to previous deployment
   kubectl patch service intelgraph-api -p \
     '{"spec":{"selector":{"version":"blue"}}}'

   # Verify traffic routing
   kubectl get service intelgraph-api -o jsonpath='{.spec.selector.version}'
   ```

2. **Worker Queue Drainage**

   ```bash
   # Pause workers to prevent new job processing
   curl -X POST "$BULL_BOARD_URL/api/queues/reconcile/pause" \
     -H "Authorization: Bearer $ADMIN_TOKEN"

   curl -X POST "$BULL_BOARD_URL/api/queues/canary-escalate/pause" \
     -H "Authorization: Bearer $ADMIN_TOKEN"

   # Wait for active jobs to complete (max 2 minutes)
   timeout 120 bash -c 'while [[ $(redis-cli GET "bull:reconcile:active" | wc -l) -gt 0 ]]; do sleep 5; done'
   ```

### Phase 3: Data Integrity Recovery (5-10 minutes)

1. **Compensation Log Replay**

   ```bash
   # Replay last 50 operations if data corruption suspected
   node scripts/comp-log-replayer.js \
     --operations=50 \
     --dry-run=false \
     --reason="rollback-compensation" \
     --approve-destructive

   # Monitor progress
   tail -f logs/comp-log-replay.log
   ```

2. **Budget Ledger Reconciliation**

   ```sql
   -- Recalculate daily spend for affected tenants
   SELECT reconcile_daily_budget('demo', CURRENT_DATE);
   SELECT reconcile_daily_budget('test', CURRENT_DATE);
   SELECT reconcile_daily_budget('maestro-internal', CURRENT_DATE);

   -- Verify reconciliation results
   SELECT tenant_id, daily_spent_usd, daily_limit_usd,
          (daily_spent_usd / daily_limit_usd) as utilization_pct
   FROM budget_status
   WHERE date_calculated = CURRENT_DATE
     AND tenant_id IN ('demo', 'test', 'maestro-internal');
   ```

## 🔍 Post-Rollback Verification

### Health Checks

```bash
# API health
curl -f "$API/health" || echo "API unhealthy"

# Database connectivity
psql -c "SELECT 1;" || echo "DB connection failed"

# Redis rate limiting
redis-cli ping || echo "Redis unavailable"

# Neo4j graph database
curl -u neo4j:$NEO4J_PASSWORD "$NEO4J_URL/db/data/" || echo "Neo4j unavailable"
```

### Functional Tests

```bash
# Run smoke tests in rollback mode
PQ_BYPASS=1 ./ops/post-deploy-smoke-tests.sh

# Test core mutations work
curl -X POST "$API/graphql" \
  -H "Content-Type: application/json" \
  -H "X-Tenant: demo" \
  -d '{"query":"mutation { createEntity(name: \"rollback-test\") { id } }"}'
```

## 📊 Monitoring During Rollback

### Key Metrics to Watch

```promql
# Error rate should decrease
rate(http_requests_total{status=~"5.."}[5m])

# Latency should normalize
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Budget enforcement errors should drop
rate(budget_enforcement_errors_total[5m])

# Queue depth should drain
bull_queue_active_jobs{queue="reconcile"}
bull_queue_active_jobs{queue="canary-escalate"}
```

### Alert Silencing

```bash
# Silence rollback-related alerts for 1 hour
curl -X POST "$ALERTMANAGER_URL/api/v1/silences" \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {"name": "alertname", "value": "BudgetEnforcementDown"},
      {"name": "alertname", "value": "PersistentQueryViolation"}
    ],
    "startsAt": "'$(date -Iseconds)'",
    "endsAt": "'$(date -d '+1 hour' -Iseconds)'",
    "createdBy": "ops-rollback",
    "comment": "Safe Mutations rollback in progress"
  }'
```

## 🔒 Security Considerations

### Emergency Access

- Emergency OPA bundle has 2-hour TTL maximum
- All override actions logged to audit trail
- FinOps team notified of budget limit changes
- RBAC bypass requires dual approval

### Data Protection

- Compensation log maintains immutable audit trail
- Database snapshots taken before major changes
- PII redaction remains active during rollback
- Admin overrides expire automatically

## 📞 Escalation Contacts

### Immediate Response Team

- **On-Call SRE**: `@sre-oncall` (Slack), +1-555-SRE-HELP
- **Platform Engineering**: `@platform-team`
- **Security Team**: `@security-incidents` (for policy overrides)

### Decision Makers

- **Engineering Manager**: Jane Smith (`@jane.smith`)
- **Principal Engineer**: Alex Johnson (`@alex.johnson`)
- **FinOps Lead**: Chris Brown (`@chris.brown`) (for budget changes)

## 📝 Post-Incident Actions

1. **Root Cause Analysis**
   - Review logs and metrics during incident window
   - Document timeline of events and decisions
   - Identify prevention measures

2. **Cleanup Tasks**
   - Revert temporary budget increases
   - Remove emergency OPA bundles
   - Clear alert silences
   - Reset feature flags to intended state

3. **Communication**
   - Post-mortem meeting within 24 hours
   - Stakeholder update with lessons learned
   - Documentation updates based on findings

---

**Version**: 1.0  
**Last Updated**: 2025-09-07  
**Next Review**: 2025-10-07  
**Owner**: Platform Engineering Team
