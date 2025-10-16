# Safe Mutations Troubleshooting FAQ

## 🔍 Common Issues & Solutions

### Persisted Query Violations

#### **Q: I'm getting "Persisted queries required" errors after deployment**

**A:** Your client is sending raw GraphQL queries instead of persisted query hashes.

**Solution:**

1. Ensure your client uses `extensions.persistedQuery.sha256Hash` instead of raw `query` field
2. Verify the hash matches an entry in the Redis allowlist:
   ```bash
   redis-cli SISMEMBER "pq:allowlist" "your-hash-here"
   ```
3. Check if the hash was synced from CI artifacts:
   ```bash
   curl -s "$API/admin/pq/status" | jq '.hashes_loaded'
   ```

#### **Q: My persisted query hash is not in the allowlist**

**A:** The hash needs to be added during deployment or manually registered.

**Solution:**

1. **Automated (recommended):** Ensure your CI pipeline exports hashes to artifacts
2. **Manual override:** Add hash temporarily:
   ```bash
   redis-cli SADD "pq:allowlist" "your-hash-here"
   redis-cli EXPIRE "pq:allowlist" 86400  # 24h TTL
   ```
3. **Emergency bypass:** Use feature flag (requires approval):
   ```bash
   kubectl set env deployment/intelgraph-api PQ_BYPASS=1
   ```

### Four-Eyes Approval Issues

#### **Q: My mutation is stuck pending approval**

**A:** The operation requires four-eyes approval but doesn't have sufficient approvers.

**Solution:**

1. Check if your operation triggers approval requirements:
   - Risk tags: `destructive`, `bulk_delete`, `merge_entities`, `purge`, `cross_tenant_move`, `bulk_update`, `schema_change`, `data_export`
   - Cost estimate > $5 USD
2. Add approvers to your mutation variables:
   ```graphql
   mutation {
     yourMutation(approvers: ["user1", "user2"], ...)
   }
   ```
3. **Emergency bypass:** For critical operations, request policy override from FinOps team

#### **Q: How do I check who can approve my operation?**

**A:** Approvers must have the `FinOps Admin` or `Engineering Manager` RBAC role.

**Solution:**

1. Check available approvers:
   ```bash
   curl -s "$API/admin/approvers" | jq '.available_approvers'
   ```
2. Request approval from qualified team members via Slack `#finops-approvals`

### Budget & Cost Issues

#### **Q: My mutation was denied due to "Budget cap exceeded"**

**A:** Your tenant has hit its daily or monthly spending limit.

**Solution:**

1. Check current budget utilization:
   ```bash
   curl -s "$API/admin/budget/status?tenant=$TENANT_ID" | jq
   ```
2. **Temporary increase:** Request budget override from FinOps team
3. **Long-term:** Work with FinOps to adjust tenant limits based on usage patterns

#### **Q: Cost estimates seem inaccurate**

**A:** The cost estimator may need recalibration for certain operation types.

**Solution:**

1. Check recent estimation accuracy:
   ```bash
   curl -s "$API/admin/budget/accuracy" | jq '.variance_stats'
   ```
2. Report systematic underestimation to Platform team
3. **Workaround:** Add 20% buffer to estimated costs for graph-heavy operations

#### **Q: Reconciliation is lagging behind**

**A:** The budget reconciler worker may be overwhelmed or failing.

**Solution:**

1. Check reconciler queue health:
   ```bash
   curl -s "$BULL_BOARD_URL/api/queues/reconcile"
   ```
2. Monitor reconciliation SLO:
   ```promql
   reconciled_entries_total / ledger_entries_total
   ```
