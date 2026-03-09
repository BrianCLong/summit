# Error Rate Spike Runbook

**Service**: All Summit services
**Alert**: `APIErrorBudgetBurnCritical`, `APIErrorBudgetBurnHigh`
**Severity**: Critical/Warning
**SLO Impact**: Availability SLO violation, error budget burn

## Overview

This runbook guides you through responding to error rate spikes. Error rate spikes burn through your error budget and directly impact users.

## Symptoms

- **Grafana Alert**: "API error budget burning at critical rate"
- **User Impact**: Failed requests, 500 errors, broken features
- **Metrics**: 5xx error rate above threshold

## Severity Levels

| Burn Rate | Time to Exhaustion | Severity | Response Time |
|-----------|-------------------|----------|---------------|
| 14.4x | 2 days | **Critical** | Immediate (page) |
| 6x | 5 days | **High** | 15 minutes |
| 3x | 10 days | **Medium** | 1 hour |
| 1x | 30 days | **Low** | Next business day |

## Initial Response (5 minutes)

### 1. Acknowledge Alert

```bash
# Silence alert in AlertManager if noise
curl -X POST http://localhost:9093/api/v1/silences \
  -d '{"matchers":[{"name":"alertname","value":"APIErrorBudgetBurnCritical"}],"startsAt":"2025-11-20T12:00:00Z","endsAt":"2025-11-20T13:00:00Z","createdBy":"oncall","comment":"Investigating"}'
```

### 2. Check Current Error Rate

