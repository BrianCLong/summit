# Service Degradation Runbook

## Overview

This runbook provides step-by-step procedures for responding to service degradation incidents.

## Severity Classification

- **P0 (Critical)**: Service completely unavailable, affecting all users
- **P1 (High)**: Major degradation affecting >50% of users or critical functionality
- **P2 (Medium)**: Partial degradation affecting <50% of users
- **P3 (Low)**: Minor degradation, workarounds available

## Initial Response (First 5 Minutes)

### 1. Acknowledge the Alert
```bash
# If using PagerDuty
pd incident ack <incident-id>

# If using Opsgenie
opsgenie ack <alert-id>
```

### 2. Join Incident Channel
- Join `#incident-response` Slack channel
- Post status: "Investigating service degradation - <your-name>"

### 3. Quick Assessment
Check the monitoring dashboards:
```bash
# Open monitoring dashboards
open https://grafana.intelgraph.com/d/production-health
open https://datadog.com/dashboard/intelgraph-production
```

Key metrics to check:
- [ ] Error rate (target: <1%)
- [ ] Response time p95 (target: <500ms)
- [ ] Active users count
- [ ] Database connection pool usage
- [ ] CPU/Memory utilization

### 4. Check Recent Changes
```bash
# Check recent deployments
kubectl get deployments -n intelgraph -o wide

# Check recent commits
git log --oneline -10

# Check Helm release history
helm history intelgraph -n intelgraph
```

## Investigation Steps

### Step 1: Identify the Scope

#### Check Service Health
```bash
# Check all service health endpoints
curl -f https://api.intelgraph.com/health/detailed

# Check Kubernetes pod status
kubectl get pods -n intelgraph

# Check pod logs for errors
kubectl logs -l app=intelgraph-api -n intelgraph --tail=100 | grep -i error
```

#### Check Infrastructure
```bash
# Check node health
kubectl get nodes

# Check resource utilization
kubectl top nodes
kubectl top pods -n intelgraph

# Check persistent volumes
kubectl get pv
kubectl get pvc -n intelgraph
```

### Step 2: Check Dependencies

#### Database Health
```bash
# PostgreSQL connection test
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d intelgraph -c "SELECT 1;"

# Check connection count
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d intelgraph -c "
  SELECT count(*), state
  FROM pg_stat_activity
  WHERE datname = 'intelgraph'
  GROUP BY state;
"

# Check slow queries
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d intelgraph -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE state = 'active'
  AND now() - pg_stat_activity.query_start > interval '5 seconds'
  ORDER BY duration DESC;
"
```

#### Neo4j Health
```bash
# Check Neo4j status
cypher-shell -a bolt://$NEO4J_HOST:7687 -u neo4j -p $NEO4J_PASSWORD \
  "CALL dbms.cluster.overview() YIELD * RETURN *;"

# Check slow queries
cypher-shell -a bolt://$NEO4J_HOST:7687 -u neo4j -p $NEO4J_PASSWORD \
  "CALL dbms.listQueries() YIELD query, elapsedTimeMillis WHERE elapsedTimeMillis > 1000 RETURN *;"
```

#### Redis Health
```bash
# Check Redis connection
redis-cli -h $REDIS_HOST -p 6379 ping

# Check Redis info
redis-cli -h $REDIS_HOST -p 6379 info

# Check memory usage
redis-cli -h $REDIS_HOST -p 6379 info memory
```

### Step 3: Check Application Logs

#### API Server Logs
```bash
# Get recent error logs
kubectl logs -l app=intelgraph-api -n intelgraph --tail=500 | grep -i error

# Get logs for specific time range
kubectl logs -l app=intelgraph-api -n intelgraph --since=30m | grep -i "error\|warn"

# Check for specific error patterns
kubectl logs -l app=intelgraph-api -n intelgraph --tail=1000 | \
  grep -E "(timeout|connection|out of memory|segfault)"
```

#### Worker Logs
```bash
# Check worker logs
kubectl logs -l app=intelgraph-worker -n intelgraph --tail=200 | grep -i error
```

#### Trace Analysis
```bash
# Get trace ID from error response
# Then query Jaeger
open "https://jaeger.intelgraph.com/trace/<trace-id>"

# Or use DataDog APM
open "https://app.datadoghq.com/apm/traces?query=trace_id:<trace-id>"
```

## Mitigation Strategies

### Strategy 1: Scale Resources

If high CPU/memory usage:
```bash
# Scale up API replicas
kubectl scale deployment intelgraph-api -n intelgraph --replicas=6

# Scale up worker replicas
kubectl scale deployment intelgraph-worker -n intelgraph --replicas=10

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=intelgraph-api -n intelgraph --timeout=300s
```

### Strategy 2: Restart Unhealthy Pods

