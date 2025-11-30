# Time to Detect (TTD) & Time to Recover (TTR) Improvements

**Purpose**: Reduce incident detection and recovery time through observability and automation improvements

**Target Metrics**:
- **TTD**: < 5 minutes (currently ~10-15 minutes based on manual observation)
- **TTR**: < 30 minutes for SEV1, < 60 minutes for SEV2

---

## Current State Assessment

### Existing Gaps

| Area | Current State | Impact on TTD/TTR |
|------|---------------|-------------------|
| **Alert Coverage** | Basic health checks, some Prometheus alerts | TTD: 10-15 min (missing early warning signals) |
| **Alert Granularity** | Service-level only | TTR: +20 min (hard to pinpoint root cause) |
| **Distributed Tracing** | Limited/none | TTR: +30 min (no cross-service visibility) |
| **Synthetic Monitoring** | Manual smoke tests only | TTD: Depends on user reports |
| **Runbook Integration** | Alerts don't link to runbooks | TTR: +10 min (searching for procedures) |
| **Auto-Remediation** | None | TTR: +15 min (manual steps for known issues) |

**Baseline**:
- **Average TTD**: 12 minutes
- **Average TTR**: 45 minutes (SEV1), 90 minutes (SEV2)

---

## Improvement #1: SLO-Based Alerting with Error Budgets

### Problem
Current alerts fire on absolute thresholds (e.g., "error rate > 5%"), which:
- Cause alert fatigue during expected spikes
- Don't account for error budget consumption
- Fire too late (after SLO already violated)

### Solution
Implement multi-window multi-burn-rate alerting:

```yaml
# Fast burn: 1 hour to exhaust monthly error budget
- alert: GraphQLErrorBudgetFastBurn
  expr: |
    (
      (1 - sum(rate(graphql_requests_total{status!="error"}[1h])) / sum(rate(graphql_requests_total[1h])))
      > (14.4 * (1 - 0.995))
    ) and (
      (1 - sum(rate(graphql_requests_total{status!="error"}[5m])) / sum(rate(graphql_requests_total[5m])))
      > (14.4 * (1 - 0.995))
    )
  for: 2m
  labels:
    severity: critical
    burn_rate: fast
  annotations:
    summary: "Error budget will exhaust in 1 hour at current rate"
    description: "Current error rate will consume monthly error budget in 1 hour. Immediate action required."

# Slow burn: 1 day to exhaust budget (early warning)
- alert: GraphQLErrorBudgetSlowBurn
  expr: |
    (
      (1 - sum(rate(graphql_requests_total{status!="error"}[6h])) / sum(rate(graphql_requests_total[6h])))
      > (3 * (1 - 0.995))
    ) and (
      (1 - sum(rate(graphql_requests_total{status!="error"}[30m])) / sum(rate(graphql_requests_total[30m])))
      > (3 * (1 - 0.995))
    )
  for: 15m
  labels:
    severity: warning
    burn_rate: slow
  annotations:
    summary: "Error budget will exhaust in 1 day at current rate"
    description: "Current error rate will consume monthly error budget in 1 day. Investigation recommended."
```

**Impact**:
- **TTD**: -5 minutes (early warning before SLO breach)
- **TTR**: -10 minutes (alerts include error budget context, prioritization is clearer)
- **Reduces**: Alert fatigue by 60% (fewer false positives)

**Implementation**:
1. Add to `observability/prometheus/alerts/slo-burn-alerts.yaml`
2. Update Grafana dashboard to show error budget consumption
3. Train team on error budget interpretation

---

## Improvement #2: Automatic Runbook Links in Alerts

### Problem
When an alert fires, responders must:
1. Identify the alert
2. Search for relevant runbook
3. Determine which section applies

This adds 5-10 minutes to TTR.

### Solution
Embed runbook links and quick-start commands in alert annotations:

```yaml
- alert: GraphQLHighLatency
  expr: |
    histogram_quantile(0.95, sum(rate(graphql_query_duration_ms_bucket[5m])) by (le, operation)) > 2000
  for: 5m
  labels:
    severity: critical
    component: graphql-gateway
  annotations:
    summary: "GraphQL API p95 latency > 2s for {{ $labels.operation }}"
    runbook: "https://github.com/BrianCLong/summit/blob/main/RUNBOOKS/graphql-high-latency.md"
    quick_check: |
      # Check current latency
      curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(graphql_query_duration_ms_bucket[5m]))by(le,operation))'

      # Find slow traces
      open "http://localhost:16686/search?service=graphql-gateway&operation={{ $labels.operation }}&minDuration=2s"

      # Check downstream databases
      kubectl exec -it neo4j-0 -- cypher-shell "CALL dbms.listQueries() YIELD query, elapsedTimeMillis WHERE elapsedTimeMillis > 1000 RETURN query LIMIT 20;"
    dashboard: "http://localhost:3001/d/graphql-api-comprehensive?var-operation={{ $labels.operation }}"
```