**Dashboard**: [Summit - Golden Signals](http://localhost:3001/d/summit-golden-signals)

```promql
# Current error rate
sum(rate(http_requests_total{service="api",code=~"5.."}[5m]))
/
sum(rate(http_requests_total{service="api"}[5m]))
```

Expected: < 0.1% (for 99.9% SLO)
Alert threshold: > 1.44% (14.4x burn rate)

### 3. Identify Error Types

**Loki Query** (in Grafana Explore):

```logql
{service="api"} |= "ERROR" | json | line_format "{{.msg}}"
```

**Prometheus Query**:

```promql
# Errors by status code
sum(rate(http_requests_total{service="api",code=~"5.."}[5m])) by (code)
```

Check:
- [ ] 500 (Internal Server Error) - code bugs
- [ ] 502 (Bad Gateway) - upstream service down
- [ ] 503 (Service Unavailable) - overload
- [ ] 504 (Gateway Timeout) - slow dependencies

## Investigation (10 minutes)

### 4. Trace Analysis

**Jaeger**: [http://localhost:16686](http://localhost:16686)

Steps:
1. Select service: `summit-api`
2. Select operation with errors (if known)
3. Set Tags: `error=true`
4. Click "Find Traces"
5. Click on a recent error trace

**Look for**:
- [ ] Error message in span tags
- [ ] Stack trace in span logs
- [ ] Which component failed (database, external API, etc.)
- [ ] Common pattern across error traces

### 5. Log Aggregation

**Grafana Explore** → Loki

Find error patterns:

```logql
# Errors in last 15 minutes
{service="api"} |= "ERROR" | json | level="ERROR"

# Group by error type
{service="api"} |= "ERROR" | json | count_over_time({} [1m]) by (msg)

# Find correlated traces
{service="api"} |~ "traceId=([a-f0-9]+)" | json | trace_id != ""
```

Click "Trace" button next to log to jump to Jaeger.

### 6. Check Dependencies

Errors often caused by downstream services:

```promql
# Neo4j availability
up{job="neo4j"}

# PostgreSQL availability
up{job="postgres"}

# Redis availability
up{job="redis"}
```

**Check health endpoints**:

```bash
curl http://localhost:4000/health/detailed
```

Expected response includes database statuses.

### 7. Recent Changes

**Check recent deployments**:

```bash
# Git commits in last hour
git log --since="1 hour ago" --oneline

# Docker image tags
docker images summit-api --format "table {{.Tag}}\t{{.CreatedAt}}"
```

**Correlate with deployment**:
- Did errors start right after a deployment?
- Was there a config change?
- Was there a database migration?

## Common Causes & Fixes

### Cause 1: Database Connection Exhausted

**Symptom**:
- Errors: "Connection pool exhausted", "Unable to acquire connection"
- Traces show long waits before database errors

**Check**:
```bash
# PostgreSQL connections
docker exec summit-postgres psql -U summit -d summit_dev -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
docker exec summit-postgres psql -U summit -d summit_dev -c \
  "SHOW max_connections;"
```

**Fix**:
```typescript
// Increase pool size in code
const pool = new Pool({
  max: 50, // Increase from 20
});
```

Or restart with more connections:
```bash
docker-compose restart postgres
```

### Cause 2: Unhandled Exception in Code

**Symptom**:
- 500 errors with stack traces
- Specific endpoint always failing
- Error message points to code line

**Fix**:
```bash
# Quick rollback
git revert <bad-commit-hash>
docker-compose build api
docker-compose up -d api

# Or rollback to previous image
docker tag summit-api:previous summit-api:latest
docker-compose up -d api
```

### Cause 3: Dependency Service Down

**Symptom**:
- 502/504 errors
- Traces show timeout to downstream service
- `up` metric = 0 for dependency

**Fix**:
```bash
# Restart dependency
docker-compose restart neo4j

# Or check logs
docker-compose logs neo4j --tail=100

# Check resource limits
docker stats neo4j
```

### Cause 4: Rate Limiting / Overload

**Symptom**:
- 503 errors
- CPU/memory maxed out
- Request rate spike

**Fix**:
```bash
# Scale horizontally
docker-compose up -d --scale api=3

# Or reduce load
# Enable more aggressive rate limiting
RATE_LIMIT_MAX=100 docker-compose up -d api
```

### Cause 5: Bad Data / Malformed Input

**Symptom**:
- Validation errors
- Parsing errors
- Specific user triggering errors

**Fix**:
```typescript
// Add input validation
app.use(express.json({
  limit: '1mb',
  strict: true,
}));

// Add error handling
app.use((err, req, res, next) => {
  logger.error({ err, requestId: req.id }, 'Request failed');
  res.status(500).json({ error: 'Internal server error' });
});
```

### Cause 6: External API Failure

**Symptom**:
- Errors when calling external service
- Timeouts to third-party APIs

**Fix**:
```typescript
// Add circuit breaker
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(externalApiCall, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => ({ cached: true, data: fallbackData }));
```

## Mitigation (Immediate Actions)

If errors are causing critical user impact:

### 1. Rollback Recent Changes

```bash
# Rollback last deployment
git revert HEAD
docker-compose build api
docker-compose up -d api

# Or rollback to previous image tag
docker tag summit-api:v1.2.3 summit-api:latest
docker-compose up -d api
```

### 2. Disable Problematic Features

```bash
# Use feature flags to disable failing feature
curl -X POST http://localhost:4000/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{"feature": "new-copilot", "enabled": false}'
```

### 3. Scale Resources

```bash
# Increase replicas
docker-compose up -d --scale api=5

# Or in Kubernetes
kubectl scale deployment summit-api --replicas=10
```

### 4. Circuit Breaker / Graceful Degradation

If a specific dependency is failing:
- Enable circuit breaker to fail fast
- Return cached data
- Return degraded response (partial data)

## Resolution Verification

After implementing fixes:

1. **Check error rate** (wait 5 minutes):
```promql
sum(rate(http_requests_total{service="api",code=~"5.."}[5m]))
/
sum(rate(http_requests_total{service="api"}[5m]))
```

Expected: < 0.1% (back below SLO)

2. **Check traces**: Verify recent traces are successful

3. **Check logs**: Verify ERROR logs have stopped

4. **User validation**: Test affected functionality

5. **Monitor burn rate**: Ensure it's back to < 1x

## Escalation

Escalate if:
- [ ] Error rate remains > 10% after 15 minutes
- [ ] Unable to identify root cause within 30 minutes
- [ ] Rollback doesn't fix the issue
- [ ] Critical data loss or security concern

**Escalate to**: Platform Team Lead / CTO
**Slack**: #summit-incidents (mention @oncall)
**Start incident**: Follow [Incident Response](../incident-response.md)

## Post-Incident

After resolving:

1. **Create postmortem**: [Template](../postmortem_template.md)
2. **Calculate impact**:
   - Error budget consumed
   - User impact (users affected, requests failed)
   - Revenue impact (if applicable)
3. **Document root cause** in postmortem
4. **Create follow-up tasks**:
   - Improve monitoring (if issue was hard to detect)
   - Add tests (if code bug)
   - Add runbook updates
5. **Share lessons learned** with team

## Reference

- **Dashboards**:
  - [Golden Signals](http://localhost:3001/d/summit-golden-signals)
  - [SLO Overview](http://localhost:3001/d/summit-slo-overview)
- **Jaeger**: [http://localhost:16686](http://localhost:16686)
- **Loki**: [Grafana Explore](http://localhost:3001/explore)
- **AlertManager**: [http://localhost:9093](http://localhost:9093)

## Related Runbooks

- [High Latency](./high-latency.md)
- [Database Down](./database-down.md)
- [Rollback Procedures](../rollback.yaml)
- [Incident Response](../incident-response.md)

---

**Last Updated**: 2025-11-20
**Owner**: Platform Team
