# E2E Test Observability System

**Status:** 🟢 OPERATIONAL
**Last Updated:** 2025-11-29

---

## Overview

The E2E Test Observability System provides comprehensive monitoring, metrics collection, and alerting for end-to-end tests across the Summit/IntelGraph platform. This system ensures visibility into test health, performance trends, and enables proactive issue detection.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        E2E Observability Pipeline                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Playwright │    │   Metrics    │    │  Prometheus  │                   │
│  │   Test Runs  │───▶│   Collector  │───▶│  Pushgateway │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│                                                  │                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────▼───────┐                   │
│  │   GitHub     │    │   Alert      │◀───│  Prometheus  │                   │
│  │   Actions    │◀───│   Manager    │    │    Server    │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│                                                  │                          │
│                                          ┌──────▼───────┐                   │
│                                          │    Grafana   │                   │
│                                          │  Dashboards  │                   │
│                                          └──────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. E2E Observability Workflow

**File:** `.github/workflows/e2e-observability.yml`

**Triggers:**
- Scheduled: Every 6 hours
- Pull requests affecting e2e tests
- Manual dispatch

**Stages:**
1. **Setup Observability** - Initialize metrics infrastructure
2. **E2E with Metrics** - Run tests with metrics collection (4 parallel suites)
3. **Aggregate Metrics** - Combine results and calculate totals
4. **Update Dashboards** - Push historical data
5. **Alert on Failures** - Create issues for persistent failures

### 2. Test Suites Monitored

| Suite | Description | SLO Target |
|-------|-------------|------------|
| `golden-path` | Critical user journey | 99.9% pass rate |
| `analytics-bridge` | Analytics integration | 99.5% pass rate |
| `graph-visualization` | Graph rendering | 99% pass rate |
| `real-time-updates` | WebSocket functionality | 99% pass rate |

### 3. Metrics Collected

#### Test Execution Metrics
| Metric | Type | Description |
|--------|------|-------------|
| `e2e_test_duration_seconds` | Gauge | Duration per suite |
| `e2e_tests_passed_total` | Gauge | Passed tests per suite |
| `e2e_tests_failed_total` | Gauge | Failed tests per suite |
| `e2e_tests_flaky_total` | Gauge | Flaky tests per suite |
| `e2e_tests_skipped_total` | Gauge | Skipped tests per suite |

#### Aggregate Metrics
| Metric | Type | Description |
|--------|------|-------------|
| `e2e_total_duration_seconds` | Gauge | Total test run duration |
| `e2e_total_tests_passed` | Gauge | Total passed tests |
| `e2e_total_tests_failed` | Gauge | Total failed tests |
| `e2e_test_success_rate` | Gauge | Overall success rate (0-1) |

### 4. Dashboard

**Location:** `observability/dashboards/e2e-test-performance.json`
**Grafana UID:** `e2e-test-performance`
**URL:** http://localhost:3001/d/e2e-test-performance

**Panels:**
- 🎯 Success Rate Gauge
- ✅ Tests Passed Counter
- ❌ Tests Failed Counter
- ⏱️ Total Duration
- 🔄 Flaky Tests Counter
- 🚦 Overall Status
- 📊 Success Rate Over Time
- ⏱️ Duration Trends
- 📋 Suite Performance Table

---

## Alerting

### Alert Rules

**File:** `observability/alerts/e2e-alerts.yml`

#### Critical Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| `E2ETestSuiteFailure` | Any test failures | Immediate investigation |
| `E2ESuccessRateCritical` | Success rate < 90% | Stop deployments |
| `E2ETestSuiteDown` | No metrics for 30min | Check pipeline health |
| `E2EBudgetBurnRateHigh` | Error budget exhaustion risk | Review recent changes |

#### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| `E2ESuccessRateWarning` | Success rate < 98% | Monitor closely |
| `E2ETestDurationHigh` | Duration > 10 minutes | Performance review |
| `E2EFlakyTestsDetected` | > 3 flaky tests | Quarantine and fix |
| `E2EDurationRegression` | 50% duration increase | Performance investigation |

### SLO Configuration

**Target SLO:** 99.5% test success rate over 7 days

**Error Budget:**
- Monthly budget: 0.5% (approximately 3.6 hours)
- Burn rate monitoring: 1h, 6h, 1d, 7d windows