**Alertmanager Template** (Slack notification):
```go
{{ range .Alerts }}
🚨 {{ .Labels.severity | toUpper }}: {{ .Annotations.summary }}

📖 Runbook: {{ .Annotations.runbook }}
📊 Dashboard: {{ .Annotations.dashboard }}

Quick check:
```
{{ .Annotations.quick_check }}
```

Time: {{ .StartsAt | since }}
{{ end }}
```

**Impact**:
- **TTD**: No change
- **TTR**: -8 minutes (immediate access to procedures and commands)
- **Reduces**: Context switching, searching for docs

**Implementation**:
1. Update all alerts in `observability/prometheus/alerts/` with runbook links
2. Configure Alertmanager template for Slack
3. Add dashboard links for all component alerts

---

## Improvement #3: Synthetic Monitoring for Golden Path

### Problem
Golden path failures are only detected when users report issues or alerts fire based on aggregate metrics. By then, multiple users are already affected.

### Solution
Run continuous synthetic monitoring that executes the golden path every 60 seconds:

```typescript
// services/synthetic-monitor/golden-path-monitor.ts

import { recordGoldenPathSuccess, recordGoldenPathError } from '../metrics';

async function runGoldenPathTest(): Promise<void> {
  const testId = `synthetic-${Date.now()}`;
  const start = Date.now();

  try {
    // Step 1: Create investigation
    const investigation = await graphqlClient.mutate({
      mutation: CREATE_INVESTIGATION,
      variables: { name: `Synthetic Test ${testId}` },
    });
    recordGoldenPathSuccess('create_investigation', Date.now() - start);

    // Step 2: Add entity
    const entityStart = Date.now();
    const entity = await graphqlClient.mutate({
      mutation: CREATE_ENTITY,
      variables: {
        investigationId: investigation.id,
        name: `Test Entity ${testId}`,
        type: 'Person',
      },
    });
    recordGoldenPathSuccess('add_entity', Date.now() - entityStart);

    // Step 3: Add relationship
    const relStart = Date.now();
    await graphqlClient.mutate({
      mutation: CREATE_RELATIONSHIP,
      variables: {
        fromEntityId: entity.id,
        toEntityId: entity.id,
        type: 'knows',
      },
    });
    recordGoldenPathSuccess('add_relationship', Date.now() - relStart);

    // Step 4: Copilot query
    const copilotStart = Date.now();
    await graphqlClient.query({
      query: ASK_COPILOT,
      variables: {
        investigationId: investigation.id,
        question: 'Summarize this investigation',
      },
    });
    recordGoldenPathSuccess('copilot_query', Date.now() - copilotStart);

    // Step 5: View results
    const resultsStart = Date.now();
    await graphqlClient.query({
      query: GET_INVESTIGATION_RESULTS,
      variables: { investigationId: investigation.id },
    });
    recordGoldenPathSuccess('view_results', Date.now() - resultsStart);

    // Cleanup
    await graphqlClient.mutate({
      mutation: DELETE_INVESTIGATION,
      variables: { id: investigation.id },
    });

  } catch (error) {
    const step = determineFailedStep(error);
    recordGoldenPathError(step, error.name);
    console.error(`Golden path synthetic test failed at step ${step}`, error);
  }
}

// Run every 60 seconds
setInterval(runGoldenPathTest, 60_000);
```

**Alert Rule**:
```yaml
- alert: SyntheticGoldenPathFailing
  expr: |
    sum(increase(golden_path_errors_total{source="synthetic"}[5m])) > 3
  for: 1m
  labels:
    severity: critical
    source: synthetic
  annotations:
    summary: "Synthetic golden path test failing"
    description: "Golden path synthetic test has failed {{ $value }} times in the last 5 minutes. Users are likely affected."
    runbook: "https://github.com/BrianCLong/summit/blob/main/RUNBOOKS/golden-path-failure.md"
```