3. **Emergency:** Manually trigger reconciliation:
   ```bash
   curl -X POST "$API/admin/budget/reconcile" -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

### System Performance

#### **Q: Mutations are taking much longer than before**

**A:** Budget validation adds overhead; excessive latency may indicate issues.

**Solution:**

1. Check budget guard latency metrics:
   ```promql
   histogram_quantile(0.95, rate(mutation_latency_ms_bucket{stage="budget"}[5m]))
   ```
2. **Target:** p95 should be < 30ms
3. **Alert threshold:** Investigation needed if > 60ms for 15+ minutes
4. **Escalation:** Contact SRE if consistently above 100ms

#### **Q: Redis rate limiting errors**

**A:** Redis latency or connectivity issues affecting token bucket counters.

**Solution:**

1. Check Redis health:
   ```bash
   redis-cli ping
   redis-cli --latency-history -i 1
   ```
2. Monitor Redis latency SLO:
   ```promql
   redis_latency_p95_ms
   ```
3. **Target:** p95 < 5ms
4. **Escalation:** Page SRE if Redis unavailable or consistently > 10ms latency

### Admin & Override Issues

#### **Q: I can't create budget overrides in the Admin UI**

**A:** Override creation requires specific RBAC permissions.

**Solution:**

1. Verify you have `FinOps Admin` role in the system
2. Check override creation logs:
   ```bash
   curl -s "$API/admin/overrides/logs" | jq '.recent_attempts[]'
   ```
3. **Dual approval:** Some overrides may require second approver confirmation

#### **Q: My override expired but I still need it**

**A:** Overrides have maximum 24-hour duration for security.

**Solution:**

1. Create a new override with updated justification
2. For longer-term needs, work with Platform team to adjust base tenant limits
3. **Emergency extension:** Contact Engineering Manager for policy exception

### Data & Audit Issues

#### **Q: Budget calculations don't match my expectations**

**A:** There may be timing differences or reconciliation delays.

**Solution:**

1. Check if reconciliation is current:
   ```sql
   SELECT tenant_id, date_calculated, reconciled_at
   FROM budget_status
   WHERE tenant_id = 'your-tenant'
   ORDER BY date_calculated DESC LIMIT 7;
   ```
2. **Manual recalculation:**
   ```bash
   curl -X POST "$API/admin/budget/recalculate" \
     -d '{"tenant_id": "your-tenant", "date": "2025-09-07"}'
   ```

#### **Q: Audit trail is missing for certain operations**

**A:** Some operations may bypass audit logging during emergencies.

**Solution:**

1. Check audit completeness:
   ```sql
   SELECT operation_type, COUNT(*)
   FROM audit_log
   WHERE created_at >= CURRENT_DATE
   GROUP BY operation_type;
   ```
2. **Missing entries:** Check compensation logs for recovery
3. **Report gaps:** Contact Security team for audit investigation

## 🚨 Emergency Procedures

### Complete System Failure

1. **Immediate:** Enable emergency bypass
   ```bash
   kubectl set env deployment/intelgraph-api PQ_BYPASS=1 PQ_PHASE=log
   ```
2. **Alert:** Page SRE and Platform Engineering
3. **Communication:** Post in `#incidents` channel
4. **Recovery:** Follow rollback plan in `docs/runbooks/rollback-plan.md`

### Budget System Malfunction

1. **Immediate:** Push emergency OPA policy to disable enforcement
   ```bash
   curl -X PUT "$OPA_BUNDLE_URL/emergency-disable" -d @ops/emergency-opa-bundle.tar.gz
   ```
2. **Monitoring:** Silence budget-related alerts for 1 hour
3. **Recovery:** Investigate root cause, fix, and re-enable gradually

### Mass False Positive Denials

1. **Immediate:** Check for configuration drift or deployment issues
2. **Mitigation:** Temporarily raise canary limits by 50%
3. **Investigation:** Compare current vs. previous policy versions
4. **Recovery:** Rollback to known-good policy bundle

## 📞 Escalation Contacts

### Business Hours (9am-5pm EST)

- **Platform Engineering:** `@platform-team` (Slack)
- **FinOps Team:** `@finops-team` (budget/cost issues)
- **DevOps:** `@devops-team` (infrastructure/deployment)

### On-Call (24/7)

- **SRE:** `@sre-oncall` (Slack) | +1-555-SRE-HELP | PagerDuty
- **Security:** `@security-incidents` (policy/override issues)
- **Engineering Manager:** Jane Smith `@jane.smith` (major decisions)

### Vendor Support

- **Redis Enterprise:** Support case via portal (latency issues)
- **Grafana Cloud:** `support@grafana.com` (monitoring issues)
- **PagerDuty:** Incident escalation if on-call unresponsive

## 📚 Additional Resources

### Documentation

- **Runbooks:** `/docs/runbooks/` (rollback, troubleshooting procedures)
- **API Reference:** `/docs/api/safe-mutations.md`
- **Architecture:** `/docs/safe-mutations/architecture.md`

### Monitoring & Observability

- **Grafana Dashboard:** [Safe Mutations SLOs](https://grafana.intelgraph.dev/d/safe-mutations)
- **Alert Manager:** [Current Alerts](https://alerts.intelgraph.dev)
- **Bull Board:** [Worker Queues](https://bull.intelgraph.dev)

### Training Materials

- **Video Walkthrough:** [Safe Mutations Overview](https://docs.intelgraph.dev/videos/safe-mutations-intro)
- **Hands-on Lab:** [Testing Budget Controls](https://docs.intelgraph.dev/labs/budget-testing)
- **Policy Writing:** [OPA Best Practices](https://docs.intelgraph.dev/guides/opa-policies)

---

**Last Updated:** 2025-09-07  
**Next Review:** 2025-10-07  
**Maintained By:** Platform Engineering Team

**Found an issue not covered here?** Add it to our [FAQ Improvement Backlog](https://github.com/intelgraph/intelgraph/issues/new?template=faq-addition.md)
