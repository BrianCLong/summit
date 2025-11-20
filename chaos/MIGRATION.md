# 🔄 Resilience Lab - Migration Guide

This guide helps you migrate from the initial chaos implementation to the enhanced Resilience Lab v2.0.

## Overview

The Resilience Lab v2.0 introduces significant improvements in error handling, reporting, and production-readiness while maintaining backward compatibility where possible.

## What's New in v2.0

### Major Features

1. **Enhanced Error Handling**
   - Comprehensive exit codes (0-5)
   - Lock file mechanism to prevent concurrent runs
   - Automatic cleanup on exit/errors
   - Detailed error messages with context

2. **Improved Logging**
   - Timestamps on all log messages
   - Debug mode (`--verbose` or `VERBOSE=true`)
   - Structured log levels (INFO, SUCCESS, WARN, ERROR, DEBUG)
   - Logs to stderr, output to stdout

3. **Robust Recovery Measurement**
   - Requires 3 consecutive successful health checks
   - Progress indicators every 30 seconds
   - Configurable recovery timeout
   - Better handling of flaky services

4. **Enhanced Reporting**
   - Runner version tracking (`"runner_version": "2.0"`)
   - Comprehensive metadata (hostname, timestamps)
   - Health check tracking
   - Chaos action history
   - Failure reason tracking
   - Prometheus metrics aggregation

5. **Production-Ready Features**
   - Lock file prevents concurrent execution
   - Proper signal handling (INT, TERM, EXIT)
   - IFS security settings
   - Readonly constants
   - Input validation

6. **Better Health Checks**
   - Consecutive success requirement
   - Connect timeout vs request timeout
   - Retry logic with exponential backoff
   - Multiple health check types (HTTP, GraphQL, TCP)

## Breaking Changes

### 1. Report Format Changes

**Old Format:**
```json
{
  "scenario_id": "kill-postgres",
  "status": "pass",
  "metrics": {
    "recovery_time_seconds": 18
  }
}
```

**New Format:**
```json
{
  "scenario_id": "kill-postgres",
  "scenario_name": "PostgreSQL Database Failure",
  "target": "compose",
  "hostname": "prod-runner-01",
  "runner_version": "2.0",
  "dry_run": false,
  "status": "pass",
  "start_time": 1700489422,
  "start_time_human": "2023-11-20 14:30:22",
  "end_time": 1700489480,
  "end_time_human": "2023-11-20 14:31:20",
  "total_duration_seconds": 58,
  "chaos_duration_seconds": 60,
  "recovery_status": "recovered",
  "metrics": {
    "recovery_time_seconds": 18,
    "avg_error_rate": 0.02,
    "max_p95_latency": 0.245,
    "min_availability": 0.98
  },
  "chaos_actions": [
    {
      "service": "postgres",
      "action": "stop",
      "duration": 60,
      "time": 1700489432
    }
  ],
  "health_checks": [
    {
      "time": 1700489422,
      "type": "pre-chaos",
      "status": "passed"
    },
    {
      "time": 1700489480,
      "type": "post-chaos",
      "status": "passed"
    }
  ],
  "errors": [],
  "failure_reasons": []
}
```

**Migration:**
- Update report parsers to handle new fields
- `runner_version` field helps identify report format
- Old tools can still read `scenario_id`, `status`, and `metrics.recovery_time_seconds`

### 2. Exit Codes

**Old Behavior:**
- Exit code 0 for success
- Exit code 1 for all failures

**New Behavior:**
- Exit code 0: Success
- Exit code 1: General error
- Exit code 2: Missing dependencies
- Exit code 3: Invalid configuration
- Exit code 4: Scenario execution failed
- Exit code 5: Recovery timeout

**Migration:**
```bash
# Old approach
if ./chaos/runner.sh; then
    echo "Success"
else
    echo "Failed"
fi

# New approach (more specific)
./chaos/runner.sh
EXIT_CODE=$?

case $EXIT_CODE in
    0)
        echo "Success"
        ;;
    2)
        echo "Missing dependencies - install required tools"
        ;;
    3)
        echo "Invalid configuration - check scenarios.yaml"
        ;;
    4)
        echo "Scenario failed - check reports"
        ;;
    5)
        echo "Recovery timeout - system did not recover"
        ;;
    *)
        echo "General error"
        ;;
esac
```

### 3. Lock File Mechanism

**New Behavior:**
- Only one chaos runner can execute at a time
- Lock file: `artifacts/chaos/temp/chaos-runner.lock`
- Contains PID of running process
- Stale locks automatically cleaned

**Migration:**
- If you run multiple chaos tests in parallel, they will now queue
- Use different environments or namespaces for parallel testing
- To override: `rm artifacts/chaos/temp/chaos-runner.lock`

