# Observability Baselines - GA Readiness

## Purpose

This document establishes Service Level Indicators (SLIs), Service Level Objectives (SLOs), and baseline metrics for all Summit services to ensure production observability readiness for GA release.

## Overview

**Observability Pillars**:
1. **Metrics** - Quantitative measurements (latency, error rate, throughput)
2. **Logs** - Event-driven records for debugging
3. **Traces** - Request flow through distributed systems
4. **Alerts** - Automated notifications for anomalies

**SLI/SLO Framework**:
- **SLI** (Service Level Indicator): Quantifiable measure of service health
- **SLO** (Service Level Objective): Target value for an SLI
- **SLA** (Service Level Agreement): Commitment to customers (typically SLO - error budget)

---

## Core Service Baselines

### 1. API Server (intelgraph-server)

**Service Tier**: **P0 (Critical)**

#### SLIs

| SLI | Definition | Measurement Method |
|-----|------------|-------------------|
| Availability | % of successful requests | `(total_requests - 5xx_errors) / total_requests * 100` |
| Latency (P50) | Median response time | 50th percentile of request duration |
| Latency (P95) | 95th percentile response time | 95th percentile of request duration |
| Latency (P99) | 99th percentile response time | 99th percentile of request duration |
| Error Rate | % of failed requests | `(4xx_errors + 5xx_errors) / total_requests * 100` |
| Throughput | Requests per second | `total_requests / time_window` |

#### SLOs (GA Targets)

| SLI | SLO Target | Error Budget (30 days) |
|-----|-----------|------------------------|
| Availability | ≥ 99.9% | 43.2 minutes downtime |
| Latency P50 | ≤ 200ms | N/A |
| Latency P95 | ≤ 500ms | N/A |
| Latency P99 | ≤ 1000ms | N/A |
| Error Rate | ≤ 0.1% | 0.1% of requests |
| Throughput | ≥ 100 req/s | N/A |

#### Baseline Metrics (Pre-GA Observed)

| Metric | Current Baseline | Notes |
|--------|------------------|-------|
| Availability | **TBD** | Run `scripts/observability/measure-baseline.sh api-server --duration 7d` |
| Latency P50 | **TBD** | Measure during normal load |
| Latency P95 | **TBD** | Measure during normal load |
| Latency P99 | **TBD** | Measure during peak load |
| Error Rate | **TBD** | Measure over 7-day window |
| Throughput | **TBD** | Measure average over 24 hours |

#### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | Error rate > 1% for 5 minutes | **CRITICAL** | Page on-call, investigate immediately |
| Degraded Performance | P95 latency > 1000ms for 10 minutes | **WARNING** | Investigate within 1 hour |
| Low Availability | Availability < 99% over 1 hour | **CRITICAL** | Page on-call, consider rollback |
| High Latency | P99 latency > 2000ms for 5 minutes | **WARNING** | Investigate performance degradation |

---

### 2. Authentication Service

**Service Tier**: **P0 (Critical)**

#### SLIs

| SLI | Definition | Measurement Method |
|-----|------------|-------------------|
| Login Success Rate | % of successful login attempts | `successful_logins / total_login_attempts * 100` |
| Token Validation Latency | Time to validate JWT token | 95th percentile of validation duration |
| Availability | % of successful auth requests | `(total_auth_requests - failures) / total_auth_requests * 100` |

#### SLOs (GA Targets)

| SLI | SLO Target | Error Budget |
|-----|-----------|--------------|
| Login Success Rate | ≥ 99.5% | 0.5% failure rate |
| Token Validation Latency | ≤ 50ms (P95) | N/A |
| Availability | ≥ 99.99% | 4.32 minutes/month |

#### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Auth Failures | Login success rate < 95% for 5 minutes | **CRITICAL** | Page on-call immediately |
| Slow Token Validation | P95 latency > 100ms for 10 minutes | **WARNING** | Investigate caching/performance |
| Auth Service Down | Availability < 99% over 5 minutes | **CRITICAL** | Page on-call, activate DR plan |

---

### 3. Database (PostgreSQL)

**Service Tier**: **P0 (Critical)**

#### SLIs

| SLI | Definition | Measurement Method |
|-----|------------|-------------------|
| Query Latency | Time to execute queries | P95 of query execution time |
| Connection Pool Utilization | % of pool connections in use | `active_connections / max_connections * 100` |
| Replication Lag | Delay between primary and replica | Time difference in seconds |
| Disk Usage | % of disk space used | `used_disk_space / total_disk_space * 100` |

