# Summit SLOs & Alerting Guide

**Version:** 1.0
**Last Updated:** 2025-11-20
**Owners:** Platform SRE Team

## Table of Contents

- [Overview](#overview)
- [Core SLOs](#core-slos)
  - [Golden Path Success Rate](#golden-path-success-rate)
  - [AI Copilot Latency](#ai-copilot-latency)
  - [Data Ingestion Freshness](#data-ingestion-freshness)
- [Architecture](#architecture)
- [Alert Strategy](#alert-strategy)
- [Error Budget Management](#error-budget-management)
- [Runbooks](#runbooks)
- [Dashboard Guide](#dashboard-guide)
- [FAQ](#faq)

---

## Overview

Summit uses **SLO-driven alerting** to maintain system reliability while minimizing alert noise. This approach focuses on:

- **User-centric metrics**: What users actually experience
- **Error budget tracking**: Quantifying acceptable downtime
- **Multi-burn-rate alerts**: Fast and slow degradation detection
- **Actionable alerts**: Clear ownership and remediation steps

### Key Principles

1. **Measure what matters**: Focus on golden signals (latency, errors, freshness)
2. **Alert on trends, not spikes**: Use multi-window burn rates
3. **Own your SLOs**: Each SLO has a clear team owner
4. **Review regularly**: Weekly SLO review meetings

---

## Core SLOs

### Golden Path Success Rate

**What it measures:** End-to-end system health via synthetic checks

**Target:** 99.9% success rate (28-day window)

**Business impact:**
- Users cannot access critical platform features
- Complete platform unavailability
- Revenue impact

**Owner:** Platform SRE Team

**SLI Definition:**
```promql
sum(rate(summit_golden_path_checks_total{status="success"}[5m]))
/
sum(rate(summit_golden_path_checks_total[5m]))
```

**What's included in golden path:**
1. Frontend UI availability (localhost:3000)
2. API health endpoint (localhost:4000/health)
3. GraphQL query resolution
4. Worker service health
5. OPA policy engine
6. OpenTelemetry collector
7. Jaeger tracing UI
8. Mock services

**Alert Thresholds:**
- **Critical (FastBurn):** 10x burn rate (10% monthly budget in 1 hour)
  - Routes to: PagerDuty + Slack #summit-oncall
  - Action required: Immediate investigation
- **Warning (SlowBurn):** 2x burn rate (5% budget in 6 hours)
  - Routes to: Slack #summit-dev
  - Action required: Monitor and investigate

**Runbook:** [golden-path-failure.md](./runbooks/golden-path-failure.md)

**Dashboard:** [Golden Path Overview](http://grafana.summit.io/d/golden-path)

---

### AI Copilot Latency

**What it measures:** End-to-end latency for AI Copilot queries (NL to Cypher to results)

**Target:** 99% of requests complete in under 2000ms (28-day window)

**Business impact:**
- Degraded user experience
- User satisfaction and retention at risk
- AI feature appears "slow" or "broken"

**Owner:** AI Team

**SLI Definition:**
```promql
sum(rate(summit_copilot_request_duration_seconds_bucket{le="2.0"}[5m]))
/
sum(rate(summit_copilot_request_duration_seconds_count[5m]))
```

**What's measured:**
- Policy check time
- NL to Cypher translation
- Query validation
- Graph database execution
- Response formatting
- Total roundtrip time

**Performance targets:**
- p50: < 500ms
- p95: < 2000ms (SLO threshold)
- p99: < 5000ms

**Alert Thresholds:**
- **Critical (FastBurn):** 10x burn rate
  - Routes to: PagerDuty AI Team + Slack #ai-team
  - Action required: Check LLM API, database queries, graph performance
- **Warning (SlowBurn):** 2x burn rate
  - Routes to: Slack #ai-team
  - Action required: Monitor for further degradation

**Runbook:** [copilot-latency.md](./runbooks/copilot-latency.md)

**Dashboard:** [AI Copilot Performance](http://grafana.summit.io/d/copilot-perf)

---

### Data Ingestion Freshness

**What it measures:** How quickly data connectors ingest data relative to schedule

**Target:** 95% of ingestion runs complete within 15 minutes of scheduled time (28-day window)

**Business impact:**
- Analysts working with stale data
- Threat detection delayed
- Compliance risk (data retention)

**Owner:** Data Team

**SLI Definition:**
```promql
sum(rate(summit_ingestion_freshness_seconds_bucket{le="900"}[5m]))
/
sum(rate(summit_ingestion_freshness_seconds_count[5m]))
```

**Critical connectors:**
1. **entities-feed** (every 15 min) - Max lag: 900s
2. **indicators-feed** (every 15 min) - Max lag: 900s
3. **topicality-feed** (every 30 min) - Max lag: 1800s

**Alert Thresholds:**
- **Critical (FastBurn):** 10x burn rate OR connector down > 1 hour
  - Routes to: PagerDuty Data Team + Slack #data-team
  - Action required: Check connector health, Kafka lag, DB writes
- **Warning (SlowBurn):** 2x burn rate
  - Routes to: Slack #data-team
  - Action required: Monitor connector performance

**Runbook:** [ingestion-lag.md](./runbooks/ingestion-lag.md)

**Dashboard:** [Data Ingestion Overview](http://grafana.summit.io/d/ingestion)

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Applications                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐   │
│  │ Frontend │  │ API/GQL  │  │ Copilot  │  │ Workers │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘   │
│       │             │              │             │         │
│       └─────────────┴──────────────┴─────────────┘         │
│                          │                                  │
│                          │ /metrics                         │
│                          ▼                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │            Prometheus (Metrics Storage)            │   │
│  │  • Scrapes metrics every 15s                       │   │
│  │  • Evaluates recording rules (SLI calculations)    │   │
│  │  • Evaluates alerting rules (burn rates)           │   │
│  └────────────┬───────────────────────────────────────┘   │
│               │                                             │
│               │ Alerts                                      │
│               ▼                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │         Alertmanager (Alert Routing)               │   │
│  │  • Groups alerts                                    │   │
│  │  • Routes by severity/team                          │   │
│  │  • Inhibits duplicate alerts                        │   │
│  └────┬────────────────┬────────────────┬─────────────┘   │
│       │                │                │                  │
│       ▼                ▼                ▼                  │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐             │
│  │PagerDuty│    │  Slack   │    │  Email   │             │
│  │(Critical)│   │(Warnings)│    │(Reports) │             │
│  └─────────┘    └──────────┘    └──────────┘             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Metrics Exporters                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ Golden Path  │  │     DORA     │  │  Connectors │      │
│  │  Exporter    │  │   Exporter   │  │   Metrics   │      │
│  │  (port 9465) │  │  (port 9102) │  │             │      │
│  └──────────────┘  └──────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Metrics Flow

1. **Instrumentation:** Applications export Prometheus metrics via `/metrics` endpoints
2. **Collection:** Prometheus scrapes metrics every 15-60s
3. **Recording Rules:** Pre-calculate SLI values and burn rates (every 30s)
4. **Alerting Rules:** Evaluate alert conditions against recording rules (every 15s)
5. **Alert Routing:** Alertmanager routes alerts to appropriate channels based on labels
6. **Notification:** Teams receive alerts via PagerDuty, Slack, or email

### Key Files

| File | Purpose |
|------|---------|
| `observability/slo/summit-slos.yaml` | SLO definitions and targets |
| `observability/prometheus/rules/slo-recording-rules.yaml` | SLI calculations |
| `observability/prometheus/rules/slo-alerting-rules.yaml` | Alert conditions |
| `observability/alertmanager/alertmanager-slo.yml` | Alert routing config |
| `observability/metrics/golden-path-exporter.js` | Golden path metrics |
| `dora/exporter.ts` | DORA metrics from GitHub |
| `services/ai-copilot/src/main.py` | Copilot instrumentation |
| `workers/ingest/src/connectors/BaseConnector.ts` | Connector metrics |

---

## Alert Strategy

### Multi-Burn-Rate Alerting

We use **multi-window, multi-burn-rate** alerting based on Google SRE Workbook Chapter 5. This approach:

- **Reduces false positives:** Requires multiple windows to agree
- **Detects fast burns:** Catches dangerous rapid error budget consumption
- **Detects slow burns:** Catches gradual degradation before it's critical
- **Minimizes MTTD:** Alerts fire quickly for severe issues

### Burn Rate Calculation

**Error Budget:** For a 99.9% SLO, you have 0.1% error budget per month.

**Burn Rate:** How fast you're consuming that budget relative to normal.

- **1x burn rate:** Normal consumption (budget lasts full month)
- **10x burn rate:** Consuming 10% of monthly budget per hour (budget exhausted in ~72 hours)
- **100x burn rate:** Consuming entire monthly budget in ~7 hours

### Alert Windows

| Alert Type | Burn Rate | Short Window | Long Window | Time to Exhaustion | Severity |
|------------|-----------|--------------|-------------|-------------------|----------|
| FastBurn   | 10x       | 5m           | 1h          | ~72 hours         | Critical |
| SlowBurn   | 2x        | 30m          | 6h          | ~14 days          | Warning  |

### Alert Routing

```yaml
Severity: Critical
├─> PagerDuty (on-call engineer)
└─> Slack (#summit-oncall)
    └─> Auto-escalate if not acked in 15 min

Severity: Warning
└─> Slack (team channel)
    └─> No escalation

Severity: Error Budget Exhausted
└─> Slack (#summit-product + leadership)
    └─> Requires postmortem
```

---

## Error Budget Management

### What is an Error Budget?

An error budget is the **maximum allowed unreliability** within an SLO window. It's expressed as a percentage of total requests/time that can fail while still meeting the SLO.

**Example:** For a 99.9% SLO over 28 days:
- Total minutes: 40,320
- Allowed downtime: 40.32 minutes (0.1%)
- This is your error budget

### Error Budget Policy

| Budget Remaining | Action |
|------------------|--------|
| > 50% | Normal development velocity |
| 25-50% | Monitor closely, consider scaling back risky changes |
| 10-25% | Reduce deployment frequency, focus on stability |
| < 10% | Feature freeze, all hands on reliability |
| Exhausted | Postmortem required, freeze until budget recovered |

### Tracking Error Budget

View current error budget consumption:

```bash
# Via Prometheus
curl -s 'http://localhost:9090/api/v1/query?query=slo:golden_path:error_budget_remaining:28d'

# Via Makefile
make -C observability/demo metrics

# Via Dashboard
http://grafana.summit.io/d/error-budget
```

### Weekly SLO Review

**When:** Every Monday, 10:00 AM UTC

**Attendees:** Platform SRE, AI Team, Data Team

**Agenda:**
1. Review error budget consumption (last 7 days)
2. Analyze alert patterns and false positives
3. Review incidents and their SLO impact
4. Discuss SLO target adjustments
5. Plan reliability improvements

**Metrics to review:**
- Error budget burn rate by SLO
- Number of SLO breaches
- Alert volume (firing rate)
- MTTR for SLO violations
- DORA metrics (deployment freq, lead time, CFR, MTTR)

---

## Runbooks

### Quick Links

- [Golden Path Failure](./runbooks/golden-path-failure.md) - System-wide outage
- [Copilot Latency High](./runbooks/copilot-latency.md) - AI queries slow
- [Ingestion Lag](./runbooks/ingestion-lag.md) - Data freshness issues
- [Connector Down](./runbooks/connector-down.md) - Critical connector offline
- [Error Budget Exhausted](./runbooks/error-budget-exhausted.md) - SLO violation

### General Response Workflow

1. **Acknowledge Alert**
   - Ack in PagerDuty (critical) or Slack (warning)
   - Prevents auto-escalation

2. **Check Dashboards**
   - Open relevant Grafana dashboard (link in alert)
   - Verify alert is not false positive
   - Assess scope (% of users affected, duration)

3. **Triage**
   - Is this user-facing? (check golden path)
   - Is this getting worse? (check burn rate trend)
   - Can it wait until business hours? (check severity)

4. **Investigate**
   - Follow runbook for specific SLO
   - Check recent deployments (DORA dashboard)
   - Review logs and traces (Jaeger)
   - Check dependencies (DB, APIs, external services)

5. **Mitigate**
   - Rollback recent deployment (if applicable)
   - Scale up resources (if capacity issue)
   - Fail over to backup (if regional issue)
   - Disable feature flag (if specific feature broken)

6. **Resolve Alert**
   - Verify metrics have recovered
   - Close PagerDuty incident
   - Update Slack thread with resolution

7. **Follow Up**
   - File incident report (if critical)
   - Schedule postmortem (if error budget exhausted)
   - Create action items for prevention

---

## Dashboard Guide

### Prometheus Dashboards

**URL:** http://localhost:9090 (or http://prometheus.summit.io)

**Key views:**
- **Alerts:** http://localhost:9090/alerts
  - See all firing and pending alerts
  - Filter by severity, SLO, team
- **Rules:** http://localhost:9090/rules
  - View all recording and alerting rules
  - See current evaluation results
- **Targets:** http://localhost:9090/targets
  - See all scrape targets and their health
  - Debug scrape failures

### Alertmanager Dashboard

**URL:** http://localhost:9093 (or http://alertmanager.summit.io)

**Key views:**
- **Alerts:** http://localhost:9093/#/alerts
  - See active alerts
  - Silence alerts temporarily
- **Silences:** http://localhost:9093/#/silences
  - Manage alert silences
- **Status:** http://localhost:9093/#/status
  - View routing config
  - Check receiver health

### Grafana Dashboards

**URL:** http://localhost:3333 (or http://grafana.summit.io)
**Login:** admin/admin

**SLO Dashboards:**
1. **Platform SLO Overview** - All SLOs at a glance
   - Traffic light status (green/yellow/red)
   - Error budget remaining
   - Current burn rates
   - Trend graphs

2. **Golden Path Dashboard** - End-to-end system health
   - Success rate over time
   - Per-endpoint status
   - Recent failures
   - Error budget burn

3. **AI Copilot Performance** - Copilot latency metrics
   - p50/p95/p99 latency
   - Request rate
   - Error rate by type (policy, timeout, etc.)
   - LLM cost tracking

4. **Data Ingestion Dashboard** - Connector health
   - Freshness by connector
   - Ingestion rate
   - Lag histogram
   - Error rate

5. **DORA Metrics Dashboard** - Engineering productivity
   - Deployment frequency
   - Lead time for changes
   - Change failure rate
   - MTTR
   - Performance tier (Elite/High/Medium/Low)

---

## FAQ

### Q: Why SLOs instead of simple uptime monitoring?

**A:** SLOs focus on **user experience** rather than system availability. A service can be "up" but slow/broken for users. SLOs measure what users actually experience.

### Q: How do I know if an alert is real or a false positive?

**A:** Multi-burn-rate alerts reduce false positives by requiring multiple time windows to agree. If an alert fires:
1. Check the dashboard (linked in alert)
2. Verify the burn rate is sustained, not a spike
3. Check if error budget is actually being consumed

### Q: What if I need to silence alerts during maintenance?

**A:** Use Alertmanager silences:
1. Go to http://localhost:9093/#/silences
2. Click "New Silence"
3. Set matchers (e.g., `slo=golden_path`)
4. Set duration (e.g., 2 hours)
5. Add comment explaining reason

### Q: How do I adjust an SLO target?

**A:**
1. Gather data (use benchmarks scripts to get current performance)
2. Propose new target at weekly SLO review
3. Get buy-in from stakeholders
4. Update `observability/slo/summit-slos.yaml`
5. Update recording and alerting rules
6. Deploy changes
7. Monitor for 1 week to validate

### Q: What's the difference between a recording rule and an alerting rule?

**A:**
- **Recording rules** pre-calculate metric values (e.g., burn rates) to improve query performance
- **Alerting rules** evaluate conditions (e.g., `burn_rate > 10`) and trigger alerts

### Q: How can I test if alerts are working?

**A:**
```bash
# Break golden path to trigger alert
make -C observability/demo break-golden-path

# Monitor alerts
watch -n 5 'curl -s http://localhost:9090/api/v1/alerts | jq ".data.alerts[] | {alert: .labels.alertname, state: .state}"'

# Restore after testing
make -C observability/demo restore
```

### Q: Where do I find historical SLO data?

**A:** Query Prometheus for historical SLI values:
```promql
# Golden path success rate over last 7 days
slo:golden_path:success_ratio:rate1h[7d]

# Error budget consumption over last 28 days
slo:golden_path:error_budget_remaining:28d
```

### Q: How do I generate performance baselines?

**A:**
```bash
# Generate baseline from last 28 days
cd benchmarks
node generate-baseline.js --days=28 --output=observability/benchmarks/baseline.json

# Compare current performance
node compare-performance.js --baseline=observability/benchmarks/baseline.json
```

### Q: What's the relationship between SLOs and DORA metrics?

**A:** DORA metrics track **engineering velocity** while SLOs track **system reliability**. Together they give a complete picture:

- **High DORA + Good SLOs:** Elite performance
- **High DORA + Bad SLOs:** Moving fast, breaking things (unsustainable)
- **Low DORA + Good SLOs:** Slow but stable (improvement opportunity)
- **Low DORA + Bad SLOs:** Need urgent intervention

---

## Quick Reference

### Key Commands

```bash
# Run observability demo
make observability:demo

# Check current SLO metrics
make -C observability/demo metrics

# Break golden path (demo)
make -C observability/demo break-golden-path

# Restore golden path
make -C observability/demo restore

# View dashboards
make -C observability/demo dashboards

# Check service health
make -C observability/demo health

# Generate performance baseline
cd benchmarks && node generate-baseline.js

# Compare performance vs baseline
cd benchmarks && node compare-performance.js
```

### Key URLs

- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Grafana: http://localhost:3333 (admin/admin)
- Golden Path Metrics: http://localhost:9465/metrics
- DORA Metrics: http://localhost:9102/metrics

### Support

- **Slack:** #summit-oncall (urgent), #summit-dev (non-urgent)
- **PagerDuty:** On-call engineer
- **Email:** sre-team@summit.io
- **Docs:** https://docs.summit.io/observability

---

**Document Version:** 1.0
**Last Reviewed:** 2025-11-20
**Next Review:** 2025-11-27