If pods are in crash loop or unhealthy:
```bash
# Delete unhealthy pods (they will be recreated)
kubectl delete pod -l app=intelgraph-api -n intelgraph --field-selector='status.phase!=Running'

# Rolling restart of all pods
kubectl rollout restart deployment intelgraph-api -n intelgraph
kubectl rollout status deployment intelgraph-api -n intelgraph
```

### Strategy 3: Database Connection Pool Adjustment

If database connections are exhausted:
```bash
# Temporarily kill idle connections
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d intelgraph -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'intelgraph'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
"

# Increase connection pool size (temporary fix)
kubectl set env deployment/intelgraph-api -n intelgraph \
  POSTGRES_MAX_CONNECTIONS=200
```

### Strategy 4: Enable Circuit Breaker

If external service is causing issues:
```bash
# Enable circuit breaker for problematic service
kubectl patch configmap intelgraph-config -n intelgraph --type merge -p '
{
  "data": {
    "CIRCUIT_BREAKER_ENABLED": "true",
    "CIRCUIT_BREAKER_THRESHOLD": "5",
    "CIRCUIT_BREAKER_TIMEOUT": "30000"
  }
}
'

# Restart pods to pick up config
kubectl rollout restart deployment intelgraph-api -n intelgraph
```

### Strategy 5: Rate Limiting

If under unusual load or potential abuse:
```bash
# Enable aggressive rate limiting
kubectl patch configmap intelgraph-config -n intelgraph --type merge -p '
{
  "data": {
    "RATE_LIMIT_ENABLED": "true",
    "RATE_LIMIT_MAX_REQUESTS": "100",
    "RATE_LIMIT_WINDOW_MS": "60000"
  }
}
'

# Apply changes
kubectl rollout restart deployment intelgraph-api -n intelgraph
```

### Strategy 6: Rollback Recent Deployment

If degradation started after recent deployment:
```bash
# Check recent deployments
helm history intelgraph -n intelgraph

# Rollback to previous version
helm rollback intelgraph <revision> -n intelgraph

# Wait for rollback to complete
kubectl rollout status deployment intelgraph-api -n intelgraph

# Verify service health
curl -f https://api.intelgraph.com/health
```

## Communication Templates

### Initial Status Update
```
🚨 INCIDENT: Service Degradation Detected

Severity: P1
Status: Investigating
Impact: Users experiencing slow response times / errors
Time Started: <timestamp>
Incident Commander: <your-name>

We are actively investigating the issue. Updates every 15 minutes.
```

### Progress Update
```
📊 UPDATE: Service Degradation Investigation

Root Cause: <brief description>
Mitigation: <action being taken>
ETA: <estimated time to resolution>
Next Update: <timestamp>

Current Metrics:
- Error Rate: <X>%
- P95 Latency: <Y>ms
- Affected Users: ~<Z>%
```

### Resolution Announcement
```
✅ RESOLVED: Service Degradation

Duration: <X> minutes
Root Cause: <brief description>
Resolution: <action taken>

Service is now operating normally. We will conduct a post-mortem within 48 hours.

Thank you for your patience.
```

## Post-Incident Checklist

- [ ] Services fully restored and stable for 30+ minutes
- [ ] All metrics within normal ranges
- [ ] Incident timeline documented
- [ ] Post-mortem scheduled within 48 hours
- [ ] Action items created for prevention
- [ ] Stakeholders notified of resolution
- [ ] Runbook updated with lessons learned

## Post-Mortem Template

Schedule a post-mortem meeting and document:

1. **Incident Summary**
   - What happened?
   - When did it happen?
   - Who was affected?

2. **Timeline**
   - Detection time
   - Response time
   - Time to mitigation
   - Time to resolution

3. **Root Cause Analysis**
   - What was the root cause?
   - Why did it happen?
   - Why wasn't it caught earlier?

4. **Impact Assessment**
   - Number of affected users
   - Duration of impact
   - Business impact

5. **Action Items**
   - Immediate fixes
   - Long-term improvements
   - Monitoring enhancements
   - Runbook updates

## Useful Links

- Production Dashboard: https://grafana.intelgraph.com/d/production-health
- APM Dashboard: https://app.datadoghq.com/apm
- Logs: https://app.datadoghq.com/logs
- Traces: https://jaeger.intelgraph.com
- PagerDuty: https://intelgraph.pagerduty.com
- Status Page: https://status.intelgraph.com

## Escalation

If unable to resolve within:
- **15 minutes (P0)**: Escalate to Engineering Manager
- **30 minutes (P1)**: Escalate to VP Engineering
- **1 hour (P2)**: Escalate to Engineering Manager

Emergency Contacts:
- Engineering Manager: [contact info]
- VP Engineering: [contact info]
- CTO: [contact info]
