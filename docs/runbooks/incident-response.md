# Incident Response Playbook

**Version**: 2.0
**Last Updated**: 2025-11-21
**Classification**: Internal Use

---

## Quick Reference

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **SEV1** | Complete outage | Immediate | Platform down |
| **SEV2** | Major degradation | 15 min | Core feature broken |
| **SEV3** | Minor issue | 1 hour | Non-critical bug |
| **SEV4** | Cosmetic | Next day | UI glitch |

### Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call | PagerDuty | Auto-page |
| SRE Lead | #sre-oncall | 15 min |
| Eng Manager | #engineering | 30 min |
| VP Engineering | Direct | SEV1 only |

---

## Incident Lifecycle

```
Detection → Triage → Response → Resolution → Review
    │          │         │          │          │
    ▼          ▼         ▼          ▼          ▼
  Alert    Severity   Mitigation  Verify    Postmortem
  fires    assigned   actions     service   within 72h
```

---

## Phase 1: Detection & Triage

### Step 1.1: Acknowledge Alert

```bash
# Check current alerts
kubectl get pods -A | grep -v Running
kubectl top nodes

# Quick health check
curl -sf https://api.intelgraph.ai/health | jq .
```

### Step 1.2: Assess Impact

**Questions to answer:**
1. What percentage of users are affected?
2. Is data integrity at risk?
3. Are SLOs being violated?
4. Is there a workaround?

### Step 1.3: Assign Severity

| Criteria | SEV1 | SEV2 | SEV3 |
|----------|------|------|------|
| User impact | >50% | 10-50% | <10% |
| Data loss risk | Yes | Possible | No |
| Revenue impact | High | Medium | Low |
| Workaround | None | Difficult | Available |

### Step 1.4: Open Incident Channel

```
Slack: #incident-YYYYMMDD-brief-description
Zoom: https://zoom.us/j/incident-room
```

---

## Phase 2: Response

### 2.1: Establish Roles

| Role | Responsibility |
|------|----------------|
| **Incident Commander (IC)** | Coordinates response, makes decisions |
| **Technical Lead** | Diagnoses and implements fixes |
| **Communications** | Updates stakeholders |
| **Scribe** | Documents timeline |

### 2.2: Initial Response Actions

#### For API Issues
```bash
# Check API pods
kubectl get pods -l app=intelgraph-api -n intelgraph
kubectl logs -l app=intelgraph-api --tail=100

# Check recent deployments
kubectl rollout history deployment/intelgraph-api

# Rollback if needed
kubectl rollout undo deployment/intelgraph-api
```

#### For Database Issues
```bash
# PostgreSQL
kubectl exec -it postgresql-0 -n intelgraph-db -- \
  psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Neo4j
kubectl exec -it neo4j-0 -n intelgraph-db -- \
  cypher-shell "CALL dbms.listQueries() YIELD query, elapsedTimeMillis WHERE elapsedTimeMillis > 5000 RETURN query;"

# Redis
kubectl exec -it redis-0 -n intelgraph-db -- redis-cli info clients
```

#### For Infrastructure Issues
```bash
# Node status
kubectl get nodes -o wide
kubectl describe node <node-name>

# Resource pressure
kubectl top pods --all-namespaces --sort-by=memory | head -20
kubectl top pods --all-namespaces --sort-by=cpu | head -20
```

### 2.3: Communication Templates

**Initial Status Update (within 5 min of SEV1/2)**
```
INCIDENT: [Brief description]
Status: Investigating
Severity: SEV[1/2]
Impact: [What users are experiencing]
ETA: Assessing
Next update: [Time]
IC: [Name]
```

**Progress Update (every 15-30 min)**
```
INCIDENT UPDATE: [Brief description]
Status: [Investigating/Mitigating/Monitoring]
Progress: [What we've done/learned]
Next steps: [What we're doing next]
ETA: [Time if known]
Next update: [Time]
```

---

## Phase 3: Resolution

### 3.1: Implement Fix

**Rollback Checklist:**
- [ ] Identify last known good state
- [ ] Notify team of rollback
- [ ] Execute rollback
- [ ] Verify service restored
- [ ] Update status page

**Hotfix Checklist:**
- [ ] Create fix branch
- [ ] Test fix locally
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Monitor for 15 min

### 3.2: Verify Resolution

```bash
# Health check
./scripts/health-check.sh

# Smoke test
./scripts/smoke-test.js

# Check error rates
curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=rate(http_requests_total{status=~"5.."}[5m])'
```

### 3.3: Close Incident

**Resolution Message:**
```
INCIDENT RESOLVED: [Brief description]
Duration: [X hours Y minutes]
Resolution: [What fixed it]
Root cause: [If known]
Follow-up: Postmortem scheduled for [date]
```

---

## Phase 4: Post-Incident

### 4.1: Immediate Actions (within 24h)

