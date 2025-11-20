# Summit SLO-Driven Alerting System

> Transform observability into actionable insights with SLO-driven alerting

## Overview

This directory contains Summit's comprehensive SLO-driven alerting system, designed to maintain system reliability while minimizing alert noise. The system focuses on three core golden signals that directly impact user experience:

1. **Golden Path Success Rate** - End-to-end system health
2. **AI Copilot Latency** - User-facing AI response times
3. **Data Ingestion Freshness** - Real-time data pipeline health

## Quick Start

### Run the Demo

```bash
# From repository root
make observability:demo

# Opens:
# - Prometheus: http://localhost:9090
# - Alertmanager: http://localhost:9093
# - Grafana: http://localhost:3333
```

### Check SLO Metrics

```bash
cd observability/demo
make metrics
```

### Trigger an Alert (Demo)

```bash
cd observability/demo
make break-golden-path

# Monitor at: http://localhost:9090/alerts
# Alert should fire within 2-5 minutes

# Restore with:
make restore
```

## Directory Structure

```
observability/
├── README.md                          # This file
├── docs/
│   └── slo-guide.md                   # Comprehensive SLO guide
│
├── slo/
│   └── summit-slos.yaml               # Core SLO definitions
│
├── prometheus/
│   ├── rules/
│   │   ├── slo-recording-rules.yaml   # SLI calculations & burn rates
│   │   └── slo-alerting-rules.yaml    # Multi-burn-rate alerts
│   └── slo-burn-rules.yaml            # Legacy burn rules
│
├── alertmanager/
│   └── alertmanager-slo.yml           # Multi-channel alert routing
│
├── metrics/
│   └── golden-path-exporter.js        # Golden path synthetic checks
│
├── demo/
│   ├── docker-compose.yml             # Full demo stack
│   ├── Makefile                       # Demo commands
│   ├── prometheus.yml                 # Prometheus config
│   └── load-generator.js              # Traffic simulation
│
└── benchmarks/
    └── baseline.json                  # Performance baselines

benchmarks/                            # (Repository root)
├── generate-baseline.js               # Generate performance baseline
└── compare-performance.js             # Compare current vs baseline

dora/
└── exporter.ts                        # DORA metrics from GitHub

services/ai-copilot/
├── src/main.py                        # Copilot with Prometheus metrics
└── requirements.txt                   # Python dependencies

workers/ingest/src/connectors/
└── BaseConnector.ts                   # Connector freshness metrics
```

## Core Concepts

### SLOs (Service Level Objectives)

**SLOs** define reliability targets for your system. Each SLO consists of:

- **SLI (Service Level Indicator):** The metric being measured (e.g., request success rate)
- **Target:** The objective (e.g., 99.9% success rate)
- **Window:** Time period for measurement (e.g., 28 days)

**Example:**
```yaml
- name: golden-path-success-rate
  target: 99.9
  window: 28d
  sli:
    query: |
      sum(rate(summit_golden_path_checks_total{status="success"}[5m]))
      /
      sum(rate(summit_golden_path_checks_total[5m]))
```

### Error Budgets

An **error budget** is the maximum allowed unreliability within an SLO window.

For a 99.9% SLO over 28 days:
- Total minutes: 40,320
- Allowed downtime: 40.32 minutes (0.1%)

**Use it to balance reliability and velocity:**
- Budget remaining > 50%: Normal development
- Budget < 10%: Focus on reliability
- Budget exhausted: Feature freeze + postmortem

### Multi-Burn-Rate Alerts

Traditional alerting fires on absolute thresholds (e.g., "error rate > 5%"). This creates:
- False positives from brief spikes
- Alert fatigue
- Missed slow degradation

**Multi-burn-rate alerting** fires when error budget is being consumed faster than normal:

| Alert Type | Burn Rate | Windows | Time to Exhaustion | Severity |
|------------|-----------|---------|-------------------|----------|
| FastBurn   | 10x       | 5m + 1h | ~72 hours         | Critical |
| SlowBurn   | 2x        | 30m + 6h| ~14 days          | Warning  |

**Benefits:**
- ✅ Reduces false positives (requires multiple windows)
- ✅ Detects fast burns (dangerous rapid consumption)
- ✅ Detects slow burns (gradual degradation)
- ✅ Actionable alerts with clear severity

### DORA Metrics

**DORA (DevOps Research and Assessment)** metrics track engineering velocity:

1. **Deployment Frequency** - How often you deploy
2. **Lead Time for Changes** - Time from commit to production
3. **Change Failure Rate** - % of deployments causing failures
4. **MTTR** - Mean time to recovery from incidents

**Performance Tiers:**
- **Elite:** Deploy multiple times/day, lead time < 1 day, CFR < 5%, MTTR < 1 hour
- **High:** Deploy weekly, lead time < 1 week, CFR 5-15%, MTTR < 1 day
- **Medium:** Deploy monthly, lead time < 1 month, CFR 16-30%, MTTR < 1 week
- **Low:** Deploy less than monthly, lead time > 1 month, CFR > 30%, MTTR > 1 week

