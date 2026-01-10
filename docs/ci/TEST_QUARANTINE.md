# Test Quarantine System

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Test Quarantine System automatically identifies and quarantines flaky tests that would otherwise block releases. Quarantined tests are skipped in CI but tracked for follow-up, allowing releases to proceed while technical debt is addressed.

### Key Properties

- **Automatic detection**: Identifies flaky tests by failure patterns
- **Protected tests**: Critical tests cannot be quarantined
- **Auto-recovery**: Tests are unquarantined after consecutive passes
- **Full tracking**: Issues created for visibility and follow-up

---

## How It Works

```
Test Failure Detected
        │
        ▼
┌───────────────────┐
│ Check Criteria    │
│ - 3 failures/24h  │
│ - Min 5 runs      │
│ - >30% flakiness  │
└───────────────────┘
        │
    ┌───┴───┐
    │       │
  Meets   Doesn't
 Criteria   Meet
    │       │
    ▼       ▼
┌────────┐ ┌────────┐
│ Check  │ │  Skip  │
│Protected│ │        │
└────────┘ └────────┘
    │
    ▼
┌───────────────────┐
│ Quarantine Test   │
│ - Add to file     │
│ - Create issue    │
│ - Update state    │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Monitor Recovery  │
│ - Track passes    │
│ - Auto-unquarantine│
│   after 5 passes  │
└───────────────────┘
```

---

## Quarantine Criteria

A test is quarantined when it meets ALL of these criteria:

| Criterion      | Threshold       | Purpose                            |
| -------------- | --------------- | ---------------------------------- |
| Failure count  | ≥ 3 failures    | Multiple failures indicate pattern |
| Time window    | Within 24 hours | Recent failures, not historical    |
| Minimum runs   | ≥ 5 total runs  | Enough data for decision           |
| Flakiness rate | > 30%           | Not consistently failing           |

### Protected Tests

These patterns are NEVER quarantined:

```yaml
protected_patterns:
  - "**/security/**"
  - "**/auth/**"
  - "**/critical/**"
  - "**/*.critical.test.*"
  - "**/smoke/**"
```

Protected tests must be fixed immediately if flaky.

---

## Quarantine File

Tests are quarantined via `test-quarantine.json`:

```json
{
  "version": "1.0.0",
  "description": "Tests temporarily skipped due to flakiness",
  "quarantined": [
    {
      "name": "server/tests/api/user.test.ts",
      "reason": "Flaky: 4 failures in last 24h",
      "quarantined_at": "2026-01-08T10:00:00Z",
      "failure_count": 4,
      "pass_count": 0
    }
  ]
}
```

### Jest Integration

To skip quarantined tests in Jest:

```javascript
// jest.setup.js
const quarantine = require("./test-quarantine.json");

const quarantinedTests = new Set(quarantine.quarantined.map((t) => t.name));

// Mark quarantined tests as skipped
global.testQuarantine = {
  isQuarantined: (testPath) => quarantinedTests.has(testPath),
};
```

```javascript
// In test files
const { isQuarantined } = global.testQuarantine || {};

const testFn = isQuarantined?.(__filename) ? test.skip : test;

testFn("my flaky test", () => {
  // ...
});
```

---

## Commands

### Quarantine a Test

```bash
./scripts/release/manage_test_quarantine.sh quarantine \
  --test "server/tests/api/user.test.ts" \
  --reason "Flaky: network timeouts"
```

### Unquarantine a Test

```bash
./scripts/release/manage_test_quarantine.sh unquarantine \
  --test "server/tests/api/user.test.ts" \
  --reason "Fixed root cause"
```

### List Quarantined Tests

```bash
./scripts/release/manage_test_quarantine.sh list
```

### Generate Report

```bash
./scripts/release/manage_test_quarantine.sh report
```

### Sync State

```bash
./scripts/release/manage_test_quarantine.sh sync
```

---

## Workflow Integration

### Automatic Triggers

| Trigger                   | Action                   |
| ------------------------- | ------------------------ |
| CI completed              | Sync and analyze results |
| Weekly (Monday 09:00 UTC) | Generate report          |
| Manual dispatch           | Any action               |

### Via GitHub Actions UI

1. Navigate to Actions → Test Quarantine Manager
2. Click "Run workflow"
3. Select action (report/sync/list)
4. Click "Run workflow"

---

## Auto-Recovery

Tests are automatically unquarantined when:

1. **5 consecutive passes** in the time window
2. **No failures** in the last 48 hours

This ensures tests are only removed from quarantine when truly stable.

---

## Issue Tracking

When a test is quarantined, an issue is automatically created:

```markdown
## Quarantined Test

**Test:** `server/tests/api/user.test.ts`
**Reason:** Flaky: 4 failures in last 24h
**Quarantined:** 2026-01-08T10:00:00Z

This test has been automatically quarantined due to flakiness.

### Action Required

1. Investigate the root cause
2. Fix the underlying issue
3. The test will be automatically unquarantined after 5 consecutive passes

### Quarantine Policy

- Tests are quarantined after 3 failures in 24 hours
- Protected tests (security/auth/critical) cannot be quarantined
- Quarantined tests are skipped in CI but tracked for recovery
```

Labels applied: `quarantine`, `flaky-test`, `tech-debt`

---

## Stale Quarantine Escalation

Tests quarantined for more than 14 days are escalated:

1. `needs-attention` label added
2. Appears in weekly report as warning
3. Team must decide: fix or remove test

This prevents indefinite test avoidance.

---

## Configuration

### Policy File

Configure in `docs/ci/TEST_QUARANTINE_POLICY.yml`:

```yaml
criteria:
  failure_threshold: 3
  failure_window_hours: 24
  min_runs: 5
  flakiness_threshold: 0.3

auto_quarantine:
  enabled: true
  create_issue: true
  max_per_run: 5

management:
  auto_unquarantine:
    enabled: true
    required_passes: 5
    time_window_hours: 48
  max_quarantine_days: 14
```

---

## State Tracking

State in `docs/releases/_state/quarantine_state.json`:

```json
{
  "version": "1.0.0",
  "last_update": "2026-01-08T12:00:00Z",
  "quarantined_tests": {
    "server/tests/api/user.test.ts": {
      "quarantined_at": "2026-01-08T10:00:00Z",
      "reason": "Flaky: 4 failures in last 24h",
      "status": "quarantined"
    }
  },
  "stats": {
    "total_quarantined": 15,
    "total_unquarantined": 12,
    "currently_quarantined": 3
  }
}
```

---

## Weekly Report

Generated every Monday at 09:00 UTC:

```markdown
# Test Quarantine Report

**Generated:** 2026-01-08T09:00:00Z
**Repository:** org/summit

---

## Summary

| Metric                 | Value |
| ---------------------- | ----- |
| Currently Quarantined  | 3     |
| Total Ever Quarantined | 15    |
| Total Recovered        | 12    |

---

## Quarantined Tests

| Test                            | Reason                  | Quarantined Since |
| ------------------------------- | ----------------------- | ----------------- |
| `server/tests/api/user.test.ts` | Flaky: network timeouts | 2026-01-05        |

---

## Health Check

⚠️ **1 test(s)** have been quarantined for more than 14 days

These tests need attention - either fix the underlying issue or remove them.
```

---

## Troubleshooting

### Test Still Running Despite Quarantine

**Symptom:** Quarantined test is still executing

**Diagnosis:**

- Check `test-quarantine.json` contains the test
- Verify Jest setup is loading quarantine file

**Resolution:**

- Ensure quarantine integration in test setup
- Check test path matches exactly

### Cannot Quarantine Protected Test

**Symptom:** "Test is protected" error

**Diagnosis:**

- Test matches a protected pattern

**Resolution:**

- Protected tests must be fixed, not quarantined
- If truly not critical, update `protected_patterns`

### Stale Quarantine Not Escalating

**Symptom:** Old quarantined tests not getting attention

**Diagnosis:**

- Check `max_quarantine_days` setting
- Review weekly report generation

**Resolution:**

- Run report manually to see stale tests
- Check workflow schedule

---

## Best Practices

### For Developers

1. **Don't ignore quarantine issues** - They represent tech debt
2. **Investigate promptly** - Flaky tests hide real bugs
3. **Add deterministic alternatives** - Replace flaky tests with stable ones

### For Teams

1. **Review weekly reports** - Track quarantine trends
2. **Set SLOs** - Maximum acceptable quarantine count
3. **Prioritize fixes** - Don't let quarantine become a dumping ground

---

## Integration with Release Ops

### Daily Digest

Quarantine count included in daily digest summary.

### Release Dashboard

Dashboard shows quarantine health indicator.

### Auto-Remediation

`flaky-tests` playbook integrates with quarantine system.

---

## References

- [Auto-Remediation](AUTO_REMEDIATION.md)
- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Release Train Dashboard](RELEASE_TRAIN_DASHBOARD.md)

---

## Change Log

| Date       | Change                         | Author               |
| ---------- | ------------------------------ | -------------------- |
| 2026-01-08 | Initial Test Quarantine System | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