**Parallel Testing:**
```bash
# Old (would run concurrently, potentially conflicting)
./chaos/runner.sh --scenario kill-postgres &
./chaos/runner.sh --scenario kill-neo4j &

# New (run sequentially or use different targets)
# Option 1: Sequential
./chaos/runner.sh --scenario kill-postgres
./chaos/runner.sh --scenario kill-neo4j

# Option 2: Different targets
TARGET=compose ./chaos/runner.sh --scenario kill-postgres &
TARGET=kubernetes ./chaos/runner.sh --scenario kill-neo4j &
```

### 4. Health Check Changes

**Old Behavior:**
- Single successful health check confirms recovery
- Could report false positives for flaky services

**New Behavior:**
- Requires 3 consecutive successful health checks
- More reliable but slightly longer recovery times

**Migration:**
- Recovery times may increase by 4-6 seconds (2s interval × 2 extra checks)
- Adjust SLO thresholds if needed:

```yaml
# old slo
slos:
  recovery_time_seconds: 30

# new slo (add buffer for consecutive checks)
slos:
  recovery_time_seconds: 35  # +5s buffer
```

### 5. Environment Variable Changes

**New Variables:**
```bash
MAX_RECOVERY_TIME=300      # Maximum time to wait for recovery
HEALTH_CHECK_URL=...       # Override default health check endpoint
VERBOSE=true               # Enable debug logging
```

**Migration:**
Update CI/CD pipelines:
```yaml
# Old
- run: ./chaos/runner.sh

# New (with optional configuration)
- run: |
    export MAX_RECOVERY_TIME=600
    export VERBOSE=true
    ./chaos/runner.sh
```

## Non-Breaking Enhancements

These features are additions that don't break existing functionality:

### 1. Verbose Mode

```bash
# Enable detailed debug logs
./chaos/runner.sh --verbose

# Or
VERBOSE=true ./chaos/runner.sh
```

### 2. Dry Run Mode

```bash
# Test scenarios without executing chaos
./chaos/runner.sh --dry-run

# Or
DRY_RUN=true ./chaos/runner.sh
```

### 3. Enhanced HTML Reports

- Modern, responsive design
- Gradient backgrounds
- Interactive hover effects
- Better mobile support
- Embedded JSON data for offline viewing

No migration needed - HTML reports are backward compatible.

### 4. Prometheus Metrics Collection

```bash
# Enable Prometheus metrics collection
PROMETHEUS_URL=http://prometheus:9090 ./chaos/runner.sh
```

Automatically collects:
- Error rates
- P95/P99 latency
- Availability
- Aggregated metrics

## Migration Steps

### Step 1: Update Scripts

If you have custom scripts that parse chaos reports:

```bash
# Old parsing
RECOVERY_TIME=$(jq -r '.metrics.recovery_time_seconds' report.json)

# New parsing (still works!)
RECOVERY_TIME=$(jq -r '.metrics.recovery_time_seconds' report.json)

# Enhanced parsing (use new fields)
RECOVERY_TIME=$(jq -r '.metrics.recovery_time_seconds' report.json)
RUNNER_VERSION=$(jq -r '.runner_version' report.json)
HOSTNAME=$(jq -r '.hostname' report.json)
ERROR_RATE=$(jq -r '.metrics.avg_error_rate' report.json)
```

### Step 2: Update CI/CD Pipelines

```yaml
# Old GitHub Actions workflow
- name: Run chaos tests
  run: ./chaos/runner.sh --suite smoke_suite

# New workflow (with error handling)
- name: Run chaos tests
  run: |
    set +e
    ./chaos/runner.sh --suite smoke_suite
    EXIT_CODE=$?
    set -e

    case $EXIT_CODE in
      0)
        echo "✅ All chaos tests passed"
        ;;
      2)
        echo "❌ Missing dependencies"
        exit 1
        ;;
      3)
        echo "❌ Invalid configuration"
        exit 1
        ;;
      4)
        echo "❌ Scenario failed - system did not meet SLO"
        exit 1
        ;;
      5)
        echo "❌ Recovery timeout - system did not recover"
        exit 1
        ;;
      *)
        echo "❌ Unknown error"
        exit 1
        ;;
    esac
```

### Step 3: Update Monitoring/Alerting

If you monitor chaos test results:

```bash
# Old Prometheus query
chaos_test_failures = count(chaos_test_status{status="fail"})

# New query (use additional metadata)
chaos_test_failures = count(chaos_test_status{
  status="fail",
  runner_version="2.0"
})

# Query by failure reason
chaos_test_timeout_failures = count(chaos_test_status{
  status="fail",
  failure_reason=~".*timeout.*"
})
```

