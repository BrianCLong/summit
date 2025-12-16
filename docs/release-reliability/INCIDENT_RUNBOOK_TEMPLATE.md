# Incident Runbook Template

> **Template Version**: 0.1.0
> **Last Updated**: 2025-12-06

Copy this template when creating a new runbook for a specific incident type or service.

---

## Runbook: [INCIDENT TYPE / SERVICE NAME]

### Metadata

| Field | Value |
|-------|-------|
| **Runbook ID** | RB-XXXX |
| **Service** | [service-name] |
| **Severity** | P1 / P2 / P3 |
| **Owner** | [team-name] |
| **Last Reviewed** | YYYY-MM-DD |
| **MTTR Target** | XX minutes |

---

## 1. Overview

### Description
[Brief description of the incident type this runbook addresses]

### Impact
- **User Impact**: [How users are affected]
- **Business Impact**: [Revenue, reputation, compliance implications]
- **Blast Radius**: [Which services/regions are affected]

### SLO Affected
- **SLI**: [e.g., API availability, latency p95]
- **SLO Target**: [e.g., 99.9%]
- **Error Budget Burn**: [Expected burn rate during incident]

---

## 2. Detection

### Alerting

| Alert Name | Threshold | Dashboard |
|------------|-----------|-----------|
| [AlertName] | [condition] | [link] |

### Key Metrics to Check

```promql
# Error rate
sum(rate(http_requests_total{service="SERVICE",code=~"5.."}[5m]))
/ sum(rate(http_requests_total{service="SERVICE"}[5m]))

# Latency p95
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{service="SERVICE"}[5m])) by (le))

# Saturation
avg(rate(container_cpu_usage_seconds_total{pod=~"SERVICE-.*"}[5m]))
/ avg(kube_pod_container_resource_limits{pod=~"SERVICE-.*",resource="cpu"})
```

### Symptoms

- [ ] [Symptom 1]
- [ ] [Symptom 2]
- [ ] [Symptom 3]

---

## 3. Triage

### Severity Classification

| Severity | Criteria | Response Time | Escalation |
|----------|----------|---------------|------------|
| P1 - Critical | Complete service outage, data loss risk | Immediate | Page on-call + manager |
| P2 - High | Degraded service, significant user impact | 15 min | Page on-call |
| P3 - Medium | Partial degradation, workaround available | 1 hour | Slack notification |

### Initial Assessment Checklist

- [ ] Confirm incident is real (not false positive)
- [ ] Determine affected scope (users, regions, services)
- [ ] Check recent deployments (last 2 hours)
- [ ] Check infrastructure changes
- [ ] Identify related incidents

### Quick Diagnostic Commands

```bash
# Check pod status
kubectl get pods -n production -l app=SERVICE

# Check recent events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Check logs (last 5 minutes)
kubectl logs -n production -l app=SERVICE --since=5m | tail -100

# Check recent deployments
kubectl rollout history deployment/SERVICE -n production

# Check Argo rollout status
kubectl argo rollouts status SERVICE -n production
```

---

## 4. Mitigation

### Immediate Actions

#### Option A: Rollback (Recommended for deployment-related issues)

```bash
# 1. Abort any active rollout
kubectl argo rollouts abort SERVICE -n production

# 2. Rollback to previous version
kubectl argo rollouts undo SERVICE -n production

# 3. Verify rollback
kubectl argo rollouts status SERVICE -n production

# 4. Confirm health
curl -sf http://SERVICE.production:4000/health
```

**Expected Time**: 2-5 minutes
**Success Criteria**: Health endpoint returns 200, error rate drops below 1%

#### Option B: Scale Up (For capacity issues)

```bash
# 1. Increase replicas
kubectl scale deployment SERVICE -n production --replicas=10

# 2. Verify pods running
kubectl get pods -n production -l app=SERVICE

# 3. Check load distribution
kubectl top pods -n production -l app=SERVICE
```

**Expected Time**: 3-5 minutes
**Success Criteria**: All pods running, CPU/memory below 70%

#### Option C: Circuit Breaker (For dependency issues)

```bash
# 1. Enable circuit breaker
kubectl annotate svc SERVICE -n production circuit-breaker=enabled

# 2. Verify fallback active
curl -sf http://SERVICE.production:4000/health/detailed | jq '.circuitBreakers'

# 3. Monitor fallback behavior
kubectl logs -n production -l app=SERVICE --since=1m | grep -i circuit
```

**Expected Time**: 1-2 minutes
**Success Criteria**: Circuit breaker state is "open", fallback responses being served

#### Option D: Traffic Shift (For regional issues)

```bash
# 1. Update traffic weights
kubectl patch virtualservice SERVICE -n production --type=merge -p '
spec:
  http:
  - route:
    - destination:
        host: SERVICE
        subset: stable
      weight: 100
    - destination:
        host: SERVICE
        subset: canary
      weight: 0
'

# 2. Verify traffic shift
kubectl get virtualservice SERVICE -n production -o yaml
```

**Expected Time**: 1-2 minutes
**Success Criteria**: All traffic on stable subset

---

## 5. Diagnosis

### Root Cause Analysis

#### Check Application Logs

```bash
# Search for errors
kubectl logs -n production -l app=SERVICE --since=15m | grep -i error

# Search for exceptions
kubectl logs -n production -l app=SERVICE --since=15m | grep -i exception

# Check for OOM kills
kubectl get events -n production --field-selector reason=OOMKilled
```

