# Runbook: Golden Path Failure

**Alert**: `GoldenPathBroken` or `GoldenPathDegraded`
**Severity**: SEV1 (success < 95%) or SEV2 (success < 98%)
**Component**: golden-path

---

## Overview

The "Golden Path" is our core user journey:
**Investigation → Entities → Relationships → Copilot → Results**

Success rate below threshold indicates a critical user experience degradation.

---

## Quick Response (First 5 Minutes)

### 1. Identify Failing Step

```bash
# Success rate by step
curl 'http://localhost:9090/api/v1/query?query=(sum(rate(golden_path_success_total[10m]))by(step)/(sum(rate(golden_path_success_total[10m]))by(step)+sum(rate(golden_path_errors_total[10m]))by(step)))*100'

# View in Grafana
open http://localhost:3001/d/graphql-api-comprehensive
```

### 2. Check Error Types for Failing Step

```bash
# Errors by type for specific step
curl 'http://localhost:9090/api/v1/query?query=sum(increase(golden_path_errors_total{step="<step-name>"}[10m]))by(errorType)'
```

### 3. Run Manual Smoke Test

```bash
# From project root
make smoke

# Or run smoke test script directly
node scripts/smoke-test.js
```

---

## Diagnosis by Step

### Step 1: `create_investigation`

**Operation**: CreateInvestigation mutation
**Dependencies**: PostgreSQL, Neo4j, auth service

**Quick Checks**:
```bash
# Check database connectivity
kubectl exec -it graphql-gateway-0 -- curl http://postgresql:5432
kubectl exec -it graphql-gateway-0 -- curl http://neo4j:7474

# Check auth service
curl http://localhost:4000/auth/health
```

**Common Issues**:
- Database connection pool exhausted
- Auth service down
- Validation failing (duplicate names, invalid input)

**Mitigation**:
```bash
# Scale up databases if connection limits reached
kubectl scale statefulset postgresql --replicas=2

# Restart auth service if unhealthy
kubectl rollout restart deployment/auth-service

# Check for schema changes that broke validation
git log --oneline --since="1 day ago" -- server/src/graphql/schema.graphql
```

### Step 2: `add_entity`

**Operation**: CreateEntity mutation
**Dependencies**: Neo4j, entity service

**Quick Checks**:
```bash
# Neo4j query performance
curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(neo4j_query_duration_ms_bucket[5m]))by(le))'

# Entity service health
kubectl get pods -l app=entity-service
kubectl logs -l app=entity-service --tail=50
```

**Common Issues**:
- Neo4j slow or down
- Entity type validation failing
- Duplicate entity detection issue

**Mitigation**:
```bash
# Check Neo4j health
kubectl exec -it neo4j-0 -- cypher-shell "CALL dbms.ping();"

# Restart Neo4j if unhealthy
kubectl delete pod neo4j-0

# Check for missing indexes
kubectl exec -it neo4j-0 -- cypher-shell "CALL db.indexes();"
```

### Step 3: `add_relationship`

**Operation**: CreateRelationship mutation
**Dependencies**: Neo4j, relationship service

**Quick Checks**:
```bash
# Check relationship service
kubectl get pods -l app=relationship-service
kubectl logs -l app=relationship-service --tail=50

# Check for Cypher query errors
kubectl logs -l app=graphql-gateway | grep "CREATE.*RELATIONSHIP.*error"
```

**Common Issues**:
- Entities not found (invalid IDs)
- Relationship type validation failing
- Constraint violations in Neo4j

**Mitigation**:
```bash
# Check Neo4j constraints
kubectl exec -it neo4j-0 -- cypher-shell "CALL db.constraints();"

# Verify entity IDs exist before relationship creation
# Fix validation logic if needed
```

### Step 4: `copilot_query`

**Operation**: AskCopilot mutation
**Dependencies**: Copilot service, LLM API, vector database

**Quick Checks**:
```bash
# Copilot service health
kubectl get pods -l app=copilot
kubectl logs -l app=copilot --tail=50

# Check LLM API connectivity
kubectl exec -it copilot-0 -- curl https://api.openai.com/v1/models

# Vector database health
kubectl get pods -l app=vector-db
```

**Common Issues**:
- LLM API rate limits or quota exceeded
- Vector database slow or down
- Copilot service OOM or crash loop

**Mitigation**:
```bash
# Check API quota
curl https://api.openai.com/v1/usage

# Scale copilot horizontally
kubectl scale deployment copilot --replicas=3

# Restart vector database if unhealthy
kubectl rollout restart statefulset/vector-db
```

### Step 5: `view_results`

**Operation**: GetInvestigationResults query
**Dependencies**: Neo4j, cache (Redis)