**Use DORA + SLOs together:**
- High DORA + Good SLOs = Elite performance
- High DORA + Bad SLOs = Moving fast, breaking things
- Low DORA + Good SLOs = Slow but stable
- Low DORA + Bad SLOs = Need urgent intervention

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Applications                            │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐    │
│   │ Frontend │  │ API/GQL  │  │ Copilot  │  │Workers │    │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘    │
│        └─────────────┴──────────────┴────────────┘          │
│                       │ /metrics                             │
│                       ▼                                      │
│   ┌───────────────────────────────────────────────────┐    │
│   │  Prometheus (Metrics + Alerting)                  │    │
│   │  • Scrapes metrics every 15s                      │    │
│   │  • Evaluates recording rules (SLI calculations)   │    │
│   │  • Evaluates alerting rules (burn rates)          │    │
│   └─────────────────┬─────────────────────────────────┘    │
│                     │ Alerts                                │
│                     ▼                                        │
│   ┌───────────────────────────────────────────────────┐    │
│   │  Alertmanager (Routing)                           │    │
│   │  • Groups alerts by SLO/severity                  │    │
│   │  • Routes to appropriate channels                 │    │
│   │  • Inhibits duplicate alerts                      │    │
│   └──────┬─────────────────┬────────────────┬─────────┘    │
│          ▼                 ▼                ▼               │
│   ┌──────────┐      ┌──────────┐    ┌──────────┐          │
│   │PagerDuty │      │  Slack   │    │  Email   │          │
│   │(Critical)│      │(Warnings)│    │(Reports) │          │
│   └──────────┘      └──────────┘    └──────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### ✅ User-Centric Metrics
- Focus on what users experience (latency, errors, freshness)
- Not system-centric (CPU, memory, disk)

### ✅ Multi-Burn-Rate Alerting
- Fast burns (10x): Page on-call immediately
- Slow burns (2x): Notify dev team
- Reduces false positives by requiring multiple windows

### ✅ Intelligent Routing
- Critical → PagerDuty + Slack #summit-oncall
- Warning → Slack team channels
- Error budget exhausted → Product + leadership

### ✅ Error Budget Management
- Quantify acceptable downtime
- Balance reliability vs velocity
- Track consumption over 28-day window

### ✅ Automated Baselines
- Generate performance baselines from historical data
- Compare current vs baseline
- Propose new thresholds when performance characteristics change

### ✅ DORA Integration
- Track engineering velocity alongside reliability
- Deployment frequency, lead time, CFR, MTTR
- Identify performance tier (Elite/High/Medium/Low)

### ✅ Comprehensive Dashboards
- Prometheus: Metrics + alerts
- Alertmanager: Alert routing
- Grafana: SLO dashboards, error budgets, DORA metrics

### ✅ Demo Environment
- Spin up full stack with `make observability:demo`
- Controlled error injection
- Trigger alerts on-demand
- Test without affecting production

## Common Tasks

### View Current SLO Metrics

```bash
cd observability/demo
make metrics
```

### Generate Performance Baseline

```bash
cd benchmarks
node generate-baseline.js --days=28
```

### Compare Current vs Baseline

```bash
cd benchmarks
node compare-performance.js
```

### Check Service Health

```bash
cd observability/demo
make health
```

### View All Dashboards

```bash
cd observability/demo
make dashboards
```

### Test Alert Flow

```bash
cd observability/demo

# Break golden path to trigger critical alert
make break-golden-path

# Monitor alert firing
watch -n 5 'curl -s http://localhost:9090/api/v1/alerts | jq ".data.alerts[] | {alert: .labels.alertname, state: .state}"'

# Restore after testing
make restore
```

## Alert Workflow

When an alert fires:

1. **Acknowledge** - Ack in PagerDuty/Slack to prevent escalation
2. **Check Dashboard** - Verify alert, assess scope (link in alert)
3. **Triage** - Is this user-facing? Getting worse? Can it wait?
4. **Investigate** - Follow runbook, check recent deployments, review logs
5. **Mitigate** - Rollback, scale up, fail over, or disable feature
6. **Resolve** - Verify recovery, close incident, update Slack
7. **Follow Up** - File incident report, schedule postmortem, create action items

## Weekly SLO Review

**When:** Every Monday, 10:00 AM UTC

**Attendees:** Platform SRE, AI Team, Data Team

**Agenda:**
1. Review error budget consumption (last 7 days)
2. Analyze alert patterns and false positives
3. Review incidents and their SLO impact
4. Discuss SLO target adjustments
5. Plan reliability improvements

## Documentation

- **[SLO Guide](docs/slo-guide.md)** - Comprehensive guide to SLOs & alerting
- **[Runbooks](docs/runbooks/)** - Response procedures for each alert

## Support

- **Urgent:** Slack #summit-oncall
- **Non-urgent:** Slack #summit-dev
- **PagerDuty:** On-call engineer (critical alerts only)
- **Email:** sre-team@summit.io

## Contributing

### Adding a New SLO

1. Define SLO in `observability/slo/summit-slos.yaml`
2. Add metrics instrumentation to service
3. Create recording rules in `observability/prometheus/rules/slo-recording-rules.yaml`
4. Create alerting rules in `observability/prometheus/rules/slo-alerting-rules.yaml`
5. Update Alertmanager routing in `observability/alertmanager/alertmanager-slo.yml`
6. Create Grafana dashboard
7. Write runbook in `observability/docs/runbooks/`
8. Test end-to-end with demo environment

### Adjusting SLO Targets

1. Generate baseline: `cd benchmarks && node generate-baseline.js`
2. Propose changes at weekly SLO review
3. Update `observability/slo/summit-slos.yaml`
4. Update recording/alerting rules
5. Deploy and monitor for 1 week

## License

Copyright © 2025 Summit. All rights reserved.

---

**Questions?** Reach out in Slack #summit-dev or consult the [SLO Guide](docs/slo-guide.md).