### Step 4: Update Documentation

Update internal documentation to reflect:
- New exit codes
- Lock file behavior
- Enhanced reporting format
- Verbose mode usage

## Compatibility Matrix

| Feature | v1.0 | v2.0 | Compatible? |
|---------|------|------|-------------|
| Basic scenario execution | ✅ | ✅ | ✅ Yes |
| Report JSON structure | ✅ | ✅ | ⚠️ Superset |
| Exit codes | 0, 1 | 0-5 | ⚠️ Enhanced |
| Concurrent execution | ✅ | ❌ | ❌ Locked |
| Health check logic | Single | Triple | ⚠️ Changed |
| HTML reports | ✅ | ✅ | ✅ Enhanced |
| Makefile targets | ✅ | ✅ | ✅ Yes |
| Docker Compose support | ✅ | ✅ | ✅ Yes |
| Kubernetes support | ✅ | ✅ | ✅ Yes |

Legend:
- ✅ Fully compatible
- ⚠️ Compatible with caveats
- ❌ Breaking change

## Rollback Plan

If you need to rollback to v1.0:

```bash
# 1. Checkout previous version
git checkout <commit-before-v2>

# 2. Or manually revert runner.sh
git show <commit-before-v2>:chaos/runner.sh > chaos/runner.sh

# 3. Remove lock file if exists
rm -f artifacts/chaos/temp/chaos-runner.lock

# 4. Test
./chaos/runner.sh --dry-run
```

## Testing Migration

Before rolling out v2.0 to production:

```bash
# 1. Run unit tests
./chaos/test-runner.sh --verbose

# 2. Run dry-run tests
./chaos/runner.sh --suite smoke_suite --dry-run

# 3. Run actual chaos in staging
TARGET=compose ./chaos/runner.sh --suite smoke_suite

# 4. Verify reports
ls -lh artifacts/chaos/reports/

# 5. Check HTML report
open artifacts/chaos/reports/suite_smoke_suite_*.html

# 6. Validate JSON structure
jq '.' artifacts/chaos/reports/suite_smoke_suite_*.json
```

## FAQ

### Q: Do I need to update my scenarios.yaml?
**A:** No, scenarios.yaml format is unchanged and fully compatible.

### Q: Will old reports work with new HTML generator?
**A:** Yes, the HTML generator handles both old and new report formats.

### Q: Can I run v1.0 and v2.0 simultaneously?
**A:** No, the lock file prevents this. Run them on different machines or remove the lock.

### Q: How do I know which version generated a report?
**A:** Check the `runner_version` field in JSON reports. v1.0 reports won't have this field.

### Q: Do I need to update my Grafana dashboards?
**A:** Only if you want to use new metrics fields. Existing metrics still work.

### Q: What if a test fails due to the 3-check requirement?
**A:** This indicates your service has intermittent health issues. You can:
1. Fix the service health endpoint
2. Increase recovery time SLO
3. Reduce health check interval

### Q: Can I disable the lock file?
**A:** Not recommended, but you can delete it between runs:
```bash
rm -f artifacts/chaos/temp/chaos-runner.lock
./chaos/runner.sh
```

### Q: How do I handle the new exit codes in scripts?
**A:** Use case statements as shown in the exit codes section above.

## Support

If you encounter issues during migration:

1. Check logs with verbose mode: `./chaos/runner.sh --verbose`
2. Run unit tests: `./chaos/test-runner.sh`
3. Review migration examples in this guide
4. Check artifacts/chaos/reports/ for detailed error information
5. Open an issue with:
   - Runner version (`jq -r '.runner_version' report.json`)
   - Error logs
   - Report JSON
   - Steps to reproduce

## Timeline

Recommended migration timeline:

- **Week 1**: Review this guide, test in development
- **Week 2**: Update CI/CD pipelines, test in staging
- **Week 3**: Update monitoring/alerting
- **Week 4**: Roll out to production with monitoring
- **Week 5**: Remove v1.0 compatibility code

## Checklist

Before completing migration:

- [ ] Read full migration guide
- [ ] Test in development environment
- [ ] Update CI/CD pipelines
- [ ] Update monitoring queries
- [ ] Update alerting rules
- [ ] Test in staging environment
- [ ] Update documentation
- [ ] Train team on new features
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Archive v1.0 reports

## Conclusion

The Resilience Lab v2.0 provides significant improvements in reliability, observability, and production-readiness while maintaining compatibility for most use cases. The migration is straightforward for basic usage and provides a clear path for advanced users who need the enhanced features.

For questions or support, refer to the main [README.md](README.md) or open an issue.