#### SLOs (GA Targets)

| SLI | SLO Target | Error Budget |
|-----|-----------|--------------|
| Query Latency (P95) | ≤ 100ms | N/A |
| Connection Pool Utilization | ≤ 80% | N/A |
| Replication Lag | ≤ 5 seconds | N/A |
| Disk Usage | ≤ 80% | N/A |

#### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Query Latency | P95 > 200ms for 10 minutes | **WARNING** | Review slow queries, optimize indexes |
| Connection Pool Exhaustion | Utilization > 90% for 5 minutes | **CRITICAL** | Scale connection pool, investigate leaks |
| High Replication Lag | Lag > 30 seconds for 5 minutes | **CRITICAL** | Check network, disk I/O, replication health |
| Disk Space Critical | Usage > 90% | **CRITICAL** | Provision more space, clean old data |

---

### 4. Graph Database (Neo4j)

**Service Tier**: **P1 (High)**

#### SLIs

| SLI | Definition | Measurement Method |
|-----|------------|-------------------|
| Query Latency | Time to execute Cypher queries | P95 of query execution time |
| Page Cache Hit Ratio | % of page cache hits | `page_cache_hits / (page_cache_hits + page_cache_misses) * 100` |
| Store Size | Total database size | Bytes of data stored |

#### SLOs (GA Targets)

| SLI | SLO Target | Error Budget |
|-----|-----------|--------------|
| Query Latency (P95) | ≤ 500ms | N/A |
| Page Cache Hit Ratio | ≥ 95% | N/A |

#### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Slow Queries | P95 > 1000ms for 10 minutes | **WARNING** | Review query plans, add indexes |
| Low Cache Hit Rate | Hit ratio < 90% for 15 minutes | **WARNING** | Increase cache size, review query patterns |
| Store Size Growth | Growth > 20% per week | **INFO** | Review data retention, archival policies |

---

### 5. Redis Cache

**Service Tier**: **P1 (High)**

#### SLIs

| SLI | Definition | Measurement Method |
|-----|------------|-------------------|
| Cache Hit Ratio | % of cache hits vs misses | `cache_hits / (cache_hits + cache_misses) * 100` |
| Memory Usage | % of max memory used | `used_memory / maxmemory * 100` |
| Latency | Time to execute commands | P95 of command execution time |

#### SLOs (GA Targets)

| SLI | SLO Target | Error Budget |
|-----|-----------|--------------|
| Cache Hit Ratio | ≥ 90% | N/A |
| Memory Usage | ≤ 80% | N/A |
| Latency (P95) | ≤ 10ms | N/A |

#### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Low Hit Rate | Hit ratio < 75% for 15 minutes | **WARNING** | Review cache strategy, TTL settings |
| High Memory Usage | Usage > 90% for 5 minutes | **WARNING** | Scale up, review eviction policy |
| Slow Commands | P95 > 50ms for 10 minutes | **WARNING** | Review command patterns, network latency |

---

## Dashboard Requirements

### Critical Dashboards

1. **System Overview Dashboard**
   - Overall system health (green/yellow/red)
   - Key SLIs for all P0 services
   - Active alerts
   - Recent incidents

2. **API Performance Dashboard**
   - Request rate (by endpoint, status code)
   - Latency distribution (P50, P95, P99)
   - Error rate (by endpoint, error type)
   - Top slow endpoints

3. **Database Health Dashboard**
   - Query latency (P50, P95, P99)
   - Connection pool metrics
   - Replication lag
   - Disk I/O and space
   - Slow query log

4. **Authentication Dashboard**
   - Login success/failure rate
   - Token validation latency
   - Active sessions
   - Failed auth attempts (for security monitoring)

5. **Business Metrics Dashboard**
   - Active users (daily, monthly)
   - API usage by tenant
   - Cost per tenant
   - Feature adoption rates

---

## Monitoring Stack

### Recommended Tools

**Metrics Collection**:
- **Prometheus** - Time-series metrics database
- **StatsD/Telegraf** - Metrics aggregation
- **Node Exporter** - System metrics
- **PostgreSQL Exporter** - Database metrics
- **Redis Exporter** - Cache metrics

