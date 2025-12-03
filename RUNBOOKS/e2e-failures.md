# E2E Test Failure Runbook

**Severity:** P2 (High) - P1 if blocking deployments
**On-Call Team:** Platform Engineering
**Escalation Path:** Platform Lead → Engineering Manager → CTO

---

## Overview

This runbook covers investigation and resolution of E2E test failures detected by the E2E Observability Pipeline. E2E test failures can indicate:
- Application bugs or regressions
- Infrastructure issues
- Test environment problems
- Flaky test behavior

---

## Alert Triggers

| Alert | Severity | Threshold |
|-------|----------|-----------|
| `E2ETestSuiteFailure` | Critical | Any test failure |
| `E2ESuccessRateCritical` | Critical | Success rate < 90% |
| `E2ESuccessRateWarning` | Warning | Success rate < 98% |
| `E2EFlakyTestsDetected` | Warning | > 3 flaky tests |

---

## Initial Triage (5 minutes)

### Step 1: Assess Impact

```bash
# Check current failure count
curl -s 'http://prometheus:9090/api/v1/query?query=e2e_total_tests_failed' | jq '.data.result[0].value[1]'

# Check which suites are failing
curl -s 'http://prometheus:9090/api/v1/query?query=e2e_tests_failed_total' | jq '.data.result[] | {suite: .metric.suite, failed: .value[1]}'

# Check success rate trend (last hour)
curl -s 'http://prometheus:9090/api/v1/query?query=avg_over_time(e2e_test_success_rate[1h])' | jq '.data.result[0].value[1]'
```

### Step 2: Determine Scope

- [ ] Single test or multiple tests?
- [ ] Single suite or multiple suites?
- [ ] Started with specific commit?
- [ ] Affecting all runs or intermittent?

### Step 3: Check Recent Changes

```bash
# View recent commits
git log --oneline -20

# Check if failure correlates with specific commit
git log --since="2 hours ago" --oneline

# View recent merged PRs
gh pr list --state merged --limit 10
```

---

## Investigation Procedures

### Scenario A: Single Test Failure

**Symptoms:** One specific test consistently failing

**Steps:**

1. **Get test details from GitHub Actions:**
   ```bash
   # List recent workflow runs
   gh run list --workflow=e2e-observability.yml --limit 5

   # View specific run logs
   gh run view <run-id> --log
   ```

2. **Download and analyze Playwright traces:**
   ```bash
   # Download artifacts
   gh run download <run-id> -n e2e-results-<suite>

   # View trace locally
   npx playwright show-trace test-results/**/trace.zip
   ```

3. **Check for recent changes to the test or tested code:**
   ```bash
   git log --oneline -10 -- "client/tests/**" "e2e/**"
   git log --oneline -10 -- "<path-to-affected-component>"
   ```

4. **Reproduce locally:**
   ```bash
   # Start local stack
   make up

   # Run specific test
   cd client && npx playwright test <test-file> --headed --debug
   ```

### Scenario B: Multiple Test Failures

**Symptoms:** Multiple tests failing across suites

**Steps:**

1. **Check infrastructure health:**
   ```bash
   # Check service health
   curl -s http://localhost:4000/health | jq
   curl -s http://localhost:4000/health/detailed | jq

   # Check database connectivity
   docker compose exec postgres pg_isready
   docker compose exec neo4j cypher-shell "RETURN 1"
   docker compose exec redis redis-cli ping
   ```

2. **Check for resource exhaustion:**
   ```bash
   # Check Docker resources
   docker stats --no-stream

   # Check disk space
   df -h

   # Check memory
   free -h
   ```

3. **Review application logs:**
   ```bash
   # Server logs
   docker compose logs server --tail 200 | grep -i error

   # Client logs
   docker compose logs client --tail 100
   ```

4. **Check for external dependencies:**
   ```bash
   # Check if external services are reachable
   curl -s https://api.example.com/health || echo "External API unreachable"
   ```

### Scenario C: Flaky Tests

**Symptoms:** Tests pass/fail inconsistently

**Steps:**

1. **Identify flaky tests:**
   ```bash
   # Check flaky test count
   curl -s 'http://prometheus:9090/api/v1/query?query=e2e_tests_flaky_total' | jq '.data.result'

   # Review test results for patterns
   cat observability/e2e-metrics-history.json | jq '.runs[:10] | .[].suites[] | select(.tests.flaky > 0)'
   ```