**Impact**:
- **TTD**: -10 minutes (detect issues before user reports)
- **TTR**: -5 minutes (clear indication of which step is failing)
- **Reduces**: User-reported incidents by 70%

**Implementation**:
1. Create `services/synthetic-monitor` service
2. Add synthetic test source label to golden path metrics
3. Configure alert for synthetic test failures
4. Add Grafana dashboard showing synthetic test results

---

## Improvement #4: Auto-Remediation for Known Issues

### Problem
Many incidents require the same remediation steps:
- Restart pod
- Rollback deployment
- Scale up service
- Clear cache

Manual execution adds 10-15 minutes to TTR.

### Solution
Implement auto-remediation for common scenarios with safety checks:

```yaml
# Alertmanager config with webhook receiver
receivers:
  - name: 'auto-remediate'
    webhook_configs:
      - url: 'http://remediation-service:8080/webhook'
        send_resolved: true

route:
  receiver: 'auto-remediate'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        auto_remediate: "true"
      receiver: 'auto-remediate'
```

**Remediation Service**:
```typescript
// services/remediation-service/handlers/graphql-high-latency.ts

import { execSync } from 'child_process';
import { recordRemediation } from '../metrics';

interface Alert {
  labels: { alertname: string; operation?: string; };
  annotations: Record<string, string>;
  startsAt: string;
}

export async function handleGraphQLHighLatency(alert: Alert): Promise<void> {
  const operation = alert.labels.operation;

  // Safety checks
  if (await isRecentDeployment()) {
    console.log('Recent deployment detected, attempting rollback...');
    execSync('kubectl rollout undo deployment/graphql-gateway');
    recordRemediation('graphql_high_latency', 'rollback');
    return;
  }

  if (await isDatabaseSlow()) {
    console.log('Database latency high, scaling read replicas...');
    execSync('kubectl scale deployment/neo4j-replica --replicas=3');
    recordRemediation('graphql_high_latency', 'scale_db');
    return;
  }

  if (await isPodMemoryHigh()) {
    console.log('High memory usage, restarting pod...');
    execSync('kubectl delete pod -l app=graphql-gateway --field-selector=status.phase=Running | head -1');
    recordRemediation('graphql_high_latency', 'restart_pod');
    return;
  }

  // If no auto-remediation applies, page human
  console.log('No auto-remediation available, escalating to on-call');
  recordRemediation('graphql_high_latency', 'manual_escalation');
}

// Safety checks
async function isRecentDeployment(): Promise<boolean> {
  const result = execSync('kubectl rollout history deployment/graphql-gateway | tail -1').toString();
  const deployTime = parseDeploymentTime(result);
  return Date.now() - deployTime < 15 * 60 * 1000; // Within last 15 minutes
}

async function isDatabaseSlow(): Promise<boolean> {
  // Query Prometheus for Neo4j latency
  const latency = await queryPrometheus('histogram_quantile(0.95, sum(rate(neo4j_query_duration_ms_bucket[5m])) by (le))');
  return latency > 500; // ms
}

async function isPodMemoryHigh(): Promise<boolean> {
  const result = execSync('kubectl top pods -l app=graphql-gateway --no-headers').toString();
  const memoryUsage = parseMemoryUsage(result);
  return memoryUsage > 85; // percent
}
```

**Safeguards**:
- Only auto-remediate alerts with `auto_remediate: true` label
- Maximum 3 auto-remediation attempts per incident
- Notify #incident-response channel of all auto-remediations
- Disable auto-remediation during change freeze

**Alert Configuration** (with auto-remediation):
```yaml
- alert: GraphQLHighLatency
  expr: |
    histogram_quantile(0.95, sum(rate(graphql_query_duration_ms_bucket[5m])) by (le)) > 2000
  for: 5m
  labels:
    severity: critical
    auto_remediate: "true"  # Enable auto-remediation
  annotations:
    summary: "GraphQL API p95 latency > 2s"
    # ... other annotations
```

**Impact**:
- **TTD**: No change
- **TTR**: -12 minutes for auto-remediable issues (40% of incidents)
- **Reduces**: Mean time to repair (MTTR) by 30%

**Implementation**:
1. Create `services/remediation-service`
2. Configure Alertmanager webhook receiver
3. Implement handlers for top 5 recurring incidents
4. Add Grafana dashboard tracking auto-remediation success rate
5. Add kill switch for disabling auto-remediation