**Visualization**:
- **Grafana** - Dashboarding and visualization
- **Pre-built dashboards** - See `monitoring/grafana-dashboards/`

**Alerting**:
- **Prometheus Alertmanager** - Alert routing and aggregation
- **PagerDuty** - On-call management
- **Slack** - Team notifications

**Logging**:
- **Loki** - Log aggregation (Grafana stack)
- **ELK Stack** - Elasticsearch, Logstash, Kibana (alternative)
- **CloudWatch Logs** - AWS native (if using AWS)

**Tracing**:
- **Jaeger** - Distributed tracing
- **OpenTelemetry** - Instrumentation standard

---

## Baseline Measurement Process

### Step 1: Install Monitoring Stack

```bash
# Deploy Prometheus, Grafana, and exporters
make deploy-monitoring ENVIRONMENT=staging

# Verify deployment
kubectl get pods -n monitoring
```

### Step 2: Collect Baseline Data

**Duration**: 7 days minimum, 30 days recommended

```bash
# Start baseline collection
scripts/observability/measure-baseline.sh --environment staging --duration 7d

# This script:
# 1. Ensures monitoring is running
# 2. Collects metrics for specified duration
# 3. Calculates P50, P95, P99 for all SLIs
# 4. Generates baseline report
```

### Step 3: Analyze Results

```bash
# Generate baseline report
scripts/observability/generate-baseline-report.sh \
  --start "2026-01-01" \
  --end "2026-01-08" \
  --output baselines/2026-01-staging-baseline.json

# Review report for anomalies
cat baselines/2026-01-staging-baseline.json | jq .
```

### Step 4: Configure Alerts

```bash
# Generate Prometheus alert rules from baselines
scripts/observability/generate-alerts.sh \
  --baseline baselines/2026-01-staging-baseline.json \
  --output monitoring/prometheus/rules/slo-alerts.yml

# Apply alert rules
kubectl apply -f monitoring/prometheus/rules/slo-alerts.yml
```

### Step 5: Create Dashboards

```bash
# Generate Grafana dashboards from templates
scripts/observability/generate-dashboards.sh \
  --baseline baselines/2026-01-staging-baseline.json \
  --output monitoring/grafana-dashboards/

# Import dashboards to Grafana
scripts/observability/import-dashboards.sh \
  --grafana-url https://grafana.staging.summit.internal \
  --api-key $GRAFANA_API_KEY \
  --source monitoring/grafana-dashboards/
```

---

## Continuous Improvement

### Weekly Reviews

- Review SLI/SLO performance
- Identify trends (improving/degrading)
- Adjust alert thresholds if needed
- Update baselines quarterly

### Monthly Reviews

- Review incident history
- Identify recurring issues
- Update runbooks
- Adjust SLOs if needed

### Quarterly Reviews

- Re-establish baselines
- Review SLO targets (too aggressive/too lenient?)
- Update monitoring stack
- Add new services/metrics

---

## Verification Commands

### Check Prometheus is Running

```bash
kubectl get pods -n monitoring -l app=prometheus
curl -s http://prometheus.staging.summit.internal/-/healthy
```

### Query Current SLIs

```bash
# API error rate (last 5 minutes)
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])'

# API latency P95 (last 5 minutes)
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))'

# Database connection pool utilization
curl -s 'http://prometheus:9090/api/v1/query?query=pg_stat_database_numbackends/pg_settings_max_connections'
```

### Verify Alerts are Configured

```bash
# List active alerts
curl -s http://prometheus:9090/api/v1/alerts | jq '.data.alerts[] | {alert: .labels.alertname, state: .state}'

# Test alert (simulate high error rate)
scripts/observability/test-alert.sh --alert high_error_rate
```

---

## Related Documentation

- [Incident Response Runbook](../RUNBOOKS/INCIDENT_RESPONSE.md)
- [Deployment Runbook](../RUNBOOKS/DEPLOYMENT.md)
- [Disaster Recovery Runbook](../RUNBOOKS/DISASTER_RECOVERY.md)
- [Monitoring Stack Setup](../docs/operations/monitoring-setup.md)
- [Grafana Dashboard Templates](../monitoring/grafana-dashboards/README.md)

---

**Last Updated**: 2026-01-02
**Owner**: Platform Engineering + SRE Team
**Review Cycle**: Quarterly
**Next Review**: 2026-04-01