2. **Common flaky test causes:**
   - Race conditions in async code
   - Timing-dependent assertions
   - Shared state between tests
   - Network timeouts
   - Animation/transition timing

3. **Fix strategies:**
   ```javascript
   // Add explicit waits instead of fixed timeouts
   await page.waitForSelector('[data-testid="loaded"]');

   // Use more resilient locators
   await page.getByRole('button', { name: 'Submit' }).click();

   // Increase timeout for slow operations
   await expect(page.locator('.result')).toBeVisible({ timeout: 10000 });
   ```

4. **Quarantine persistently flaky tests:**
   ```javascript
   // Mark test as flaky for tracking
   test.describe('Flaky Suite', () => {
     test.fixme('flaky test', async () => {
       // TODO: Fix race condition - tracking issue #1234
     });
   });
   ```

### Scenario D: Environment/Infrastructure Issues

**Symptoms:** All tests failing, services not starting

**Steps:**

1. **Restart the stack:**
   ```bash
   make down
   docker system prune -f
   make up
   ./scripts/wait-for-stack.sh
   ```

2. **Check Docker Compose status:**
   ```bash
   docker compose ps
   docker compose logs --tail 50
   ```

3. **Verify environment configuration:**
   ```bash
   # Check .env exists and has required vars
   cat .env | grep -E "^(DATABASE|REDIS|NEO4J)" | head -10

   # Compare with example
   diff .env .env.example | head -20
   ```

4. **Check network connectivity:**
   ```bash
   # Verify containers can communicate
   docker compose exec server ping -c 2 postgres
   docker compose exec server ping -c 2 neo4j
   docker compose exec server ping -c 2 redis
   ```

---

## Resolution Actions

### Immediate Fixes

| Issue | Action |
|-------|--------|
| Single test bug | Fix and push, or skip with tracking issue |
| Infrastructure issue | Restart stack, escalate if persistent |
| Flaky test | Quarantine with `.fixme()`, create issue |
| Configuration drift | Reset `.env` from example |

### Creating a Fix PR

```bash
# Create fix branch
git checkout -b fix/e2e-<description>

# Make fix
# ... edit files ...

# Run tests locally
cd client && npx playwright test

# Commit and push
git add .
git commit -m "fix(e2e): <description>"
git push -u origin fix/e2e-<description>

# Create PR
gh pr create --title "fix(e2e): <description>" --body "Fixes E2E test failure in <suite>"
```

### Skipping a Broken Test

```javascript
// In the test file, mark as skipped with reason
test.skip('broken test', async () => {
  // Skipped due to: <reason>
  // Tracking issue: #<issue-number>
});
```

---

## Escalation Criteria

Escalate to Platform Lead if:
- [ ] Failures persist > 2 hours
- [ ] All suites failing
- [ ] Infrastructure issues not resolvable
- [ ] Blocking production deployment

Escalate to Engineering Manager if:
- [ ] Failures persist > 4 hours
- [ ] Customer-impacting regression suspected
- [ ] Security-related test failure

---

## Post-Incident

### Documentation

1. Update this runbook with new learnings
2. Add test for the failure mode if missing
3. Update monitoring if detection was delayed

### Metrics to Track

```bash
# Time to detect
# Time to acknowledge
# Time to resolve
# Root cause category
```

### Follow-up Actions

- [ ] Create tracking issue for root cause
- [ ] Update tests to prevent recurrence
- [ ] Review alert thresholds
- [ ] Update documentation if needed

---

## Quick Reference

```bash
# Check E2E status
curl -s 'http://prometheus:9090/api/v1/query?query=e2e_test_success_rate' | jq '.data.result[0].value[1]'

# View dashboard
open http://localhost:3001/d/e2e-test-performance

# Run tests locally
make up && cd client && npx playwright test

# View Playwright traces
npx playwright show-trace <trace.zip>

# Restart stack
make down && make up && ./scripts/wait-for-stack.sh
```

---

## Related Runbooks

- [observability-pipeline.md](observability-pipeline.md) - Metrics collection issues
- [e2e-performance.md](e2e-performance.md) - Performance regressions
- [flaky-tests.md](flaky-tests.md) - Flaky test management
- [error-budget.md](error-budget.md) - SLO violation response

---

*Last Updated: 2025-11-29*
*Owner: Platform Engineering*
