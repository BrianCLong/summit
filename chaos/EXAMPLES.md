# 📚 Resilience Lab - Examples and Use Cases

Comprehensive examples for using the Resilience Lab chaos engineering toolkit.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Advanced Scenarios](#advanced-scenarios)
- [CI/CD Integration](#cicd-integration)
- [Custom Scenarios](#custom-scenarios)
- [Monitoring Integration](#monitoring-integration)
- [Multi-Environment Testing](#multi-environment-testing)
- [Troubleshooting Examples](#troubleshooting-examples)

## Basic Usage

### Example 1: First Chaos Test

Run your first chaos test with the smoke suite:

```bash
# 1. Start the chaos testing stack
make chaos-up

# 2. Wait for services to be healthy
sleep 15

# 3. Run smoke test (safest option)
make chaos:smoke

# 4. View results
ls -lh artifacts/chaos/reports/
open artifacts/chaos/reports/suite_smoke_suite_*.html
```

**Expected Output:**
```
==> chaos:smoke: running smoke suite chaos tests
Resilience Lab Chaos Runner v2.0
Target: compose
Dry Run: false

Step 1/7: Checking dependencies...
✓ All dependencies satisfied

Step 2/7: Validating scenarios file...
✓ Scenarios file validated

...

Suite Results:
Total scenarios:   2
Passed:            2
Failed:            0

✅ All scenarios passed!
```

### Example 2: Single Scenario Test

Test a specific scenario:

```bash
# Test GraphQL API resilience
./chaos/runner.sh --scenario kill-graphql-api

# With verbose logging
./chaos/runner.sh --scenario kill-graphql-api --verbose

# Dry run (no actual chaos)
./chaos/runner.sh --scenario kill-graphql-api --dry-run
```

**Output:**
```json
{
  "scenario_id": "kill-graphql-api",
  "scenario_name": "GraphQL API Failure",
  "status": "pass",
  "metrics": {
    "recovery_time_seconds": 18
  }
}
```

### Example 3: Different Test Suites

```bash
# Smoke suite - quick validation (2 scenarios, ~5 mins)
make chaos:smoke

# CI suite - safe for automation (3 scenarios, ~10 mins)
SUITE=ci_suite make chaos:smoke

# Full suite - comprehensive (6 scenarios, ~30 mins)
make chaos:full
```

## Advanced Scenarios

### Example 4: Custom Recovery Time

Override the default recovery timeout:

```bash
# Allow up to 10 minutes for recovery
MAX_RECOVERY_TIME=600 ./chaos/runner.sh --scenario kill-postgres

# Quick timeout for fast-recovering services
MAX_RECOVERY_TIME=30 ./chaos/runner.sh --scenario kill-graphql-api
```

### Example 5: Custom Health Check Endpoint

```bash
# Use custom health endpoint
HEALTH_CHECK_URL=http://localhost:8080/healthz \
  ./chaos/runner.sh --scenario kill-graphql-api
```

### Example 6: Multiple Targets

Run chaos against different targets:

```bash
# Test Docker Compose stack
TARGET=compose ./chaos/runner.sh --suite smoke_suite

# Test Kubernetes cluster
TARGET=kubernetes ./chaos/runner.sh --suite smoke_suite

# Test both (sequentially)
TARGET=compose ./chaos/runner.sh --suite smoke_suite && \
TARGET=kubernetes ./chaos/runner.sh --suite smoke_suite
```

### Example 7: Kubernetes Namespace Testing

```bash
# Test specific namespace
NAMESPACE=staging TARGET=kubernetes \
  ./chaos/runner.sh --scenario kill-graphql-api

# Verify namespace before running
kubectl get pods -n staging
TARGET=kubernetes ./chaos/runner.sh --scenario kill-graphql-api
```

## CI/CD Integration

### Example 8: GitHub Actions - Nightly Chaos

```yaml
# .github/workflows/chaos-nightly.yml
name: Nightly Chaos Tests

on:
  schedule:
    - cron: '0 2 * * 1-5'  # 2 AM weekdays
  workflow_dispatch:

jobs:
  chaos-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start chaos stack
        run: make chaos-up

      - name: Run chaos tests
        run: |
          set +e
          make chaos:smoke
          EXIT_CODE=$?
          set -e

          # Upload reports regardless of outcome
          echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT

          exit $EXIT_CODE

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: chaos-reports
          path: artifacts/chaos/reports/

      - name: Stop stack
        if: always()
        run: make chaos-down
```

### Example 9: GitLab CI - On-Demand Chaos

```yaml
# .gitlab-ci.yml
chaos:smoke:
  stage: test
  script:
    - make chaos-up
    - make chaos:smoke
  artifacts:
    when: always
    paths:
      - artifacts/chaos/reports/
    expire_in: 30 days
  only:
    - schedules
    - web
  tags:
    - chaos-runner
```

### Example 10: Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent { label 'chaos-runner' }

    triggers {
        cron('H 2 * * 1-5')  // Nightly on weekdays
    }

    stages {
        stage('Setup') {
            steps {
                sh 'make chaos-up'
                sh 'sleep 15'  // Wait for services
            }
        }

        stage('Chaos Tests') {
            steps {
                script {
                    def exitCode = sh(
                        script: 'make chaos:smoke',
                        returnStatus: true
                    )

                    if (exitCode != 0) {
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('Reports') {
            steps {
                publishHTML([
                    reportDir: 'artifacts/chaos/reports',
                    reportFiles: 'suite_*.html',
                    reportName: 'Chaos Test Report'
                ])
            }
        }
    }

    post {
        always {
            sh 'make chaos-down'
        }
        failure {
            slackSend(
                color: 'danger',
                message: "Chaos tests failed: ${env.BUILD_URL}"
            )
        }
    }
}
```

## Custom Scenarios

### Example 11: Add Custom Scenario

Edit `chaos/scenarios.yaml`:

```yaml
scenarios:
  - id: custom-redis-failure
    name: "Redis Cache Failure"
    description: "Test application resilience to cache failures"
    severity: medium
    targets:
      compose:
        service: redis
        action: stop
        duration: 60
      kubernetes:
        namespace: default
        selector: app=redis
        action: delete-pod
    healthChecks:
      - type: http
        url: "http://localhost:4000/health"
        expectedStatus: 200
    metrics:
      - name: recovery_time
        threshold: 20

# Add to a suite
my_custom_suite:
  - custom-redis-failure
  - kill-graphql-api
```

Run it:

```bash
./chaos/runner.sh --scenario custom-redis-failure

# Or as part of suite
SUITE=my_custom_suite ./chaos/runner.sh
```

### Example 12: Cascading Failure Scenario

```yaml
scenarios:
  - id: cascade-all-databases
    name: "All Databases Cascading Failure"
    description: "Sequential failure of all databases"
    severity: critical
    targets:
      compose:
        services:
          - name: postgres
            action: stop
            delay: 0
          - name: neo4j
            action: stop
            delay: 10
          - name: redis
            action: stop
            delay: 20
        duration: 120
```

### Example 13: Network Partition Scenario

```yaml
scenarios:
  - id: network-partition
    name: "Network Partition"
    description: "Simulate network split"
    severity: high
    targets:
      compose:
        service: mc
        action: network-delay
        delay_ms: 500
        jitter_ms: 100
        duration: 90
```

## Monitoring Integration

### Example 14: Prometheus Metrics Collection

```bash
# Enable Prometheus metrics
PROMETHEUS_URL=http://localhost:9090 \
  ./chaos/runner.sh --suite smoke_suite

# Check collected metrics
ls artifacts/chaos/temp/*.json

# View aggregated metrics in report
jq '.metrics' artifacts/chaos/reports/suite_*.json
```

**Example Output:**
```json
{
  "metrics": {
    "recovery_time_seconds": 18,
    "avg_error_rate": 0.023,
    "max_p95_latency": 0.285,
    "min_availability": 0.97
  }
}
```

### Example 15: Grafana Dashboard Query

```promql
# Chaos test success rate
sum(rate(chaos_test_total{result="pass"}[1h])) /
sum(rate(chaos_test_total[1h]))

# Recovery time trend
avg(chaos_recovery_time_seconds) by (scenario_id)

# System availability during chaos
avg_over_time(up{job="intelgraph-server"}[5m]) and
max_over_time(chaos_active[5m]) == 1
```

### Example 16: Alert on Chaos Failures

```yaml
# prometheus-rules.yaml
groups:
  - name: chaos-alerts
    rules:
      - alert: ChaosTestFailing
        expr: |
          sum(rate(chaos_test_total{result="fail"}[1h])) > 0
        for: 5m
        annotations:
          summary: "Chaos tests are failing"
          description: "{{ $value }} chaos tests failed in the last hour"
```

## Multi-Environment Testing

### Example 17: Test All Environments

```bash
#!/bin/bash
# test-all-environments.sh

ENVIRONMENTS=("dev" "staging" "prod")

for env in "${ENVIRONMENTS[@]}"; do
    echo "Testing environment: $env"

    # Set environment-specific variables
    case $env in
        dev)
            HEALTH_CHECK_URL="http://dev.example.com/health"
            ;;
        staging)
            HEALTH_CHECK_URL="http://staging.example.com/health"
            ;;
        prod)
            # More conservative for production
            SUITE="smoke_suite"
            HEALTH_CHECK_URL="http://example.com/health"
            MAX_RECOVERY_TIME=120
            ;;
    esac

    # Run chaos tests
    HEALTH_CHECK_URL="$HEALTH_CHECK_URL" \
    MAX_RECOVERY_TIME="${MAX_RECOVERY_TIME:-300}" \
    SUITE="${SUITE:-ci_suite}" \
        ./chaos/runner.sh || echo "Failed in $env"

    # Brief pause between environments
    sleep 30
done
```

### Example 18: Canary Chaos Testing

```bash
#!/bin/bash
# canary-chaos.sh
# Run chaos against canary deployment first

echo "Testing canary deployment..."
TARGET=kubernetes \
NAMESPACE=canary \
  ./chaos/runner.sh --scenario kill-graphql-api

if [ $? -eq 0 ]; then
    echo "✅ Canary passed chaos test"
    echo "Promoting to production..."
    kubectl apply -f k8s/production/
else
    echo "❌ Canary failed chaos test"
    echo "Rolling back..."
    kubectl rollout undo deployment/app -n canary
    exit 1
fi
```

## Troubleshooting Examples

### Example 19: Debug Failed Scenario

```bash
# Run with verbose logging
VERBOSE=true ./chaos/runner.sh --scenario kill-postgres

# Check detailed logs
tail -100 artifacts/chaos/temp/*.log

# View full report
jq '.' artifacts/chaos/reports/kill-postgres_*.json

# Check health checks
jq '.health_checks' artifacts/chaos/reports/kill-postgres_*.json

# View failure reasons
jq '.failure_reasons' artifacts/chaos/reports/kill-postgres_*.json
```

### Example 20: Handle Concurrent Runs

```bash
# Check if chaos runner is already running
if [ -f artifacts/chaos/temp/chaos-runner.lock ]; then
    PID=$(cat artifacts/chaos/temp/chaos-runner.lock)
    if kill -0 "$PID" 2>/dev/null; then
        echo "Chaos runner already running (PID: $PID)"
        exit 1
    else
        echo "Removing stale lock file"
        rm artifacts/chaos/temp/chaos-runner.lock
    fi
fi

# Run chaos test
./chaos/runner.sh --suite smoke_suite
```

### Example 21: Recovery Timeout Troubleshooting

```bash
#!/bin/bash
# diagnose-recovery-timeout.sh

SCENARIO="kill-postgres"

echo "Running scenario with extended timeout and verbose logging..."

MAX_RECOVERY_TIME=600 \
VERBOSE=true \
  ./chaos/runner.sh --scenario "$SCENARIO" 2>&1 | tee debug.log

# Analyze logs
echo ""
echo "=== Health Check Attempts ==="
grep "Health check" debug.log

echo ""
echo "=== Recovery Progress ==="
grep "Still waiting for recovery" debug.log

echo ""
echo "=== Final Status ==="
jq '.recovery_status, .metrics.recovery_time_seconds' \
   artifacts/chaos/reports/${SCENARIO}_*.json
```

### Example 22: Service Health Investigation

```bash
#!/bin/bash
# investigate-service-health.sh

SERVICE="mc"

echo "Investigating $SERVICE health..."

# Check if service is running
docker-compose ps $SERVICE

# Check service logs
echo ""
echo "=== Recent Logs ==="
docker-compose logs --tail=50 $SERVICE

# Test health endpoint
echo ""
echo "=== Health Endpoint ==="
curl -v http://localhost:4000/health

# Check dependencies
echo ""
echo "=== Database Connectivity ==="
docker-compose exec $SERVICE \
  psql -h postgres -U summit -c "SELECT 1" || echo "Postgres unreachable"

docker-compose exec $SERVICE \
  curl neo4j:7474 || echo "Neo4j unreachable"
```

## Report Analysis

### Example 23: Extract Key Metrics

```bash
#!/bin/bash
# analyze-reports.sh

REPORTS_DIR="artifacts/chaos/reports"

echo "Chaos Test Summary"
echo "==================="

# Find all suite reports
for report in $REPORTS_DIR/suite_*.json; do
    [ -f "$report" ] || continue

    SUITE=$(jq -r '.suite' "$report")
    TOTAL=$(jq -r '.summary.total' "$report")
    PASSED=$(jq -r '.summary.passed' "$report")
    FAILED=$(jq -r '.summary.failed' "$report")
    TIMESTAMP=$(jq -r '.timestamp' "$report")

    echo ""
    echo "Suite: $SUITE"
    echo "Date: $TIMESTAMP"
    echo "Results: $PASSED/$TOTAL passed"

    if [ "$FAILED" -gt 0 ]; then
        echo "Failed scenarios:"
        jq -r '.scenarios[] | select(.status == "fail") | "  - \(.scenario_name): \(.failure_reasons | join(", "))"' "$report"
    fi
done
```

### Example 24: Compare Recovery Times

```bash
#!/bin/bash
# compare-recovery-times.sh

echo "Recovery Time Trends"
echo "===================="

# Get all reports for a specific scenario
SCENARIO="kill-graphql-api"

echo "Scenario: $SCENARIO"
echo ""
printf "%-20s %s\n" "Date" "Recovery Time"
printf "%-20s %s\n" "----" "-------------"

for report in artifacts/chaos/reports/${SCENARIO}_*.json; do
    [ -f "$report" ] || continue

    DATE=$(jq -r '.start_time_human' "$report" | cut -d' ' -f1)
    RECOVERY=$(jq -r '.metrics.recovery_time_seconds' "$report")

    printf "%-20s %ss\n" "$DATE" "$RECOVERY"
done

# Calculate average
echo ""
AVG=$(jq -s 'map(.metrics.recovery_time_seconds) | add / length' \
     artifacts/chaos/reports/${SCENARIO}_*.json)
echo "Average: ${AVG}s"
```

### Example 25: SLO Compliance Report

```bash
#!/bin/bash
# slo-compliance.sh

echo "SLO Compliance Report"
echo "====================="

# Recovery Time SLO
RECOVERY_SLO=30
RECOVERY_VIOLATIONS=$(jq -s \
  --arg slo "$RECOVERY_SLO" \
  'map(select(.metrics.recovery_time_seconds > ($slo | tonumber))) | length' \
  artifacts/chaos/reports/*.json)

TOTAL_TESTS=$(ls artifacts/chaos/reports/*.json 2>/dev/null | wc -l)

echo "Recovery Time SLO: ≤${RECOVERY_SLO}s"
echo "Violations: $RECOVERY_VIOLATIONS / $TOTAL_TESTS"

if [ "$RECOVERY_VIOLATIONS" -eq 0 ]; then
    echo "✅ 100% compliant"
else
    COMPLIANCE=$((100 * (TOTAL_TESTS - RECOVERY_VIOLATIONS) / TOTAL_TESTS))
    echo "⚠️  ${COMPLIANCE}% compliant"
fi
```

## Automation Scripts

### Example 26: Weekly Chaos Report

```bash
#!/bin/bash
# weekly-chaos-report.sh
# Run all chaos tests and generate weekly summary

WEEK=$(date +%Y-W%V)
REPORT_FILE="weekly-report-${WEEK}.md"

echo "# Weekly Chaos Engineering Report" > "$REPORT_FILE"
echo "**Week:** $WEEK" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Run full suite
echo "Running full chaos test suite..."
make chaos:full || true

# Generate summary
echo "## Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

LATEST_SUITE=$(ls -t artifacts/chaos/reports/suite_*.json | head -1)

jq -r '"- Total Scenarios: \(.summary.total)
- Passed: \(.summary.passed)
- Failed: \(.summary.failed)
- Success Rate: \((.summary.passed * 100 / .summary.total))%"' \
  "$LATEST_SUITE" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "## Failed Scenarios" >> "$REPORT_FILE"

jq -r '.scenarios[] | select(.status == "fail") | "### \(.scenario_name)
- Recovery Time: \(.metrics.recovery_time_seconds)s
- Failure Reasons: \(.failure_reasons | join(", "))
"' "$LATEST_SUITE" >> "$REPORT_FILE"

echo "Report generated: $REPORT_FILE"
cat "$REPORT_FILE"
```

### Example 27: Pre-Deployment Chaos Gate

```bash
#!/bin/bash
# pre-deployment-chaos-gate.sh
# Fail deployment if chaos tests don't pass

echo "Running pre-deployment chaos tests..."

# Run smoke suite
make chaos:smoke

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Chaos tests passed - deployment approved"
    exit 0
else
    echo "❌ Chaos tests failed - blocking deployment"
    echo ""
    echo "Review reports in artifacts/chaos/reports/"
    echo "Fix issues before deploying"
    exit 1
fi
```

## Best Practices Examples

### Example 28: Safe Production Chaos

```bash
#!/bin/bash
# safe-production-chaos.sh
# Conservative chaos testing for production

# 1. Check business hours (avoid peak hours)
HOUR=$(date +%H)
if [ "$HOUR" -ge 9 ] && [ "$HOUR" -le 17 ]; then
    echo "⚠️  Business hours - skipping chaos test"
    exit 0
fi

# 2. Check recent incidents
if [ -f /tmp/recent-incident.flag ]; then
    echo "⚠️  Recent incident detected - skipping chaos test"
    exit 0
fi

# 3. Run with conservative settings
MAX_RECOVERY_TIME=600 \
SUITE=smoke_suite \
TARGET=compose \
  ./chaos/runner.sh

# 4. Alert on-call if failed
if [ $? -ne 0 ]; then
    curl -X POST "$PAGERDUTY_WEBHOOK" \
      -d '{"event_action":"trigger","payload":{"summary":"Production chaos test failed"}}'
fi
```

### Example 29: Chaos Test Matrix

```bash
#!/bin/bash
# chaos-test-matrix.sh
# Test all combinations

TARGETS=("compose" "kubernetes")
SUITES=("smoke_suite" "ci_suite")

for target in "${TARGETS[@]}"; do
    for suite in "${SUITES[@]}"; do
        echo ""
        echo "===================="
        echo "Target: $target"
        echo "Suite: $suite"
        echo "===================="

        TARGET="$target" \
        SUITE="$suite" \
          ./chaos/runner.sh || echo "Failed: $target / $suite"

        sleep 30  # Cooldown between tests
    done
done
```

### Example 30: Chaos Test Metrics Dashboard

```bash
#!/bin/bash
# generate-metrics-dashboard.sh
# Generate metrics for dashboard

cat > chaos-metrics.json <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "total_scenarios": $(ls artifacts/chaos/reports/*.json 2>/dev/null | wc -l),
  "passed_24h": $(find artifacts/chaos/reports -name "*.json" -mtime -1 -exec jq -s 'map(select(.status == "pass")) | length' {} + | paste -sd+ | bc),
  "failed_24h": $(find artifacts/chaos/reports -name "*.json" -mtime -1 -exec jq -s 'map(select(.status == "fail")) | length' {} + | paste -sd+ | bc),
  "avg_recovery_time": $(jq -s 'map(.metrics.recovery_time_seconds) | add / length' artifacts/chaos/reports/*.json 2>/dev/null || echo 0),
  "slo_compliance_pct": $(jq -s 'map(select(.status == "pass")) | length / map(.) | length * 100' artifacts/chaos/reports/*.json 2>/dev/null || echo 100)
}
EOF

cat chaos-metrics.json

# Send to metrics system
curl -X POST "$METRICS_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d @chaos-metrics.json
```

## Conclusion

These examples cover the most common use cases for the Resilience Lab. For more information, see:

- [README.md](README.md) - Main documentation
- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [MIGRATION.md](MIGRATION.md) - Migration guide
- [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) - Production checklist

**Pro Tip:** Start with the simple examples and gradually move to advanced scenarios as your team gains confidence with chaos engineering!
