# Runbook: Cost Alerts & Budget Violations

**Last Updated**: 2025-11-24
**Owner**: Ops/SRE Team
**Severity**: P1 (Critical)

## Overview

This runbook provides step-by-step procedures for responding to cost alerts and budget violations in the IntelGraph platform.

---

## Table of Contents

1. [Alert Types](#alert-types)
2. [Budget Violation Response](#budget-violation-response)
3. [Slow Query Investigation](#slow-query-investigation)
4. [Cost Spike Response](#cost-spike-response)
5. [Tenant Budget Management](#tenant-budget-management)
6. [Escalation Procedures](#escalation-procedures)
7. [Prevention & Mitigation](#prevention--mitigation)

---

## Alert Types

### 1. Daily Budget Exceeded

**Alert**: `DailyCostExceeded`

```
ALERT DailyCostExceeded
expr: sum(cost_total_daily) by (tenant_id) > tenant_budget_daily_limit
for: 1h
severity: critical
```

**Symptoms**:
- Tenant's daily spending exceeded configured limit
- Budget utilization > 95%
- Potential service degradation for tenant

**Immediate Actions**:
1. Check budget utilization in Admin Studio
2. Review recent spending patterns
3. Identify cost drivers (operations, resources)
4. Apply QOS override if legitimate spike
5. Contact tenant if suspicious activity

### 2. Monthly Budget Warning

**Alert**: `MonthlyBudgetWarning`

```
ALERT MonthlyBudgetWarning
expr: (sum(cost_total_monthly) by (tenant_id) / tenant_budget_monthly_limit) > 0.8
for: 30m
severity: warning
```

**Symptoms**:
- Tenant approaching 80% of monthly budget
- Projected to exceed budget before month end

**Immediate Actions**:
1. Generate spending forecast
2. Send tenant notification
3. Review recent usage trends
4. Suggest optimization opportunities
5. Offer budget increase options

### 3. Slow Query Kill Rate High

**Alert**: `SlowQueryKillRateHigh`

```
ALERT SlowQueryKillRateHigh
expr: rate(intelgraph_slow_queries_killed_total[5m]) > 5
for: 15m
severity: warning
```

**Symptoms**:
- High rate of query kills
- Potential performance issues
- Tenant complaints about query failures

**Immediate Actions**:
1. Review killed queries in Admin Studio
2. Identify common patterns (tenant, query type)
3. Check if legitimate or abuse
4. Adjust query budgets if needed
5. Contact tenant for optimization

### 4. Cost Anomaly Detected

**Alert**: `CostAnomalyDetected`

```
ALERT CostAnomalyDetected
expr: abs(cost_total_hourly - avg_over_time(cost_total_hourly[24h])) > 3 * stddev_over_time(cost_total_hourly[24h])
for: 10m
severity: warning
```

**Symptoms**:
- Unexpected cost spike (3σ from mean)
- Sudden change in usage patterns

**Immediate Actions**:
1. Investigate source of anomaly
2. Check for runaway queries
3. Review recent deployments
4. Check for security incidents
5. Apply cost controls if needed

---

## Budget Violation Response

### Step 1: Assess Severity

```bash
# Check current budget utilization
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ tenantBudget(tenantId: \"TENANT_ID\", period: DAY) { utilizationPercent remaining } }"
  }'
```

**Severity Levels**:
- **P0 (Critical)**: > 100% utilization, service disruption
- **P1 (High)**: 95-100% utilization, imminent exhaustion
- **P2 (Medium)**: 80-95% utilization, warning threshold
- **P3 (Low)**: < 80% utilization, informational

### Step 2: Identify Cost Drivers

```bash
# Get cost breakdown
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ costMetrics(tenantId: \"TENANT_ID\", period: DAY) { totalCost costByOperation costByResource } }"
  }'
```

**Key Questions**:
- Which operations are most expensive?
- Which resources consuming most cost?
- Is this expected or anomalous?
- Are there runaway queries?

### Step 3: Review Budget Ledger

```bash
# Get recent spending
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ budgetLedgerEntries(tenantId: \"TENANT_ID\", limit: 100) { operation estimatedCost actualCost createdAt } }"
  }'
```

Look for:
- Sudden spikes in spending
- Repeated expensive operations
- Cost estimation vs. actual cost gaps

### Step 4: Check Running Queries

```bash
# Get running queries
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ runningQueries(tenantId: \"TENANT_ID\") { queryId query estimatedCost executionTimeMs status } }"
  }'
```

Look for:
- Long-running expensive queries
- High complexity queries
- Queries approaching kill threshold

### Step 5: Apply Immediate Mitigation

**Option A: Create QOS Override (Legitimate Use)**

```bash
# Grant temporary budget increase
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQOSOverride(tenantId: \"TENANT_ID\", exploreMax: 0.95, ttlMinutes: 1440, reason: \"Emergency budget increase for critical investigation\") { id expiresAt } }"
  }'
```

**Option B: Reduce Query Budget (Abuse Prevention)**

```bash
# Lower query budgets
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { setTenantQueryBudget(tenantId: \"TENANT_ID\", maxExecutionTimeMs: 3000, maxCostDollars: 0.05, maxConcurrentQueries: 5) }"
  }'
```

**Option C: Kill Runaway Queries**

```bash
# Kill expensive query
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { killQuery(queryId: \"QUERY_ID\") }"
  }'
```

### Step 6: Notify Tenant

```bash
# Send tenant notice
# Via Slack webhook
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#tenant-alerts",
    "text": "🚨 Budget Alert: Tenant TENANT_ID has exceeded 95% of daily budget",
    "attachments": [{
      "color": "danger",
      "fields": [
        { "title": "Utilization", "value": "98%", "short": true },
        { "title": "Remaining", "value": "$5.00", "short": true },
        { "title": "Action", "value": "Review usage patterns" }
      ]
    }]
  }'

# Via Admin API (create tenant notice)
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { /* Notice creation mutation */ }"
  }'
```

### Step 7: Document Incident

Create incident record with:
- Timestamp of alert
- Budget utilization at time of alert
- Root cause analysis
- Mitigation actions taken
- Tenant communication log
- Lessons learned

---

## Slow Query Investigation

### Diagnostic Steps

1. **Identify Killed Queries**

```bash
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ slowQueryStats(tenantId: \"TENANT_ID\", period: DAY) { totalQueries killedQueries warningsIssued totalCostSaved killsByReason } }"
  }'
```

2. **Check Query Patterns**

Review `killsByReason` to identify:
- Time limit violations
- Cost limit violations
- Complexity violations

3. **Analyze Query Complexity**

```bash
# Get recent killed queries from logs
kubectl logs -l app=admin-api --since=1h | grep "query_killed"
```

4. **Check Database Performance**

```bash
# Neo4j slow queries
docker exec -it neo4j cypher-shell -u neo4j -p password \
  "CALL dbms.listQueries() YIELD query, elapsedTimeMillis WHERE elapsedTimeMillis > 5000 RETURN query, elapsedTimeMillis"

# PostgreSQL slow queries
docker exec -it postgres psql -U postgres -d summit -c \
  "SELECT query, calls, mean_exec_time, max_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10"
```

### Resolution Actions

**Query Optimization**

```cypher
// Before: Unbounded variable length path
MATCH (a:Person)-[*]->(b:Person) RETURN a, b

// After: Bounded path
MATCH (a:Person)-[*1..3]->(b:Person) RETURN a, b LIMIT 100
```

**Index Addition**

```cypher
// Add index for common query patterns
CREATE INDEX entity_name_idx FOR (n:Entity) ON (n.name)
CREATE INDEX relationship_type_idx FOR ()-[r:RELATED_TO]-() ON (r.type)
```

**Query Caching**

```typescript
// Cache expensive query results
const cacheKey = `query:${hash(cypherQuery)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await neo4j.run(cypherQuery);
await redis.setex(cacheKey, 3600, JSON.stringify(result));
return result;
```

---

## Cost Spike Response

### Investigation Checklist

- [ ] Check recent deployments
- [ ] Review recent tenant onboardings
- [ ] Check for security incidents
- [ ] Review API rate limits
- [ ] Check batch job schedules
- [ ] Review data ingestion volumes

### Immediate Mitigation

1. **Enable Circuit Breakers**

```typescript
// In services/common/cost/throttling.ts
costGuardrails.setBudget('minute', 10.0); // $10/minute max
costGuardrails.setBudget('hour', 100.0); // $100/hour max
```

2. **Rate Limit API**

```bash
# Update rate limits in API gateway
kubectl set env deployment/api-gateway \
  RATE_LIMIT_WINDOW_MS=60000 \
  RATE_LIMIT_MAX_REQUESTS=100
```

3. **Scale Down Non-Critical Services**

```bash
kubectl scale deployment/copilot --replicas=1
kubectl scale deployment/analytics-engine --replicas=1
```

---

## Tenant Budget Management

### Setting Initial Budgets

```bash
# New tenant setup
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { setTenantBudget(tenantId: \"new-tenant\", period: DAY, limit: 50.0) { id } }"
  }'

# Repeat for all periods
# MINUTE: $1.0
# HOUR: $10.0
# DAY: $50.0
# MONTH: $1000.0
```

### Budget Adjustment

**Increase Budget**

```bash
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { setTenantBudget(tenantId: \"TENANT_ID\", period: DAY, limit: 100.0) { id utilizationPercent } }"
  }'
```

**Create Temporary Override**

```bash
curl -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQOSOverride(tenantId: \"TENANT_ID\", exploreMax: 1.0, ttlMinutes: 720, reason: \"Premium trial period\") { id expiresAt } }"
  }'
```

### Budget Monitoring

```bash
# Watch budget utilization
watch -n 60 'curl -s -X POST http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '"'"'{"query":"{ tenantBudgets(limit: 10) { tenantId period utilizationPercent remaining } }"}'"'"' \
  | jq -r '"'"'.data.tenantBudgets[] | "\(.tenantId) \(.period): \(.utilizationPercent)% (\(.remaining) remaining)"'"'"''
```

---

## Escalation Procedures

### Level 1: On-Call Engineer (15 minutes)

**Actions**:
- Acknowledge alert
- Assess severity
- Apply immediate mitigation
- Document findings

**Escalate if**:
- Cause unclear after 15 minutes
- Mitigation not effective
- Potential security incident
- Multiple tenants affected

### Level 2: SRE Lead (30 minutes)

**Actions**:
- Review Level 1 analysis
- Engage relevant teams
- Implement advanced mitigation
- Update incident status

**Escalate if**:
- Platform-wide impact
- Database performance issues
- Requires code changes
- Financial impact > $1000

### Level 3: Engineering Manager (1 hour)

**Actions**:
- Coordinate cross-team response
- Make architectural decisions
- Approve emergency changes
- Communicate with stakeholders

### Level 4: VP Engineering / CTO (Immediate)

**Escalate if**:
- Customer data at risk
- Major financial loss
- Legal/compliance implications
- Executive decision required

---

## Prevention & Mitigation

### Proactive Measures

1. **Set Conservative Defaults**

```typescript
// Default budgets for new tenants
const DEFAULT_BUDGETS = {
  minute: 1.0,   // $1/minute
  hour: 10.0,    // $10/hour
  day: 50.0,     // $50/day
  month: 1000.0, // $1000/month
};

// Default query budgets
const DEFAULT_QUERY_BUDGET = {
  maxExecutionTimeMs: 5000,      // 5 seconds
  maxCostDollars: 0.10,          // $0.10
  maxConcurrentQueries: 10,      // 10 concurrent
  maxComplexity: 50,             // Complexity score
};
```

2. **Implement Cost Estimation**

```typescript
import { QueryCostEstimator } from '@intelgraph/slow-query-killer';

// Before executing query
const estimatedCost = QueryCostEstimator.estimateNeo4jCost(cypher, 100);

if (estimatedCost > maxCost) {
  throw new Error(`Query too expensive: $${estimatedCost.toFixed(4)}`);
}
```

3. **Enable Auto-Scaling**

```yaml
# helm/admin-api/values.yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

4. **Set Up Monitoring Dashboards**

```bash
# Import cost monitoring dashboard
kubectl apply -f observability/grafana/dashboards/finops-cost-guard.json
```

5. **Implement Caching**

```typescript
// Cache expensive queries
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

const CACHE_TTL = 3600; // 1 hour

async function cachedQuery(cypher: string, params: any) {
  const key = `query:${hash(cypher)}:${hash(params)}`;
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const result = await executeQuery(cypher, params);
  await redis.setex(key, CACHE_TTL, JSON.stringify(result));

  return result;
}
```

### Regular Maintenance

**Daily**:
- Review budget utilization reports
- Check for anomalies
- Review killed query statistics
- Update tenant notices

**Weekly**:
- Analyze cost trends
- Identify optimization opportunities
- Review slow query patterns
- Update cost models

**Monthly**:
- Budget reconciliation
- Cost allocation review
- Tenant cost reports
- Policy review and updates

---

## Useful Commands

### Budget Status

```bash
# Overall budget status
curl -s http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ aggregatedCostMetrics(period: DAY, topN: 20) { tenantId totalCost utilizationPercent } }"}' \
  | jq -r '.data.aggregatedCostMetrics[] | "\(.tenantId): $\(.totalCost) (\(.utilizationPercent)%)"'
```

### Running Queries

```bash
# All running queries
curl -s http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ runningQueries { tenantId queryId executionTimeMs status } }"}' \
  | jq -r '.data.runningQueries[] | "\(.tenantId) \(.queryId): \(.executionTimeMs)ms (\(.status))"'
```

### Cost Metrics

```bash
# Today's costs by tenant
curl -s http://admin-api:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ aggregatedCostMetrics(period: DAY) { tenantId totalCost requestCount } }"}' \
  | jq -r '.data.aggregatedCostMetrics[] | "\(.tenantId): $\(.totalCost) (\(.requestCount) requests)"'
```

### Prometheus Queries

```promql
# Budget utilization
intelgraph_budget_utilization_percent{tenant_id="TENANT_ID", period="daily"}

# Cost rate
rate(intelgraph_cost_total_dollars[1h])

# Slow queries killed
rate(intelgraph_slow_queries_killed_total[5m])

# Query warning rate
rate(intelgraph_query_warnings_total[5m])
```

---

## Contact Information

- **On-Call Engineer**: PagerDuty rotation
- **SRE Lead**: sre-lead@intelgraph.com
- **Engineering Manager**: eng-manager@intelgraph.com
- **Slack Channels**:
  - `#ops-alerts` - Automated alerts
  - `#ops-incidents` - Incident coordination
  - `#cost-optimization` - Cost discussions

---

## Related Runbooks

- [Database Performance Troubleshooting](./database-performance.md)
- [Neo4j Query Optimization](./neo4j-optimization.md)
- [Security Incident Response](./security-incidents.md)
- [Tenant Onboarding](./tenant-onboarding.md)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-24 | Ops Team | Initial creation |