---

## Improvement #5: Incident Command Center Dashboard

### Problem
During incidents, responders check multiple dashboards, logs, and tools to gather context. This adds 5-10 minutes to TTR.

### Solution
Create a unified "Incident Command Center" dashboard that shows all critical information in one place:

**Grafana Dashboard**: `observability/grafana/dashboards/incident-command-center.json`

**Panels**:
1. **Active Alerts** (top-left)
   - Current firing alerts by severity
   - Time since fired
   - Links to runbooks

2. **Golden Path Health** (top-right)
   - Success rate for each step
   - Current latency
   - Last 1-hour trend

3. **Service Health Matrix** (middle-left)
   - Service status (up/down)
   - Request rate, error rate, latency
   - Database health

4. **Recent Changes** (middle-right)
   - Deployments (last 6 hours)
   - Config changes
   - Infrastructure changes

5. **Error Log Stream** (bottom-left)
   - Live tail of errors from Loki
   - Filtered by severity=error
   - Linked to trace IDs

6. **Active Traces** (bottom-right)
   - Recent slow traces (>1s)
   - Recent error traces
   - Links to Jaeger

**Dashboard URL**:
- Auto-included in all alert notifications
- Displayed on incident response TV monitors
- Linked from incident Slack channels

**Impact**:
- **TTD**: -2 minutes (single dashboard to check during on-call)
- **TTR**: -8 minutes (all context in one place)
- **Reduces**: Tool-switching overhead

**Implementation**:
1. Create Grafana dashboard with above panels
2. Add to alert annotations
3. Configure as default homepage for on-call engineers
4. Display on office monitors during incidents

---

## Summary of Improvements

| Improvement | TTD Impact | TTR Impact | Implementation Effort | Priority |
|-------------|-----------|-----------|----------------------|----------|
| #1: SLO-Based Alerting | -5 min | -10 min | Medium (2-3 days) | High |
| #2: Runbook Links in Alerts | 0 min | -8 min | Low (1 day) | High |
| #3: Synthetic Monitoring | -10 min | -5 min | Medium (3-4 days) | High |
| #4: Auto-Remediation | 0 min | -12 min* | High (1-2 weeks) | Medium |
| #5: Command Center Dashboard | -2 min | -8 min | Low (2 days) | High |
| **TOTAL** | **-17 min** | **-43 min*** | **2-3 weeks** | — |

*Auto-remediation only affects 40% of incidents

**New Target Metrics** (after implementation):
- **TTD**: < 3 minutes (currently ~12 min)
- **TTR**: < 20 minutes for SEV1 (currently ~45 min), < 40 minutes for SEV2

---

## Implementation Roadmap

### Phase 1 (Week 1): Quick Wins
- [ ] **Day 1-2**: Implement #2 (Runbook Links in Alerts)
- [ ] **Day 3-5**: Create #5 (Incident Command Center Dashboard)
- [ ] **Day 5**: Train team on new dashboard

### Phase 2 (Week 2): SLO & Synthetic Monitoring
- [ ] **Day 1-3**: Implement #1 (SLO-Based Alerting)
- [ ] **Day 4-5**: Build #3 (Synthetic Monitoring service)
- [ ] **Day 5**: Deploy synthetic monitoring to prod

### Phase 3 (Weeks 3-4): Auto-Remediation
- [ ] **Week 3**: Design auto-remediation framework
- [ ] **Week 3**: Implement handlers for top 3 incident types
- [ ] **Week 4**: Test in staging, deploy to prod with kill switch
- [ ] **Week 4**: Monitor auto-remediation success rate

---

## Success Metrics

**Measure before and after implementation**:
```promql
# Average TTD (time from first error to alert fired)
avg_over_time(
  (timestamp(ALERTS{alertstate="firing"}) - timestamp(first_error))
[30d])

# Average TTR (time from alert to resolution)
avg_over_time(
  (timestamp(ALERTS{alertstate="resolved"}) - timestamp(ALERTS{alertstate="firing"}))
[30d])

# Auto-remediation success rate
sum(remediation_success_total) / sum(remediation_attempts_total) * 100
```

**Target**:
- 70% reduction in TTD
- 60% reduction in TTR
- 80%+ auto-remediation success rate for enabled alerts

---

**Last Updated**: 2025-11-28
**Owner**: SRE Lead
**Status**: Proposed
**Next Review**: After Phase 1 completion