- [ ] Update incident timeline
- [ ] Collect logs and metrics
- [ ] Schedule postmortem
- [ ] Assign postmortem owner

### 4.2: Postmortem Template

```markdown
# Postmortem: [Incident Title]

## Summary
- **Date**: YYYY-MM-DD
- **Duration**: X hours Y minutes
- **Severity**: SEV[X]
- **Impact**: [User impact summary]

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert fired |
| HH:MM | Incident declared |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

## Root Cause
[Detailed explanation]

## Impact
- Users affected: X
- Requests failed: X
- Data loss: [None/Details]

## What Went Well
1. [Item]
2. [Item]

## What Could Be Improved
1. [Item]
2. [Item]

## Action Items
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| [Action] | [Name] | [Date] | [Open/Done] |

## Lessons Learned
[Key takeaways]
```

### 4.3: Action Item Categories

- **Detection**: Improve monitoring/alerting
- **Response**: Update runbooks/training
- **Prevention**: Code/architecture changes
- **Mitigation**: Reduce blast radius

---

## Specific Runbooks

### Database Failover

```bash
# 1. Verify primary is down
kubectl exec -it postgresql-0 -n intelgraph-db -- pg_isready

# 2. Promote replica
./scripts/dr/failover.sh --component postgresql --target-region us-west-2

# 3. Update connection strings
kubectl rollout restart deployment/intelgraph-api

# 4. Verify
kubectl exec -it postgresql-dr-0 -- psql -U postgres -c "SELECT 1;"
```

### High Traffic/DDoS

```bash
# 1. Enable rate limiting
kubectl apply -f k8s/security/rate-limit-strict.yaml

# 2. Scale up
kubectl scale deployment/intelgraph-api --replicas=10

# 3. Block suspicious IPs
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: emergency-block
spec:
  podSelector:
    matchLabels:
      app: intelgraph-api
  ingress:
  - from:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - SUSPICIOUS_IP/32
EOF

# 4. Enable CDN caching
# Contact CDN provider if needed
```

### Data Corruption

```bash
# 1. STOP ALL WRITES IMMEDIATELY
kubectl scale deployment/intelgraph-api --replicas=0

# 2. Put in maintenance mode
kubectl apply -f k8s/maintenance/maintenance-mode.yaml

# 3. Assess damage
./scripts/dr/assess-corruption.sh

# 4. Identify last good backup
./scripts/dr/list-backups.sh --verified-only

# 5. Restore if needed
./scripts/dr/restore.sh --backup-id <ID> --target-time "YYYY-MM-DD HH:MM:SS"

# 6. Verify data integrity
./scripts/dr/verify-data-integrity.sh

# 7. Gradually restore service
kubectl scale deployment/intelgraph-api --replicas=1
# Monitor for 10 min
kubectl scale deployment/intelgraph-api --replicas=3
```

### Certificate Expiry

```bash
# 1. Check certificate status
kubectl get secret tls-secret -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -dates

# 2. Renew certificate
# If using cert-manager:
kubectl delete secret tls-secret
kubectl annotate certificate intelgraph-tls cert-manager.io/issuer-name-

# If manual:
kubectl create secret tls tls-secret \
  --cert=path/to/new/cert.pem \
  --key=path/to/new/key.pem

# 3. Restart ingress
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx
```

---

## Metrics & SLOs

### Key Metrics to Monitor

```promql
# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Latency P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database connections
pg_stat_activity_count{state="active"}

# Cache hit rate
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)
```

### SLO Targets

| Service | SLI | Target | Burn Rate Alert |
|---------|-----|--------|-----------------|
| API | Availability | 99.9% | 14.4x = SEV2, 6x = SEV3 |
| API | Latency P95 | <500ms | >1s = SEV3 |
| Database | Availability | 99.95% | Any downtime = SEV2 |
| Database | Query latency P95 | <100ms | >500ms = SEV3 |

---

## Appendix

### Useful Commands

```bash
# Get recent events
kubectl get events --sort-by='.lastTimestamp' -A | tail -20

# Find high-CPU pods
kubectl top pods -A --sort-by=cpu | head -10

# Get pod restart counts
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}' | sort -t$'\t' -k3 -rn | head -10

# Describe failing pod
kubectl describe pod <pod-name> | grep -A 20 "Events:"

# Get logs from crashed container
kubectl logs <pod-name> --previous

# Port forward for debugging
kubectl port-forward svc/postgresql 5432:5432 -n intelgraph-db
```

### Links

- **Status Page**: https://status.intelgraph.ai
- **Grafana**: https://grafana.intelgraph.ai
- **Prometheus**: https://prometheus.intelgraph.ai
- **PagerDuty**: https://intelgraph.pagerduty.com
- **Runbooks Index**: [RUNBOOKS/INDEX.md](INDEX.md)

---

**Document Owner**: SRE Team
**Review Cadence**: Quarterly
