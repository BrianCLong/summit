# Incident Response Playbook - Summit IntelGraph Platform

> **Version**: 1.0.0
> **Last Updated**: 2025-11-21
> **Owner**: Platform Engineering
> **Review Cycle**: Quarterly

---

## Table of Contents

1. [Overview](#1-overview)
2. [Severity Definitions](#2-severity-definitions)
3. [Detection](#3-detection)
4. [Triage and Roles](#4-triage-and-roles)
5. [Containment and Mitigation](#5-containment-and-mitigation)
6. [Root Cause Analysis and Post-Mortem](#6-root-cause-analysis-and-post-mortem)
7. [RACI Matrix](#7-raci-matrix)
8. [Templates](#8-templates)
9. [Observability and Alerting Improvements](#9-observability-and-alerting-improvements)
10. [Appendix](#10-appendix)

---

## 1. Overview

This playbook provides structured procedures for responding to application outages affecting the Summit IntelGraph platform. It covers:

- **GraphQL API Server** (port 4000)
- **React Web Frontend** (port 3000)
- **Background Job Processors** (Bull/BullMQ queues)
- **AI/ML Extraction Services**
- **Database Services** (Neo4j, PostgreSQL, TimescaleDB, Redis)

### Goals

| Metric | Sev-1 Target | Sev-2 Target |
|--------|--------------|--------------|
| Time to Detect (TTD) | < 2 minutes | < 5 minutes |
| Time to Acknowledge (TTA) | < 5 minutes | < 15 minutes |
| Time to Mitigate (TTM) | < 30 minutes | < 2 hours |
| Time to Resolve (TTR) | < 4 hours | < 24 hours |

---

## 2. Severity Definitions

### Severity 1 (Critical) - P0

**Definition**: Complete service outage or critical functionality unavailable affecting all users.

**Examples**:
- GraphQL API completely unresponsive (HTTP 5xx for all requests)
- Neo4j database unavailable (no graph queries possible)
- Authentication system failure (no users can log in)
- Data corruption or loss detected
- Security breach confirmed
- All background job queues stalled

**Response Time**: Immediate (24/7 on-call engagement)

**Communication**: Stakeholder updates every 15 minutes

### Severity 2 (High) - P1

**Definition**: Major functionality degraded or unavailable affecting significant user population.

**Examples**:
- API latency > 5s (p95) for extended period
- Copilot AI analysis unavailable
- Graph visualization not rendering
- Partial database connectivity issues
- Background job processing delayed > 30 minutes
- Single critical service degraded (Redis, PostgreSQL)

**Response Time**: Within 15 minutes (business hours), 30 minutes (off-hours)

**Communication**: Stakeholder updates every 30 minutes

### Severity 3 (Medium) - P2

**Definition**: Minor functionality issues with workarounds available.

**Examples**:
- Non-critical feature unavailable
- Performance degradation within SLO but trending negative
- Intermittent errors < 1% of requests
- Single non-critical background job failing

**Response Time**: Within 4 hours (business hours)

**Communication**: Daily updates until resolved

---

## 3. Detection

### 3.1 Automated Detection Sources

#### Primary Alerting (AlertManager)

```yaml
# Critical alerts trigger Sev-1 response
- alert: APICompletelyDown
  expr: up{job="intelgraph-server"} == 0
  for: 1m
  labels:
    severity: critical

- alert: Neo4jUnavailable
  expr: neo4j_database_available == 0
  for: 30s
  labels:
    severity: critical

- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    / sum(rate(http_requests_total[5m])) > 0.05
  for: 2m
  labels:
    severity: critical

- alert: AllQueuesStalled
  expr: sum(maestro_queue_depth) > 1000 and sum(rate(maestro_jobs_succeeded_total[5m])) == 0
  for: 5m
  labels:
    severity: critical
```

#### Secondary Alerting (Sev-2)

```yaml
- alert: HighLatency
  expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
  for: 5m
  labels:
    severity: high

- alert: DatabaseConnectionPoolExhausted
  expr: pg_stat_activity_count / pg_settings_max_connections > 0.9
  for: 2m
  labels:
    severity: high

- alert: RedisMemoryHigh
  expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
  for: 5m
  labels:
    severity: high

- alert: JobProcessingDelayed
  expr: maestro_schedule_latency_ms > 30000
  for: 10m
  labels:
    severity: high
```

### 3.2 Health Check Endpoints

| Endpoint | Purpose | Check Interval |
|----------|---------|----------------|
| `/health` | Basic liveness | 10s |
| `/health/ready` | Readiness (all deps) | 15s |
| `/health/live` | Kubernetes liveness | 10s |
| `/health/detailed` | Full dependency check | 30s |
| `/metrics` | Prometheus scrape | 15s |

### 3.3 Manual Detection Indicators

- Spike in support tickets
- Social media mentions
- Partner/customer direct reports
- Failed deployment notifications
- Security scanner alerts

### 3.4 Detection Checklist

```markdown
[ ] Check Grafana dashboards: summit-golden-path, qos-tenant-health
[ ] Verify AlertManager for active alerts
[ ] Check `/health/detailed` endpoint response
[ ] Review recent deployments (last 2 hours)
[ ] Check external status page (if applicable)
[ ] Verify DNS resolution
[ ] Check SSL certificate validity
```

---

## 4. Triage and Roles

### 4.1 Incident Roles

#### Incident Commander (IC)

**Responsibilities**:
- Owns incident resolution end-to-end
- Makes decisions on mitigation strategies
- Coordinates between technical teams
- Escalates when needed
- Declares incident resolved

**Required Skills**: System architecture knowledge, decision-making under pressure

#### Technical Lead (TL)

**Responsibilities**:
- Leads technical investigation
- Directs debugging efforts
- Implements fixes
- Validates resolution

**Required Skills**: Deep platform expertise, debugging skills

#### Communications Lead (Comms)

**Responsibilities**:
- Sends stakeholder updates
- Manages status page
- Coordinates with support team
- Documents timeline

**Required Skills**: Clear communication, stakeholder management

#### Scribe

**Responsibilities**:
- Documents all actions taken
- Records timeline of events
- Captures decisions and rationale
- Prepares post-mortem notes

**Required Skills**: Attention to detail, fast typing

### 4.2 Triage Decision Tree

```
START: Alert received or issue reported
    │
    ▼
┌─────────────────────────────────────┐
│ Can users access the application?   │
└─────────────────────────────────────┘
    │ NO                    │ YES
    ▼                       ▼
┌─────────┐     ┌─────────────────────────────┐
│ SEV-1   │     │ Is core functionality       │
│ CRITICAL│     │ (investigations, entities,  │
└─────────┘     │  relationships) working?    │
                └─────────────────────────────┘
                    │ NO              │ YES
                    ▼                 ▼
              ┌─────────┐     ┌─────────────────────┐
              │ SEV-1   │     │ Are >10% of users   │
              │ CRITICAL│     │ affected?           │
              └─────────┘     └─────────────────────┘
                                  │ YES        │ NO
                                  ▼            ▼
                            ┌─────────┐  ┌─────────┐
                            │ SEV-2   │  │ SEV-3   │
                            │ HIGH    │  │ MEDIUM  │
                            └─────────┘  └─────────┘
```

### 4.3 Triage Procedure

#### Step 1: Initial Assessment (2 minutes)

```bash
# Quick health check
curl -s http://localhost:4000/health/detailed | jq .

# Check service status
docker compose -f docker-compose.dev.yml ps

# For Kubernetes
kubectl get pods -n intelgraph
kubectl get events -n intelgraph --sort-by='.lastTimestamp' | tail -20
```

#### Step 2: Identify Affected Components (5 minutes)

| Component | Health Check | Logs |
|-----------|--------------|------|
| API Server | `curl localhost:4000/health` | `docker logs intelgraph-server` |
| Neo4j | `curl localhost:7474` | `docker logs neo4j` |
| PostgreSQL | `pg_isready -h localhost -p 5432` | `docker logs postgres` |
| Redis | `redis-cli ping` | `docker logs redis` |
| Frontend | `curl localhost:3000` | `docker logs intelgraph-web` |

#### Step 3: Assign Roles

```markdown
## Incident Role Assignment

- **Incident Commander**: [Name]
- **Technical Lead**: [Name]
- **Communications Lead**: [Name]
- **Scribe**: [Name]

Incident Channel: #incident-YYYY-MM-DD-NNN
```

#### Step 4: Establish Communication

1. Create incident Slack channel: `#incident-YYYY-MM-DD-NNN`
2. Start incident bridge call (if Sev-1)
3. Post initial assessment to channel
4. Notify relevant stakeholders

---

## 5. Containment and Mitigation

### 5.1 Immediate Actions by Component

#### API Server Unresponsive

```bash
# 1. Check if process is running
docker compose ps intelgraph-server

# 2. Check resource usage
docker stats intelgraph-server --no-stream

# 3. Check for OOM kills
dmesg | grep -i "killed process"

# 4. Restart with resource limits
docker compose restart intelgraph-server

# 5. If persistent, rollback deployment
./scripts/auto-rollback.sh
```

#### Database Connection Issues

```bash
# Neo4j
# 1. Check connection pool
curl -s http://localhost:4000/metrics | grep neo4j_pool

# 2. Check Neo4j status
docker exec neo4j cypher-shell "CALL dbms.components()"

# 3. Clear stuck transactions
docker exec neo4j cypher-shell "CALL dbms.listTransactions()"

# PostgreSQL
# 1. Check connections
docker exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Kill idle connections
docker exec postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '10 minutes';"

# 3. Restart if necessary
docker compose restart postgres
```

#### Redis Issues

```bash
# 1. Check memory usage
docker exec redis redis-cli INFO memory

# 2. Check connected clients
docker exec redis redis-cli CLIENT LIST

# 3. Flush cache if memory critical (data loss acceptable)
docker exec redis redis-cli FLUSHDB

# 4. Restart Redis
docker compose restart redis
```

#### High Latency

```bash
# 1. Check current request rate
curl -s http://localhost:4000/metrics | grep http_requests_total

# 2. Enable rate limiting (if not active)
# Update environment: RATE_LIMIT_ENABLED=true

# 3. Scale horizontally (Kubernetes)
kubectl scale deployment intelgraph-server --replicas=5 -n intelgraph

# 4. Check slow queries
docker exec postgres psql -U postgres -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### Background Job Queue Stalled

```bash
# 1. Check queue depth
curl -s http://localhost:4000/metrics | grep maestro_queue_depth

# 2. Check for stuck jobs
docker exec redis redis-cli LLEN bull:default:wait

# 3. Clear failed jobs (if acceptable)
docker exec redis redis-cli DEL bull:default:failed

# 4. Restart job workers
docker compose restart maestro-worker
```

### 5.2 Rollback Procedures

#### Application Rollback

```bash
# Automated rollback to last known good state
./scripts/auto-rollback.sh

# Manual rollback steps
git log --oneline -10  # Find last good commit
git checkout <commit-hash>
docker compose build intelgraph-server
docker compose up -d intelgraph-server
```

#### Database Rollback

```bash
# Neo4j restore from backup
./scripts/restore-neo4j.sh --backup-id <backup-id>

# PostgreSQL point-in-time recovery
./scripts/restore-postgres.sh --target-time "2025-01-01 12:00:00"
```

### 5.3 Containment Checklist

```markdown
## Containment Actions Taken

- [ ] Identified affected component(s)
- [ ] Isolated failing component (if possible)
- [ ] Enabled circuit breaker / feature flag
- [ ] Scaled resources (if capacity issue)
- [ ] Rolled back deployment (if recent change)
- [ ] Restored from backup (if data issue)
- [ ] Engaged vendor support (if third-party)
- [ ] Documented all actions with timestamps
```

---

## 6. Root Cause Analysis and Post-Mortem

### 6.1 RCA Process

#### Timeline Reconstruction

```markdown
| Time (UTC) | Event | Source | Action Taken |
|------------|-------|--------|--------------|
| HH:MM | First alert fired | AlertManager | |
| HH:MM | IC engaged | On-call | |
| HH:MM | Root cause identified | Investigation | |
| HH:MM | Fix deployed | Deployment | |
| HH:MM | Service restored | Monitoring | |
```

#### 5 Whys Analysis

```markdown
**Problem**: [Describe the incident]

1. **Why** did the service fail?
   → [Answer]

2. **Why** did [Answer 1] happen?
   → [Answer]

3. **Why** did [Answer 2] happen?
   → [Answer]

4. **Why** did [Answer 3] happen?
   → [Answer]

5. **Why** did [Answer 4] happen?
   → [Root Cause]
```

### 6.2 Post-Mortem Schedule

| Severity | Post-Mortem Due | Attendees |
|----------|-----------------|-----------|
| Sev-1 | Within 48 hours | IC, TL, Eng Manager, Product |
| Sev-2 | Within 1 week | IC, TL, Eng Manager |
| Sev-3 | Within 2 weeks | IC, TL |

### 6.3 Post-Mortem Meeting Agenda

1. **Incident Summary** (5 min)
2. **Timeline Review** (10 min)
3. **Root Cause Analysis** (15 min)
4. **What Went Well** (5 min)
5. **What Could Be Improved** (10 min)
6. **Action Items** (10 min)
7. **Follow-up Schedule** (5 min)

### 6.4 Action Item Tracking

All action items from post-mortems must be:
- Assigned an owner
- Given a due date
- Tracked in the project management system
- Reviewed in weekly engineering sync

---

## 7. RACI Matrix

### 7.1 Incident Response RACI

| Activity | On-Call | IC | Tech Lead | Comms | Scribe | Eng Manager | Exec |
|----------|---------|-----|-----------|-------|--------|-------------|------|
| **Detection** |
| Monitor alerts | R | I | I | - | - | - | - |
| Acknowledge alert | R/A | I | I | - | - | - | - |
| Initial triage | R | A | C | - | I | I | - |
| **Response** |
| Declare incident | C | R/A | C | I | I | I | I |
| Assign roles | - | R/A | C | I | I | C | - |
| Technical investigation | C | A | R | - | I | I | - |
| Implement fix | C | A | R | - | I | I | - |
| Approve rollback | I | R/A | C | - | I | C | I* |
| **Communication** |
| Internal updates | I | A | C | R | I | I | I |
| Customer updates | I | A | C | R | I | C | I |
| Exec notification (Sev-1) | - | R | I | A | I | C | I |
| **Resolution** |
| Declare resolved | I | R/A | C | I | I | I | I |
| Document timeline | I | C | C | I | R/A | I | - |
| **Post-Mortem** |
| Schedule meeting | - | R | C | I | I | A | I |
| Write post-mortem | I | A | R | C | C | C | I |
| Assign action items | - | C | R | - | I | A | I |
| Track action items | - | I | R | - | - | A | I |

**Legend**:
- **R** = Responsible (does the work)
- **A** = Accountable (owns the outcome)
- **C** = Consulted (provides input)
- **I** = Informed (kept in the loop)
- **\*** = For Sev-1 data-affecting rollbacks only

### 7.2 Escalation Matrix

| Condition | Escalate To | Timeframe |
|-----------|-------------|-----------|
| Sev-1 not mitigated in 30 min | Engineering Manager | Immediate |
| Sev-1 not resolved in 2 hours | Director of Engineering | Immediate |
| Sev-1 data loss confirmed | CTO + Legal | Immediate |
| Sev-2 not mitigated in 2 hours | Engineering Manager | Within 15 min |
| Customer-impacting for >1 hour | Customer Success Lead | Immediate |
| Security incident suspected | Security Team Lead | Immediate |

---

## 8. Templates

### 8.1 Incident Ticket Template

```markdown
## Incident Ticket

**Incident ID**: INC-YYYY-MM-DD-NNN
**Created**: YYYY-MM-DD HH:MM UTC
**Status**: [INVESTIGATING | IDENTIFIED | MITIGATING | RESOLVED]
**Severity**: [SEV-1 | SEV-2 | SEV-3]

### Summary
[One-line description of the incident]

### Impact
- **Users Affected**: [All / Percentage / Specific segment]
- **Functionality Affected**: [List affected features]
- **Business Impact**: [Revenue / Reputation / Compliance]

### Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | [Event description] |

### Current Status
[What is happening right now]

### Roles Assigned
- **Incident Commander**: @name
- **Technical Lead**: @name
- **Communications**: @name
- **Scribe**: @name

### Affected Systems
- [ ] GraphQL API
- [ ] Web Frontend
- [ ] Neo4j Database
- [ ] PostgreSQL Database
- [ ] Redis Cache
- [ ] Background Jobs
- [ ] AI/ML Services

### Actions Taken
1. [Action with timestamp]
2. [Action with timestamp]

### Next Steps
1. [Planned action]
2. [Planned action]

### Related Links
- Slack Channel: #incident-YYYY-MM-DD-NNN
- Grafana Dashboard: [link]
- AlertManager: [link]
- Related PRs: [links]

### Post-Incident
- [ ] Post-mortem scheduled
- [ ] Action items created
- [ ] Documentation updated
```

### 8.2 Stakeholder Update Template

#### Initial Notification (Within 15 min of Sev-1, 30 min of Sev-2)

```markdown
## Incident Notification

**Severity**: [SEV-1 | SEV-2]
**Status**: INVESTIGATING
**Time**: YYYY-MM-DD HH:MM UTC

### What's Happening
[Brief description of the issue]

### Impact
[Who/what is affected]

### Current Actions
[What the team is doing]

### Next Update
[Expected time of next update]

---
Incident Commander: [Name]
Incident Channel: #incident-YYYY-MM-DD-NNN
```

#### Progress Update (Every 15 min for Sev-1, 30 min for Sev-2)

```markdown
## Incident Update #[N]

**Incident ID**: INC-YYYY-MM-DD-NNN
**Severity**: [SEV-1 | SEV-2]
**Status**: [INVESTIGATING | IDENTIFIED | MITIGATING]
**Time**: YYYY-MM-DD HH:MM UTC

### Current Status
[What has changed since last update]

### Root Cause
[If identified: brief description]
[If not: "Still investigating"]

### Actions Taken Since Last Update
- [Action 1]
- [Action 2]

### Next Steps
- [Planned action 1]
- [Planned action 2]

### Estimated Resolution
[Time estimate if known, or "Unknown at this time"]

### Next Update
[Expected time of next update]

---
Incident Commander: [Name]
```

#### Resolution Notification

```markdown
## Incident Resolved

**Incident ID**: INC-YYYY-MM-DD-NNN
**Severity**: [SEV-1 | SEV-2]
**Status**: RESOLVED
**Time**: YYYY-MM-DD HH:MM UTC

### Summary
[Brief description of what happened]

### Impact Duration
- **Start**: YYYY-MM-DD HH:MM UTC
- **End**: YYYY-MM-DD HH:MM UTC
- **Total Duration**: [X hours Y minutes]

### Root Cause
[Brief description of root cause]

### Resolution
[What was done to resolve]

### Preventive Measures
[High-level description of what will be done to prevent recurrence]

### Post-Mortem
Post-mortem meeting scheduled for: [Date/Time]
Post-mortem document will be shared by: [Date]

---
Incident Commander: [Name]
```

### 8.3 Post-Mortem Document Template

```markdown
# Post-Mortem: [Incident Title]

**Incident ID**: INC-YYYY-MM-DD-NNN
**Date**: YYYY-MM-DD
**Authors**: [Names]
**Status**: [DRAFT | FINAL]

---

## Executive Summary

[2-3 sentence summary of what happened, impact, and resolution]

---

## Impact

| Metric | Value |
|--------|-------|
| Duration | X hours Y minutes |
| Users Affected | N (X% of total) |
| Requests Failed | N |
| Revenue Impact | $X (if applicable) |
| SLA Impact | X% (if applicable) |

### Affected Services
- [Service 1]: [Impact description]
- [Service 2]: [Impact description]

---

## Timeline (All times UTC)

| Time | Event | Source |
|------|-------|--------|
| HH:MM | [Triggering event] | [Log/Alert/Report] |
| HH:MM | First alert fired | AlertManager |
| HH:MM | On-call acknowledged | PagerDuty |
| HH:MM | Incident declared | IC |
| HH:MM | Root cause identified | Investigation |
| HH:MM | Mitigation applied | Deployment |
| HH:MM | Service restored | Monitoring |
| HH:MM | Incident resolved | IC |

---

## Root Cause Analysis

### Summary
[One paragraph describing the root cause]

### Technical Details
[Detailed technical explanation with code snippets, logs, metrics if relevant]

### Contributing Factors
1. [Factor 1]
2. [Factor 2]
3. [Factor 3]

### 5 Whys
1. **Why** did [symptom] occur?
   → [Answer]
2. **Why** did [answer 1] happen?
   → [Answer]
3. **Why** did [answer 2] happen?
   → [Answer]
4. **Why** did [answer 3] happen?
   → [Answer]
5. **Why** did [answer 4] happen?
   → **Root Cause**: [Final answer]

---

## Detection

### How Was It Detected?
[Alert / Customer report / Internal discovery]

### Time to Detect
[Duration from incident start to first alert/report]

### Detection Gaps
[What could have detected this sooner?]

---

## Response

### What Went Well
- [Positive aspect 1]
- [Positive aspect 2]
- [Positive aspect 3]

### What Could Be Improved
- [Improvement area 1]
- [Improvement area 2]
- [Improvement area 3]

### Response Metrics

| Metric | Target | Actual | Met? |
|--------|--------|--------|------|
| Time to Detect | < 2 min | X min | Y/N |
| Time to Acknowledge | < 5 min | X min | Y/N |
| Time to Mitigate | < 30 min | X min | Y/N |
| Time to Resolve | < 4 hr | X hr | Y/N |

---

## Action Items

| ID | Action | Owner | Priority | Due Date | Status |
|----|--------|-------|----------|----------|--------|
| 1 | [Action description] | @name | P0/P1/P2 | YYYY-MM-DD | TODO |
| 2 | [Action description] | @name | P0/P1/P2 | YYYY-MM-DD | TODO |
| 3 | [Action description] | @name | P0/P1/P2 | YYYY-MM-DD | TODO |

### Action Item Categories
- **Prevent**: Actions to prevent this specific incident from recurring
- **Detect**: Actions to detect this type of issue faster
- **Mitigate**: Actions to reduce impact when similar issues occur
- **Process**: Actions to improve incident response process

---

## Lessons Learned

### Technical Lessons
1. [Lesson 1]
2. [Lesson 2]

### Process Lessons
1. [Lesson 1]
2. [Lesson 2]

---

## Appendix

### Related Links
- Incident Slack Channel: [link]
- Grafana Dashboard: [link]
- Relevant PRs: [links]
- Related Incidents: [links]

### Supporting Data
[Graphs, logs, or other supporting information]

---

## Sign-Off

| Role | Name | Date |
|------|------|------|
| Incident Commander | | |
| Technical Lead | | |
| Engineering Manager | | |
```

---

## 9. Observability and Alerting Improvements

### 9.1 Current State Assessment

Based on the existing observability setup, the following improvements are recommended:

### 9.2 Recommended Metric Additions

#### Application Metrics

```typescript
// Add to server/src/shared/metrics/index.ts

// Request queue depth
const requestQueueDepth = new promClient.Gauge({
  name: 'intelgraph_request_queue_depth',
  help: 'Number of requests waiting to be processed',
  labelNames: ['endpoint']
});

// Circuit breaker state
const circuitBreakerState = new promClient.Gauge({
  name: 'intelgraph_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
  labelNames: ['service']
});

// GraphQL operation latency by type
const graphqlOperationDuration = new promClient.Histogram({
  name: 'intelgraph_graphql_operation_duration_seconds',
  help: 'GraphQL operation duration in seconds',
  labelNames: ['operation_name', 'operation_type'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

// Active WebSocket connections
const activeWebsocketConnections = new promClient.Gauge({
  name: 'intelgraph_websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

// Cache hit ratio
const cacheHitRatio = new promClient.Gauge({
  name: 'intelgraph_cache_hit_ratio',
  help: 'Cache hit ratio for Redis cache',
  labelNames: ['cache_type']
});
```

#### Database Metrics

```yaml
# Add to observability/prometheus.yml

- job_name: 'neo4j-detailed'
  static_configs:
    - targets: ['neo4j:2004']
  metric_relabel_configs:
    - source_labels: [__name__]
      regex: 'neo4j_bolt_connections_.*|neo4j_transaction_.*|neo4j_page_cache_.*'
      action: keep

- job_name: 'postgres-detailed'
  static_configs:
    - targets: ['postgres_exporter:9187']
  params:
    collect[]:
      - pg_stat_statements
      - pg_stat_activity
      - pg_locks
```

### 9.3 Recommended Alert Rules

```yaml
# Add to monitoring/alertmanager-rules.yml

groups:
  - name: intelgraph-slo-alerts
    rules:
      # Error Budget Burn Rate
      - alert: ErrorBudgetBurnRateCritical
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            / sum(rate(http_requests_total[1h]))
          ) > (14.4 * 0.001)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning too fast"
          description: "Error rate is {{ $value | humanizePercentage }} - burning error budget at 14.4x normal rate"

      # Latency SLO Breach
      - alert: LatencySLOBreach
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 0.2
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "P95 latency exceeding 200ms SLO"
          description: "P95 latency is {{ $value | humanizeDuration }}"

      # Apdex Score Low
      - alert: ApdexScoreLow
        expr: |
          (
            sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
            + sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) / 2
          ) / sum(rate(http_request_duration_seconds_count[5m])) < 0.9
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "Apdex score below 0.9"

  - name: intelgraph-capacity-alerts
    rules:
      # Memory Pressure
      - alert: MemoryPressureHigh
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Memory usage above 90%"

      # CPU Saturation
      - alert: CPUSaturationHigh
        expr: |
          avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) < 0.1
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "CPU saturation above 90%"

      # Disk Space Low
      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "Disk space below 15%"

  - name: intelgraph-dependency-alerts
    rules:
      # Neo4j Connection Pool Exhausted
      - alert: Neo4jConnectionPoolExhausted
        expr: neo4j_bolt_connections_idle == 0 and neo4j_bolt_connections_in_use > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Neo4j connection pool exhausted"

      # PostgreSQL Replication Lag
      - alert: PostgresReplicationLag
        expr: pg_replication_lag_seconds > 30
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "PostgreSQL replication lag above 30s"

      # Redis Memory Fragmentation
      - alert: RedisMemoryFragmentationHigh
        expr: redis_memory_fragmentation_ratio > 1.5
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory fragmentation ratio high"
```

### 9.4 Dashboard Improvements

```json
// Add to observability/grafana/dashboards/incident-response.json
{
  "title": "Incident Response Dashboard",
  "panels": [
    {
      "title": "Service Health Overview",
      "type": "stat",
      "targets": [
        {"expr": "up{job='intelgraph-server'}", "legendFormat": "API"},
        {"expr": "neo4j_database_available", "legendFormat": "Neo4j"},
        {"expr": "pg_up", "legendFormat": "PostgreSQL"},
        {"expr": "redis_up", "legendFormat": "Redis"}
      ]
    },
    {
      "title": "Error Rate (5m)",
      "type": "timeseries",
      "targets": [
        {"expr": "sum(rate(http_requests_total{status=~'5..'}[5m])) / sum(rate(http_requests_total[5m])) * 100"}
      ]
    },
    {
      "title": "Latency Percentiles",
      "type": "timeseries",
      "targets": [
        {"expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))", "legendFormat": "p50"},
        {"expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))", "legendFormat": "p95"},
        {"expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))", "legendFormat": "p99"}
      ]
    },
    {
      "title": "Active Connections",
      "type": "timeseries",
      "targets": [
        {"expr": "neo4j_bolt_connections_in_use", "legendFormat": "Neo4j"},
        {"expr": "pg_stat_activity_count", "legendFormat": "PostgreSQL"},
        {"expr": "redis_connected_clients", "legendFormat": "Redis"}
      ]
    },
    {
      "title": "Queue Depth",
      "type": "timeseries",
      "targets": [
        {"expr": "sum(maestro_queue_depth) by (queue)"}
      ]
    },
    {
      "title": "Recent Deployments",
      "type": "annotations",
      "datasource": "-- Grafana --"
    }
  ]
}
```

### 9.5 Log Aggregation Improvements

```typescript
// Enhance server/src/shared/logging/Logger.ts

// Add correlation ID to all logs
const correlationIdMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Attach to async context for automatic inclusion in logs
  asyncLocalStorage.run({ correlationId }, () => next());
};

// Add structured error context
const logError = (error: Error, context: Record<string, any> = {}) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    errorName: error.name,
    ...context,
    correlationId: asyncLocalStorage.getStore()?.correlationId
  });
};
```

### 9.6 Synthetic Monitoring

```yaml
# Add to monitoring/synthetic-checks.yml

checks:
  - name: api-health
    type: http
    url: http://localhost:4000/health
    interval: 30s
    timeout: 5s
    assertions:
      - status == 200
      - responseTime < 500

  - name: graphql-query
    type: http
    url: http://localhost:4000/graphql
    method: POST
    headers:
      Content-Type: application/json
    body: '{"query": "{ __typename }"}'
    interval: 60s
    timeout: 10s
    assertions:
      - status == 200
      - json.data.__typename == "Query"

  - name: create-investigation-flow
    type: http
    url: http://localhost:4000/graphql
    method: POST
    headers:
      Content-Type: application/json
      Authorization: "Bearer ${SYNTHETIC_TEST_TOKEN}"
    body: '{"query": "mutation { createInvestigation(input: {name: \"Synthetic Test\", description: \"Automated health check\"}) { id } }"}'
    interval: 300s
    timeout: 30s
    assertions:
      - status == 200
      - json.data.createInvestigation.id != null
```

### 9.7 Implementation Priority

| Priority | Improvement | Effort | Impact |
|----------|-------------|--------|--------|
| P0 | Error budget burn rate alerts | Low | High |
| P0 | Incident response dashboard | Medium | High |
| P1 | Correlation ID in all logs | Low | Medium |
| P1 | Circuit breaker metrics | Medium | High |
| P1 | Synthetic monitoring | Medium | High |
| P2 | GraphQL operation metrics | Low | Medium |
| P2 | Cache hit ratio tracking | Low | Medium |
| P3 | Distributed tracing enhancement | High | Medium |

---

## 10. Appendix

### 10.1 Quick Reference Commands

```bash
# Service Status
docker compose -f docker-compose.dev.yml ps
kubectl get pods -n intelgraph

# Logs
docker compose logs -f --tail=100 intelgraph-server
kubectl logs -f deployment/intelgraph-server -n intelgraph

# Health Checks
curl -s http://localhost:4000/health/detailed | jq .
curl -s http://localhost:4000/metrics | grep -E "^(http_|maestro_)"

# Database Status
docker exec neo4j cypher-shell "CALL dbms.components()"
docker exec postgres pg_isready
docker exec redis redis-cli ping

# Quick Restart
docker compose restart intelgraph-server
kubectl rollout restart deployment/intelgraph-server -n intelgraph

# Rollback
./scripts/auto-rollback.sh
kubectl rollout undo deployment/intelgraph-server -n intelgraph
```

### 10.2 Contact Information

| Role | Primary | Backup |
|------|---------|--------|
| On-Call Engineer | [PagerDuty] | [Backup Contact] |
| Engineering Manager | [Name] | [Name] |
| Security Team | [Contact] | [Contact] |
| Database Admin | [Contact] | [Contact] |

### 10.3 External Dependencies

| Service | Status Page | Support Contact |
|---------|-------------|-----------------|
| AWS | status.aws.amazon.com | AWS Support |
| GitHub | githubstatus.com | support@github.com |
| [Others] | [URL] | [Contact] |

### 10.4 Related Documentation

- [Disaster Recovery Procedures](./disaster-recovery-procedures.yaml)
- [Release Captain Guide](./release-captain-quick-reference.md)
- [SLO API Latency Runbook](../docs/runbooks/slo-api-latency.md)
- [Backup Runbook](../docs/runbooks/backup_runbook.md)
- [Game Day Procedures](../docs/runbooks/game-day.md)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-21 | Platform Engineering | Initial release |

---

*This playbook should be reviewed and updated quarterly, or after any significant incident that reveals gaps in the process.*