#### Check Dependencies

```bash
# Database connectivity
kubectl exec -n production deploy/SERVICE -- curl -sf http://postgres:5432/health

# Redis connectivity
kubectl exec -n production deploy/SERVICE -- redis-cli -h redis ping

# Neo4j connectivity
kubectl exec -n production deploy/SERVICE -- curl -sf http://neo4j:7474
```

#### Check Resource Usage

```bash
# Pod resources
kubectl top pods -n production -l app=SERVICE

# Node resources
kubectl top nodes

# PVC usage
kubectl exec -n production deploy/SERVICE -- df -h
```

### Common Root Causes

| Symptom | Likely Cause | Verification | Fix |
|---------|--------------|--------------|-----|
| 503 errors | Pod crash loop | `kubectl describe pod` | Check logs, rollback |
| High latency | Database slow | Check DB metrics | Scale DB, optimize query |
| OOM kills | Memory leak | Check memory graphs | Increase limits, fix leak |
| Connection refused | Service not ready | Check readiness probe | Wait or restart pods |
| Timeout errors | Dependency down | Check dependency health | Failover, circuit breaker |

---

## 6. Recovery

### Recovery Steps

1. **Confirm mitigation is working**
   ```bash
   # Check error rate is decreasing
   curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{service=\"SERVICE\",code=~\"5..\"}[1m]))"
   ```

2. **Verify service health**
   ```bash
   # All health checks passing
   curl -sf http://SERVICE.production:4000/health
   curl -sf http://SERVICE.production:4000/health/detailed
   ```

3. **Confirm user impact resolved**
   - Check synthetic monitoring
   - Verify golden path test passing
   - Check customer-facing metrics

4. **Stabilize**
   - Monitor for 15 minutes
   - Confirm no recurring issues
   - Update incident status

### Recovery Verification Checklist

- [ ] Error rate below 1%
- [ ] Latency p95 within SLO
- [ ] All pods healthy
- [ ] No active alerts
- [ ] Synthetic checks passing
- [ ] Golden path test passing

---

## 7. Communication

### Stakeholder Updates

| Audience | Channel | Frequency | Template |
|----------|---------|-----------|----------|
| Engineering | #incidents | Every 15 min | Status update |
| Leadership | Email | Every 30 min | Executive summary |
| Customers | Status page | Major changes | Customer-facing |
| On-call | PagerDuty | Escalations | Alert details |

### Status Update Template

```
**Incident Update - [TIME]**

**Status**: Investigating / Mitigating / Monitoring / Resolved

**Impact**: [Current user impact]

**Summary**: [What's happening]

**Actions Taken**:
- [Action 1]
- [Action 2]

**Next Steps**:
- [Next action]
- [ETA if known]

**Next Update**: [Time]
```

### Escalation Path

```
On-Call Engineer (0-15 min)
        │
        ▼
Team Lead (15-30 min for P1)
        │
        ▼
Engineering Manager (30-60 min for P1)
        │
        ▼
VP Engineering (60+ min for P1, or P1 with data loss)
```

---

## 8. Post-Incident

### Immediate Actions

- [ ] Update incident ticket with timeline
- [ ] Capture evidence (logs, metrics, screenshots)
- [ ] Document what worked and what didn't
- [ ] Schedule blameless postmortem (within 48 hours for P1/P2)

### Evidence Collection

```bash
# Export relevant logs
kubectl logs -n production -l app=SERVICE --since=1h > incident-logs.txt

# Export events
kubectl get events -n production -o json > incident-events.json

# Capture metrics
curl "http://prometheus:9090/api/v1/query_range?query=rate(http_requests_total{service=\"SERVICE\"}[5m])&start=$(date -d '1 hour ago' +%s)&end=$(date +%s)&step=60" > incident-metrics.json

# Export rollout history
kubectl argo rollouts history SERVICE -n production > rollout-history.txt
```

### Postmortem Template

See [Postmortem Template](./POSTMORTEM_TEMPLATE.md)

---

## 9. MTTR Expectations

| Severity | Detection | Triage | Mitigation | Recovery | Total MTTR |
|----------|-----------|--------|------------|----------|------------|
| P1 | <5 min | <10 min | <15 min | <30 min | <60 min |
| P2 | <15 min | <15 min | <30 min | <60 min | <2 hours |
| P3 | <1 hour | <1 hour | <2 hours | <4 hours | <8 hours |

---

## 10. Related Resources

### Dashboards
- [Service Dashboard](http://grafana:3001/d/SERVICE)
- [SLO Dashboard](http://grafana:3001/d/slo-overview)
- [Golden Signals](http://grafana:3001/d/golden-signals)

### Documentation
- [Service Architecture](../architecture/SERVICE.md)
- [Dependency Map](../architecture/dependencies.md)
- [SLO Definitions](./slo-definitions.md)

### Contacts
| Role | Name | Slack | PagerDuty |
|------|------|-------|-----------|
| Service Owner | @team | #team-channel | @team-oncall |
| SRE | @sre-team | #sre | @sre-oncall |
| On-Call | - | #incidents | @oncall |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | YYYY-MM-DD | [Author] | Initial version |

---

*Review this runbook quarterly or after any P1 incident involving this service.*
