# Runbook: GraphQL High Error Rate

**Alert**: `GraphQLHighErrorRate` or `GraphQLModerateErrorRate`
**Severity**: SEV1 (>5%) or SEV2 (>2%)
**Component**: graphql-gateway

---

## Symptoms

- GraphQL error rate > threshold
- Increased 5xx responses
- User reports of failed operations
- Alert fired in #alerts-critical or #alerts-warning

---

## Quick Response (First 5 Minutes)

### 1. Check Current Error Rate

```bash
# Error rate by operation
curl 'http://localhost:9090/api/v1/query?query=(sum(rate(graphql_requests_total{status="error"}[5m]))by(operation)/sum(rate(graphql_requests_total[5m]))by(operation))*100'
```

### 2. Identify Error Types

```bash
# Top error types
curl 'http://localhost:9090/api/v1/query?query=topk(10,sum(increase(graphql_errors_total[5m]))by(errorType))'

# View in Grafana dashboard (Error Types Breakdown pie chart)
open http://localhost:3001/d/graphql-api-comprehensive
```

### 3. Check Recent Logs

```bash
# Recent errors from gateway
kubectl logs -l app=graphql-gateway --tail=100 --since=10m | grep -i error

# Or query Loki
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service="graphql-gateway", level="error"}' \
  --data-urlencode "start=$(date -u -d '10 minutes ago' +%s)000000000" \
  --data-urlencode "end=$(date -u +%s)000000000" | jq .
```

---

## Diagnosis by Error Type

### 1. INTERNAL_SERVER_ERROR (5xx)

**Indicators**:
- Errors with code `INTERNAL_SERVER_ERROR`
- Stack traces in logs
- Unhandled exceptions

**Actions**:
1. Find exception in logs:
   ```bash
   kubectl logs -l app=graphql-gateway --tail=500 | grep -A 10 "INTERNAL_SERVER_ERROR"
   ```

2. Check if error is in gateway or downstream service:
   ```bash
   # Check Neo4j errors
   kubectl logs -l app=neo4j --tail=100 | grep -i error

   # Check PostgreSQL errors
   kubectl logs -l app=postgresql --tail=100 | grep -i error
   ```

3. Find affected traces:
   ```bash
   open "http://localhost:16686/search?service=graphql-gateway&tags=%7B%22error%22%3A%22true%22%7D"
   ```

**Mitigation**:
- If single resolver failing: Disable resolver or add fallback
- If database connection issue: Check connection pool, restart pods
- If recent deployment: Rollback immediately
  ```bash
  kubectl rollout undo deployment/graphql-gateway
  ```

### 2. UNAUTHENTICATED / FORBIDDEN

**Indicators**:
- Errors with code `UNAUTHENTICATED` or `FORBIDDEN`
- Auth service errors
- JWT validation failures

**Actions**:
1. Check auth service health:
   ```bash
   curl http://localhost:4000/health
   kubectl logs -l app=auth-service --tail=100
   ```

2. Verify JWT secret configuration:
   ```bash
   kubectl get secret graphql-gateway-secrets -o yaml | grep JWT_SECRET
   ```

3. Check for expired or malformed tokens in logs

**Mitigation**:
- If auth service down: Scale up or restart
- If JWT secret misconfigured: Fix and redeploy
- If mass token expiry: Investigate client token refresh logic

### 3. GRAPHQL_VALIDATION_FAILED

**Indicators**:
- Errors with code `GRAPHQL_VALIDATION_FAILED`
- Schema validation errors
- Client sending invalid queries

**Actions**:
1. Check recent schema changes:
   ```bash
   git log --oneline --since="1 day ago" -- packages/graphql/schema.graphql
   ```

2. Identify invalid queries:
   ```bash
   kubectl logs -l app=graphql-gateway | grep "GRAPHQL_VALIDATION_FAILED" | head -20
   ```

3. Check if specific client version affected

**Mitigation**:
- If schema change broke clients: Rollback schema change
- If client bug: Contact client teams to update
- Add schema deprecation warnings before breaking changes

