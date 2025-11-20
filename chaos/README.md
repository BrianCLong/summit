# 🔥 Resilience Lab - Chaos Engineering for Summit

Welcome to the Summit Resilience Lab! This comprehensive chaos engineering framework enables systematic resilience testing of the Summit platform through automated chaos drills.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Standard Chaos Scenarios](#standard-chaos-scenarios)
- [Running Chaos Tests](#running-chaos-tests)
- [Reports and Metrics](#reports-and-metrics)
- [SLO Validation](#slo-validation)
- [CI/CD Integration](#cicd-integration)
- [Architecture](#architecture)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Overview

The Resilience Lab provides:

- **7 Standard Chaos Scenarios** - Pre-defined experiments targeting critical system components
- **Automated Recovery Measurement** - Track time-to-recovery and error rates
- **Multi-Target Support** - Run against Docker Compose or Kubernetes
- **SLO Validation** - Ensure chaos drills meet defined Service Level Objectives
- **Alerting Integration** - Verify that chaos exercises alert rules
- **HTML Reports** - Visual dashboards for chaos experiment results
- **CI/CD Ready** - Integrate chaos tests into your deployment pipeline

### Key Features

✅ Single command execution
✅ Predictable report storage
✅ Visible to the team (logs, dashboards, reports)
✅ Safe, scoped experiments
✅ Golden-path stack recovery validation

## Quick Start

### Prerequisites

- Docker and Docker Compose
- `jq`, `curl`, `bc` installed
- Prometheus running (optional, for metrics)
- Make

### 1. Start the Chaos Testing Stack

```bash
make chaos-up
```

This starts the full stack including:
- PostgreSQL database
- Neo4j graph database
- GraphQL API (mc)
- Prometheus & Grafana
- OPA & CompanyOS

### 2. Run Your First Chaos Test

```bash
make chaos:smoke
```

This runs the smoke test suite with:
- GraphQL API failure test
- Network latency test

### 3. View Results

Reports are stored in `artifacts/chaos/reports/`:

```bash
# View latest HTML report
open artifacts/chaos/reports/suite_smoke_suite_*.html

# View JSON report
cat artifacts/chaos/reports/suite_smoke_suite_*.json | jq
```

## Standard Chaos Scenarios

### 1. Kill Neo4j Database (`kill-neo4j`)

**Severity:** High
**Duration:** 60 seconds
**SLO:** Recover within 30s, <5% error rate

Tests resilience to graph database failures:
- Stops Neo4j container (Docker Compose) or deletes pod (Kubernetes)
- Monitors GraphQL API health
- Verifies graceful degradation and recovery

### 2. Kill PostgreSQL Database (`kill-postgres`)

**Severity:** High
**Duration:** 60 seconds
**SLO:** Recover within 30s, <5% error rate

Tests resilience to relational database failures:
- Stops Postgres container or pod
- Validates connection pool recovery
- Ensures data consistency

### 3. Kill GraphQL API (`kill-graphql-api`)

**Severity:** Critical
**Duration:** 45 seconds
**SLO:** Recover within 20s, ≥95% success rate

Tests high availability and load balancing:
- Terminates API server
- Verifies automatic restart
- Checks load balancer failover

### 4. Network Latency (`network-latency-db`)

**Severity:** Medium
**Duration:** 120 seconds
**SLO:** P95 latency <300ms, P99 <500ms

Introduces network delays between app and databases:
- Adds 100ms latency with 20ms jitter
- Tests timeout handling
- Validates graceful degradation

### 5. CPU Starvation (`cpu-stress`)

**Severity:** Medium
**Duration:** 90 seconds
**SLO:** P95 latency <1000ms, <5% error rate

Simulates high CPU load:
- 80% CPU utilization
- Tests request queuing
- Validates resource limits

### 6. Memory Pressure (`memory-stress`)

**Severity:** Medium
**Duration:** 60 seconds
**SLO:** Recover within 30s, ≤1 OOM kill

Tests memory exhaustion handling:
- Allocates 256MB memory stress
- Monitors OOM behavior
- Validates graceful restart

### 7. Cascading Failure (`cascade-db-api`)

**Severity:** Critical
**Duration:** 90 seconds
**SLO:** Recover within 60s, <10% error rate

Sequential failure propagation:
- Postgres → Neo4j → API restart
- Tests circuit breakers
- Validates failure isolation

## Running Chaos Tests

### Makefile Targets

```bash
# Start chaos stack
make chaos-up

# Run smoke suite (quick validation)
make chaos:smoke

# Run full resilience suite
make chaos:full

# Validate SLO compliance
make chaos:validate-slos

# Dry run (no actual chaos)
make chaos:dry-run

# Stop chaos stack
make chaos-down
```

### Direct Runner Usage

```bash
# Run specific scenario
./chaos/runner.sh --scenario kill-graphql-api

# Run against Kubernetes
TARGET=kubernetes ./chaos/runner.sh --suite smoke_suite

# Dry run mode
./chaos/runner.sh --scenario kill-postgres --dry-run

# Verbose output
./chaos/runner.sh --scenario network-latency-db --verbose
```

### Test Suites

**Smoke Suite** (`smoke_suite`):
- `kill-graphql-api`
- `network-latency-db`

**CI Suite** (`ci_suite`):
- `kill-graphql-api`
- `network-latency-db`
- `cpu-stress`

**Full Suite** (`full_suite`):
- `kill-neo4j`
- `kill-postgres`
- `kill-graphql-api`
- `network-latency-db`
- `cpu-stress`
- `memory-stress`

## Reports and Metrics

### Report Structure

Reports are stored in `artifacts/chaos/reports/`:

```
artifacts/chaos/
├── reports/
│   ├── suite_smoke_suite_20231120_143022.json     # Suite summary
│   ├── suite_smoke_suite_20231120_143022.html     # Visual dashboard
│   ├── kill-graphql-api_20231120_143025.json      # Individual scenario
│   └── kill-graphql-api_20231120_143025.html
└── temp/
    └── kill-graphql-api.error_rate.json           # Prometheus metrics
```

### JSON Report Format

```json
{
  "scenario_id": "kill-graphql-api",
  "scenario_name": "GraphQL API Failure",
  "target": "compose",
  "start_time": "1700489422",
  "end_time": "1700489482",
  "status": "pass",
  "total_duration_seconds": 60,
  "metrics": {
    "recovery_time_seconds": 18
  }
}
```

### HTML Dashboard

Open HTML reports for visual summaries:
- Overall pass/fail status
- Recovery time trends
- SLO compliance indicators
- Timeline visualization

## SLO Validation

### Service Level Objectives

The Resilience Lab enforces these SLOs:

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Availability | ≥95% | <90% |
| Error Rate | ≤5% | >10% |
| Recovery Time | ≤30s | >60s |
| P95 Latency | ≤500ms | >1000ms |
| P99 Latency | ≤1000ms | >2000ms |

### Running SLO Validation

```bash
# Full validation
make chaos:validate-slos

# Or directly
./chaos/slo-validator.sh

# Check specific metrics
./chaos/slo-validator.sh --check-slos
./chaos/slo-validator.sh --check-alerts
./chaos/slo-validator.sh --verify-chaos
```

### SLO Report Output

```
Current SLO Status:
==================
[SUCCESS] Availability: 98% (SLO: ≥95%)
[SUCCESS] Error Rate: 2% (SLO: ≤5%)
[SUCCESS] P95 Latency: 245ms (SLO: ≤500ms)

SLO Compliance Summary:
======================
availability: PASS
error_rate: PASS
latency_p95: PASS
latency_p99: PASS
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Chaos Tests

on:
  schedule:
    - cron: '0 2 * * 1-5'  # Nightly on weekdays
  workflow_dispatch:         # Manual trigger

jobs:
  chaos-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start chaos stack
        run: make chaos-up

      - name: Run smoke suite
        run: make chaos:smoke

      - name: Validate SLOs
        run: make chaos:validate-slos

      - name: Upload reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: chaos-reports
          path: artifacts/chaos/reports/

      - name: Stop stack
        if: always()
        run: make chaos-down
```

### GitLab CI Example

```yaml
chaos:smoke:
  stage: test
  script:
    - make chaos-up
    - make chaos:smoke
    - make chaos:validate-slos
  artifacts:
    when: always
    paths:
      - artifacts/chaos/reports/
  only:
    - schedules
    - web
```

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────┐
│         Resilience Lab Architecture         │
└─────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐
│   Makefile   │─────▶│  runner.sh   │
└──────────────┘      └──────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐  ┌──────────┐
       │ Docker   │   │scenarios │  │   SLO    │
       │ Compose  │   │  .yaml   │  │Validator │
       └──────────┘   └──────────┘  └──────────┘
              │                            │
              ▼                            ▼
       ┌──────────┐              ┌──────────────┐
       │ Target   │              │  Prometheus  │
       │ Services │              │   Metrics    │
       └──────────┘              └──────────────┘
              │                            │
              └────────────┬───────────────┘
                           ▼
                    ┌─────────────┐
                    │   Reports   │
                    │ (JSON/HTML) │
                    └─────────────┘
```

### File Structure

```
chaos/
├── README.md                      # This file
├── scenarios.yaml                 # Chaos scenario definitions
├── runner.sh                      # Main chaos execution engine
├── slo-validator.sh               # SLO compliance checker
├── chaos-dashboard.yaml           # Grafana dashboard config
└── experiments/                   # Kubernetes chaos manifests
    ├── network-latency.yaml
    ├── pod-killer.yaml
    ├── kill-postgres.yaml
    ├── kill-neo4j.yaml
    └── kill-graphql-api.yaml

compose/
└── docker-compose.chaos.yml       # Database services for chaos

artifacts/chaos/
├── reports/                       # Generated reports
├── temp/                          # Temporary metrics
└── worker-crash.log               # Historical logs
```

## Advanced Usage

### Custom Scenarios

Edit `chaos/scenarios.yaml` to add custom scenarios:

```yaml
scenarios:
  - id: my-custom-scenario
    name: "Custom Test"
    description: "My custom chaos test"
    severity: medium
    targets:
      compose:
        service: my-service
        action: restart
        duration: 30
    healthChecks:
      - type: http
        url: "http://localhost:8080/health"
        expectedStatus: 200
    metrics:
      - name: recovery_time
        threshold: 20
```

### Kubernetes Deployment

For Kubernetes chaos testing:

```bash
# Deploy chaos experiments
kubectl apply -f chaos/experiments/

# Run against k8s
TARGET=kubernetes ./chaos/runner.sh --suite smoke_suite

# Check chaos resources
kubectl get chaosengines
kubectl get chaosschedules
kubectl get chaosresults
```

### Prometheus Integration

Configure Prometheus URL for metrics collection:

```bash
export PROMETHEUS_URL=http://prometheus.monitoring.svc:9090
./chaos/runner.sh --suite smoke_suite
```

### Custom Test Suites

Define custom suites in `scenarios.yaml`:

```yaml
# My custom suite
my_suite:
  - kill-postgres
  - cpu-stress
  - my-custom-scenario
```

Run it:

```bash
SUITE=my_suite ./chaos/runner.sh
```

## Troubleshooting

### Common Issues

**Issue:** "Missing dependencies: docker-compose"

```bash
# Install docker-compose
sudo apt-get install docker-compose
# Or use docker compose v2
alias docker-compose='docker compose'
```

**Issue:** "System unhealthy before chaos"

```bash
# Check service health
docker-compose -f compose/docker-compose.yml \
               -f compose/docker-compose.chaos.yml ps

# View logs
docker-compose -f compose/docker-compose.yml \
               -f compose/docker-compose.chaos.yml logs mc
```

**Issue:** "Prometheus not available"

```bash
# Check if Prometheus is running
curl http://localhost:9090/-/healthy

# Start Prometheus with compose stack
make chaos-up
```

**Issue:** "Recovery timeout exceeded"

This indicates the system didn't recover within SLO:
1. Check application logs for errors
2. Verify auto-restart policies
3. Review resource limits
4. Check circuit breaker configuration

### Debug Mode

Enable verbose output:

```bash
./chaos/runner.sh --scenario kill-postgres --verbose
```

### Dry Run Testing

Test chaos scenarios without executing:

```bash
make chaos:dry-run
# Or
DRY_RUN=true ./chaos/runner.sh --suite smoke_suite
```

### Manual Cleanup

If chaos tests leave containers in bad state:

```bash
# Stop all chaos services
make chaos-down

# Clean up Docker resources
docker-compose -f compose/docker-compose.yml \
               -f compose/docker-compose.chaos.yml down -v

# Remove orphaned containers
docker container prune -f
```

## Best Practices

1. **Start Small** - Run `chaos:smoke` before `chaos:full`
2. **Use Dry Runs** - Test scenarios with `--dry-run` first
3. **Monitor Dashboards** - Watch Grafana during chaos tests
4. **Review Reports** - Analyze HTML reports after each run
5. **Validate SLOs** - Always run `chaos:validate-slos` after changes
6. **Schedule Regularly** - Run chaos tests on a schedule (nightly/weekly)
7. **Document Findings** - Track improvements over time
8. **Team Visibility** - Share reports with the team

## Support and Contributing

For issues, questions, or contributions:

1. Check existing chaos experiment results in `artifacts/chaos/reports/`
2. Review Grafana chaos dashboard at `http://localhost:3001`
3. Examine Prometheus metrics at `http://localhost:9090`
4. Open an issue with chaos reports attached

## Next Steps

- [ ] Run your first chaos test: `make chaos:smoke`
- [ ] Review the HTML report
- [ ] Integrate into CI/CD pipeline
- [ ] Schedule nightly chaos tests
- [ ] Customize scenarios for your needs
- [ ] Set up alerting integration
- [ ] Share results with the team

---

**Remember:** Chaos Engineering is about learning and improving system resilience. Every failure is an opportunity to make Summit more robust! 🚀
