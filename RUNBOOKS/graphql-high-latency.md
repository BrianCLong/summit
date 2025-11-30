# Runbook: GraphQL High Latency

**Alert**: `GraphQLHighLatency` or `GraphQLModerateLatency`
**Severity**: SEV1 (p95 > 2s) or SEV2 (p95 > 1s)
**Component**: graphql-gateway

---

## Symptoms

- GraphQL API p95 latency > threshold for sustained period
- User reports of slow page loads
- Increased error rates from client timeouts
- Alert fired in #alerts-critical or #alerts-warning

---

## Quick Response (First 5 Minutes)

### 1. Check Current Latency

```bash
# Prometheus query for current p95 latency
curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(graphql_query_duration_ms_bucket[5m]))by(le,operation))'

# Or use Grafana dashboard
open http://localhost:3001/d/graphql-api-comprehensive
```

### 2. Identify Slow Operations

```bash
# Top 10 slowest operations
curl 'http://localhost:9090/api/v1/query?query=topk(10,histogram_quantile(0.95,sum(rate(graphql_query_duration_ms_bucket[5m]))by(le,operation)))'
```

### 3. Check for Recent Changes

```bash
# Recent deployments
kubectl rollout history deployment/graphql-gateway

# Recent config changes
git log --oneline --since="1 hour ago" -- apps/gateway/
```

### 4. Check Downstream Dependencies

```bash
# Neo4j latency
curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(neo4j_query_duration_ms_bucket[5m]))by(le))'

# PostgreSQL latency
curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(postgres_query_duration_ms_bucket[5m]))by(le))'

# Redis latency
curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(redis_operation_duration_ms_bucket[5m]))by(le))'
```

---

## Diagnosis

### Scenario 1: Specific Query Slow

**Indicators**:
- Only 1-2 operations have high latency
- Others are normal

**Actions**:
1. Find slow query in Jaeger:
   ```bash
   open "http://localhost:16686/search?service=graphql-gateway&operation=<operation-name>&minDuration=2s"
   ```

2. Analyze trace for bottlenecks:
   - Look for slow resolver spans
   - Check database query times
   - Identify N+1 query patterns

3. Check query complexity:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=graphql_query_complexity{operation="<operation-name>"}'
   ```

**Mitigation**:
- Enable persisted queries if not already
- Add caching for expensive resolvers
- Optimize database queries
- Consider deprecating overly complex operations

### Scenario 2: All Queries Slow

**Indicators**:
- p95 latency up across all operations
- Downstream database latency also high

**Actions**:
1. Check database load:
   ```bash
   # Neo4j active queries
   kubectl exec -it neo4j-0 -- cypher-shell "CALL dbms.listQueries() YIELD query, elapsedTimeMillis WHERE elapsedTimeMillis > 1000 RETURN query LIMIT 20;"

   # PostgreSQL active queries
   kubectl exec -it postgresql-0 -- psql -U postgres -c "SELECT pid, query, state, wait_event FROM pg_stat_activity WHERE state = 'active';"
   ```

2. Check resource saturation:
   ```bash
   # CPU/Memory pressure
   kubectl top pods -l app=graphql-gateway
   kubectl top pods -l app=neo4j
   kubectl top pods -l app=postgresql
   ```

3. Check network latency:
   ```bash
   # Inter-pod latency
   kubectl exec -it graphql-gateway-0 -- ping neo4j-0.neo4j.svc.cluster.local
   ```

**Mitigation**:
- Scale up database resources
- Add read replicas if applicable
- Enable connection pooling
- Consider circuit breakers for degraded dependencies

### Scenario 3: Recent Deployment Caused Regression

**Indicators**:
- Latency spiked after recent deployment
- Annotation in Grafana shows deployment time

**Actions**:
1. Review deployment changes:
   ```bash
   git diff HEAD~1 HEAD -- apps/gateway/
   ```

2. Check for new slow resolvers or queries

3. Review dependency version changes

**Mitigation**:
- Rollback immediately:
   ```bash
   kubectl rollout undo deployment/graphql-gateway
   ```

- Fix issue and redeploy with proper load testing

### Scenario 4: Traffic Spike

**Indicators**:
- Request rate 2-3x normal
- All services showing increased latency
- Metrics show request rate spike

**Actions**:
1. Check request rate:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=sum(rate(graphql_requests_total[5m]))'
   ```

2. Identify source:
   - Check access logs for user agents
   - Look for single user/IP with high volume
   - Check for potential DDoS

**Mitigation**:
- Scale horizontally:
   ```bash
   kubectl scale deployment graphql-gateway --replicas=5
   ```

- Enable rate limiting per user/IP
- Activate CDN caching if applicable
- Block abusive clients

---

## Resolution Checklist

- [ ] Latency returned to normal (p95 < 500ms preferred, < 1s acceptable)
- [ ] Root cause identified
- [ ] Mitigation applied
- [ ] Monitoring shows sustained improvement for 30+ minutes
- [ ] Stakeholders notified of resolution
- [ ] Incident postmortem scheduled

---

## Prevention

### Short-term (Complete within 24h)

- [ ] Add missing database indexes
- [ ] Optimize identified slow queries
- [ ] Enable query cost limits
- [ ] Add caching for expensive operations

### Long-term (Complete within 2 weeks)

- [ ] Implement query complexity limits
- [ ] Add automated performance regression testing
- [ ] Set up SLO dashboard with error budgets
- [ ] Document query optimization best practices

---

## Escalation

If latency remains above threshold after 30 minutes:

1. **Page SRE Lead**: #sre-oncall
2. **Engage Database Team**: For Neo4j/PostgreSQL issues
3. **Consider Maintenance Window**: If schema changes needed

---

## Post-Incident

1. **Create Postmortem**: Use template at `RUNBOOKS/postmortem_template.md`
2. **File Bugs**: For each action item
3. **Update Runbook**: With lessons learned
4. **Review SLOs**: Adjust if needed

---

## Related Resources

- **Dashboard**: http://localhost:3001/d/graphql-api-comprehensive
- **Traces**: http://localhost:16686
- **Alerts**: http://localhost:9093
- **Playbook**: RUNBOOKS/INCIDENT_RESPONSE_PLAYBOOK.md