### 4. PERSISTED_QUERY_NOT_FOUND

**Indicators**:
- Errors with code `PERSISTED_QUERY_NOT_FOUND`
- Clients using persisted queries
- Recent gateway deployment

**Actions**:
1. Check persisted query manifest:
   ```bash
   cat packages/graphql/persisted-queries.json | jq 'length'
   ```

2. Verify persisted queries loaded:
   ```bash
   kubectl logs -l app=graphql-gateway | grep "persisted queries loaded"
   ```

**Mitigation**:
- Rebuild persisted queries:
   ```bash
   pnpm persisted:build
   ```
- Redeploy gateway with updated manifest
- Consider allowing non-persisted queries temporarily

### 5. BAD_USER_INPUT

**Indicators**:
- Errors with code `BAD_USER_INPUT`
- Validation errors from resolvers
- User-submitted data issues

**Actions**:
1. Check which fields failing validation:
   ```bash
   kubectl logs -l app=graphql-gateway | grep "BAD_USER_INPUT" | jq '.context'
   ```

2. Identify if recent validation rule change

**Mitigation**:
- If overly strict validation: Relax rules
- If data quality issue: Add better client-side validation
- Provide clearer error messages to users

---

## Common Patterns

### Pattern 1: Cascading Failures

**Indicators**:
- Error rate starts in one service, spreads to others
- Multiple services showing errors
- Circuit breaker metrics spiking

**Actions**:
1. Identify origin service
2. Check service mesh/circuit breaker status
3. Isolate failing service

**Mitigation**:
- Enable circuit breakers if not active
- Fail fast instead of cascading
- Add fallback responses for degraded dependencies

### Pattern 2: Deployment-Related Errors

**Indicators**:
- Error spike coincides with deployment
- Grafana deployment annotation matches error spike

**Actions**:
1. Immediate rollback:
   ```bash
   kubectl rollout undo deployment/graphql-gateway
   kubectl rollout status deployment/graphql-gateway
   ```

2. Review deployment changes
3. Re-test in staging before next deploy

### Pattern 3: Resource Exhaustion

**Indicators**:
- OOM errors in logs
- Pod restarts
- Resource limits reached

**Actions**:
1. Check resource usage:
   ```bash
   kubectl top pods -l app=graphql-gateway
   kubectl describe pod <pod-name> | grep -A 5 "Conditions:"
   ```

2. Check for memory leaks in recent changes

**Mitigation**:
- Increase resource limits temporarily
- Scale horizontally
- Investigate and fix memory leak

---

## Resolution Checklist

- [ ] Error rate below 1% (target: <0.5%)
- [ ] Root cause identified
- [ ] Mitigation applied and verified
- [ ] No new errors for 15+ minutes
- [ ] Stakeholders notified
- [ ] Postmortem created

---

## Prevention

### Immediate (0-24h)

- [ ] Add missing error handling
- [ ] Improve error messages for users
- [ ] Add validation for problematic inputs
- [ ] Fix identified bugs

### Short-term (1-2 weeks)

- [ ] Add error budget alerts (before SLO violation)
- [ ] Implement circuit breakers for downstream services
- [ ] Add comprehensive input validation
- [ ] Improve test coverage for error paths

### Long-term (1-2 months)

- [ ] Implement retry logic with exponential backoff
- [ ] Add graceful degradation for non-critical features
- [ ] Chaos engineering tests for error scenarios
- [ ] Error rate SLO dashboard

---

## Escalation

If error rate remains above threshold after 20 minutes:

1. **Page Incident Commander**: #incident-response
2. **Engage Service Owners**: For downstream service issues
3. **Consider Failover**: To backup region if applicable

---

## Related Resources

- **Dashboard**: http://localhost:3001/d/graphql-api-comprehensive (Error Rate panel)
- **Error Logs**: Loki at http://localhost:3100
- **Traces**: http://localhost:16686 (filter by error=true)
- **Alerts**: http://localhost:9093