---

## Usage

### Running the Pipeline Manually

```bash
# Via GitHub CLI
gh workflow run e2e-observability.yml

# With options
gh workflow run e2e-observability.yml \
  -f collect_traces=true \
  -f benchmark_mode=false
```

### Viewing Metrics Locally

```bash
# Start observability stack
docker compose -f docker-compose.observability.yml up -d

# Push test metrics
curl --data-binary @test-metrics.txt \
  http://localhost:9091/metrics/job/e2e_tests

# Open Grafana dashboard
open http://localhost:3001/d/e2e-test-performance
```

### Accessing Historical Data

```bash
# View metrics history
cat observability/e2e-metrics-history.json | jq '.runs[:5]'

# View trends
cat observability/e2e-trends.json | jq '.'
```

---

## Runbook Integration

### On Test Failure

1. **Check GitHub Action run** for detailed logs
2. **Review Playwright traces** in artifacts
3. **Check dashboard** for patterns
4. **Review recent commits** for potential causes

### On SLO Violation

1. **Acknowledge alert** in Alertmanager
2. **Pause non-essential deployments**
3. **Investigate failure patterns**
4. **Create tracking issue** if persistent

### On Flaky Test Detection

1. **Identify flaky tests** from metrics
2. **Add to quarantine list** if > 3 failures
3. **Analyze traces** for race conditions
4. **Fix or skip** with tracking issue

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | OTLP collector endpoint |
| `OTEL_SERVICE_NAME` | `e2e-test-runner` | Service name for traces |
| `METRICS_PUSH_GATEWAY` | `http://localhost:9091` | Prometheus pushgateway |

### Customizing Alert Thresholds

Edit `observability/alerts/e2e-alerts.yml`:

```yaml
# Adjust success rate threshold
- alert: E2ESuccessRateCritical
  expr: e2e_test_success_rate < 0.9  # Change threshold here
```

### Adding New Test Suites

1. Add suite to workflow matrix in `e2e-observability.yml`:
```yaml
matrix:
  test_suite:
    - golden-path
    - analytics-bridge
    - your-new-suite  # Add here
```

2. Create corresponding Playwright spec file
3. Update dashboard if custom visualization needed

---

## Maintenance

### Weekly Tasks
- [ ] Review flaky test trends
- [ ] Check error budget consumption
- [ ] Archive old metrics (> 90 days)

### Monthly Tasks
- [ ] Review and adjust SLO targets
- [ ] Analyze duration trends
- [ ] Update documentation

### Quarterly Tasks
- [ ] Evaluate alert effectiveness
- [ ] Review dashboard utility
- [ ] Update test suite coverage

---

## Troubleshooting

### Metrics Not Appearing

```bash
# Check pushgateway
curl http://localhost:9091/metrics | grep e2e

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify scrape config
cat observability/prometheus.yml | grep pushgateway
```

### Dashboard Not Loading

```bash
# Restart Grafana
docker compose -f docker-compose.observability.yml restart grafana

# Re-import dashboard
curl -X POST http://localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @observability/dashboards/e2e-test-performance.json
```

### Alerts Not Firing

```bash
# Check Alertmanager
curl http://localhost:9093/api/v2/alerts

# Verify rules loaded
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].name'

# Test alert expression
curl 'http://localhost:9090/api/v1/query?query=e2e_total_tests_failed>0'
```

---

## Quick Reference

```bash
# Start full observability stack
make up && docker compose -f docker-compose.observability.yml up -d

# Run E2E with metrics collection
pnpm e2e --reporter=json

# View live dashboard
open http://localhost:3001/d/e2e-test-performance

# Check current alerts
curl http://localhost:9093/api/v2/alerts | jq '.[].labels.alertname'

# View error budget status
curl 'http://localhost:9090/api/v1/query?query=e2e:slo:burn_rate:7d' | jq '.data.result'
```

---

## Related Documentation

- [MEGA_MERGE_SYSTEM.md](MEGA_MERGE_SYSTEM.md) - CI/CD automation
- [docs/observability/](docs/observability/) - General observability docs
- [RUNBOOKS/](RUNBOOKS/) - Operational runbooks
- [observability/README.md](observability/README.md) - Observability stack setup

---

*Part of the Summit/IntelGraph E2E Observability Initiative*