**Quick Checks**:
```bash
# Redis health
kubectl exec -it redis-0 -- redis-cli ping

# Check cache hit rate
curl 'http://localhost:9090/api/v1/query?query=(sum(rate(graphql_cache_hits_total[5m]))/(sum(rate(graphql_cache_hits_total[5m]))+sum(rate(graphql_cache_misses_total[5m]))))*100'

# Check Neo4j query performance
kubectl exec -it neo4j-0 -- cypher-shell "CALL dbms.listQueries() YIELD query, elapsedTimeMillis WHERE elapsedTimeMillis > 1000 RETURN query;"
```

**Common Issues**:
- Cache miss storm (Redis down or eviction)
- Complex graph query timing out
- Missing data from previous steps

**Mitigation**:
```bash
# Warm cache
redis-cli FLUSHDB  # Only in emergency, loses data
kubectl rollout restart deployment/graphql-gateway  # Restarts with fresh cache

# Optimize slow queries
# Add database indexes for common traversals
```

---

## Cross-Cutting Issues

### Issue: Recent Deployment Broke Golden Path

**Indicators**:
- All steps showing increased errors
- Deployment annotation in Grafana matches error spike

**Actions**:
1. Immediate rollback:
   ```bash
   kubectl rollout undo deployment/graphql-gateway
   kubectl rollout undo deployment/entity-service
   kubectl rollout undo deployment/copilot
   ```

2. Re-run smoke tests in staging
3. Review deployment diff for breaking changes

### Issue: Database Connection Pool Exhaustion

**Indicators**:
- Connection timeout errors
- Multiple services affected
- `max_connections` reached

**Actions**:
```bash
# PostgreSQL
kubectl exec -it postgresql-0 -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
kubectl exec -it postgresql-0 -- psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state = 'idle' ORDER BY state_change;"

# Kill idle connections if needed
kubectl exec -it postgresql-0 -- psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '5 minutes';"
```

**Mitigation**:
- Increase `max_connections` in PostgreSQL config
- Add connection pooling (PgBouncer)
- Fix connection leaks in application code

### Issue: Authentication/Authorization Failing

**Indicators**:
- All steps showing `UNAUTHENTICATED` or `FORBIDDEN` errors
- Auth service errors

**Actions**:
```bash
# Check auth service health
kubectl get pods -l app=auth-service
kubectl logs -l app=auth-service --tail=100

# Check JWT secret configuration
kubectl get secret jwt-secrets -o yaml

# Verify OIDC provider connectivity
curl https://<oidc-provider>/.well-known/openid-configuration
```

**Mitigation**:
- Restart auth service if unhealthy
- Verify JWT secrets match between services
- Check OIDC provider status page

---

## Resolution Checklist

- [ ] Golden path success rate > 98% (sustained for 15+ minutes)
- [ ] All 5 steps individually > 95% success
- [ ] Manual smoke test passes: `make smoke`
- [ ] Root cause identified
- [ ] Mitigation applied
- [ ] Stakeholders notified
- [ ] Postmortem created

---

## Prevention

### Immediate (0-24h)

- [ ] Add missing error handling for identified failure mode
- [ ] Increase resource limits if exhaustion detected
- [ ] Add database indexes if slow queries found
- [ ] Fix schema validation issues

### Short-term (1-2 weeks)

- [ ] Add pre-deployment smoke tests in CI/CD
- [ ] Implement circuit breakers for copilot/LLM
- [ ] Add retry logic with exponential backoff
- [ ] Create synthetic monitoring for golden path

### Long-term (1-2 months)

- [ ] Chaos engineering: regularly test golden path resilience
- [ ] Multi-region failover for critical services
- [ ] Implement graceful degradation (e.g., copilot returns cached responses)
- [ ] SLO-based error budgets with automated alerts

---

## Escalation

If golden path success rate does not improve after 15 minutes:

1. **Declare SEV1 Incident**: #incident-response
2. **Page Incident Commander**: Via PagerDuty
3. **Engage All Service Owners**: Entity, Relationship, Copilot, Auth
4. **Consider Full Rollback**: To last known good version
5. **Activate Backup Region**: If multi-region available

---

## Testing After Resolution

```bash
# Run full smoke test suite
make smoke

# Run extended integration tests
pnpm test:integration

# Manual golden path walkthrough
# 1. Create investigation "Test Inc 2025-11-28"
# 2. Add entity "John Doe" (Person)
# 3. Add relationship "John Doe knows Jane Smith"
# 4. Query copilot "Who does John Doe know?"
# 5. View investigation results

# Verify metrics
curl 'http://localhost:9090/api/v1/query?query=sum(rate(golden_path_success_total[5m]))'
```

---

## Related Resources

- **Dashboard**: http://localhost:3001/d/graphql-api-comprehensive (Golden Path Success Rate gauge)
- **Smoke Test Data**: `data/golden-path/demo-investigation.json`
- **Smoke Test Script**: `scripts/smoke-test.js`
- **Architecture Docs**: `docs/ARCHITECTURE.md`
- **Golden Path Definition**: `docs/TESTPLAN.md`
