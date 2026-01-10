# Pre-Release Health Check

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Pre-Release Health Check aggregates all CI audit results into a unified release readiness status. It provides a single pass/fail gate before any release, ensuring all quality checks are satisfied.

### Key Properties

- **Unified view**: Single status aggregating all audits
- **Health score**: 0-100% based on passed checks
- **Release blocking**: Automatically blocks releases on failure
- **Configurable strictness**: Optional strict mode for warnings

---

## Checks Included

| Check            | Source                   | Pass Criteria                    |
| ---------------- | ------------------------ | -------------------------------- |
| Dependency Audit | `audit_state.json`       | No critical/high vulnerabilities |
| Type Safety      | `type_safety_state.json` | Any types within threshold       |
| API Determinism  | `determinism_state.json` | All endpoints deterministic      |
| Test Quarantine  | `quarantine_state.json`  | < 5 quarantined tests            |
| Release Blockers | GitHub Issues            | No open release-blocker issues   |

---

## Health Score

The health score is calculated as:

```
score = (passed_checks / total_checks) * 100
```

| Score  | Status | Release Decision     |
| ------ | ------ | -------------------- |
| 100%   | PASS   | Release approved     |
| 80-99% | WARN   | Release with caution |
| < 80%  | FAIL   | Release blocked      |

---

## Workflow Triggers

| Trigger  | Condition             | Action                |
| -------- | --------------------- | --------------------- |
| Tag push | `v*`, `rc-*`          | Block if failed       |
| Schedule | 5 AM UTC Mon-Fri      | Status check          |
| Manual   | Workflow dispatch     | Optional fresh audits |
| Callable | From release workflow | Gate release          |

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> Pre-Release Health Check
2. Click "Run workflow"
3. Configure options:
   - `strict`: Fail on any warning
   - `run_fresh`: Run all audits before check
4. Click "Run workflow"

### Via CLI

```bash
# Run health check
./scripts/release/pre_release_health_check.sh

# Strict mode (fail on warnings)
./scripts/release/pre_release_health_check.sh --strict

# Skip stale checks (> 24h old)
./scripts/release/pre_release_health_check.sh --skip-stale

# Generate report
./scripts/release/pre_release_health_check.sh --report

# JSON output (for CI integration)
./scripts/release/pre_release_health_check.sh --json
```

---

## Output

### Console Output

```
========================================
PRE-RELEASE HEALTH CHECK SUMMARY
========================================

  [✓] dependency_audit   No critical/high vulnerabilities
  [✓] type_safety        Any types within threshold
  [✓] api_determinism    All endpoints deterministic
  [!] test_quarantine    2 tests quarantined
  [✓] release_blockers   No open release blockers

----------------------------------------
  Total:    5 checks
  Passed:   4
  Failed:   0
  Warnings: 1
  Score:    80%

  Overall:  WARN
========================================
```

### JSON Output

```json
{
  "status": "WARN",
  "health_score": 80,
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 0,
    "warnings": 1
  },
  "checks": {
    "dependency_audit": "PASS",
    "type_safety": "PASS",
    "api_determinism": "PASS",
    "test_quarantine": "WARN",
    "release_blockers": "PASS"
  }
}
```

---

## Integration

### With Release Workflow

```yaml
jobs:
  health-check:
    uses: ./.github/workflows/pre-release-health-check.yml
    with:
      strict: true

  release:
    needs: health-check
    if: needs.health-check.outputs.status == 'PASS'
    steps:
      - name: Release
        run: ./scripts/release/publish.sh
```

### With Tag Push

The workflow automatically runs on tag pushes matching `v*` or `rc-*` patterns. If the health check fails, the release workflow is blocked.

### Manual Pre-Release Check

Before creating a release tag, run locally:

```bash
./scripts/release/pre_release_health_check.sh --report

# If issues found, run individual audits:
./scripts/release/dependency_audit.sh
./scripts/release/type_safety_audit.sh
./scripts/release/api_determinism_check.sh
```

---

## Resolving Failures

### Dependency Audit Failed

```bash
# See detailed vulnerability report
./scripts/release/dependency_audit.sh --report

# Attempt automatic fixes
pnpm audit --fix
```

### Type Safety Failed

```bash
# See files with too many `any` types
./scripts/release/type_safety_audit.sh --fix

# Address top offenders first
```

### API Determinism Failed

```bash
# Run with detailed output
./scripts/release/api_determinism_check.sh --strict

# Check specific endpoint
./scripts/release/api_determinism_check.sh --endpoint /api/problematic
```

### Test Quarantine High

```bash
# List quarantined tests
./scripts/release/manage_test_quarantine.sh list

# Investigate and fix root causes
```

### Release Blockers Open

```bash
# View open blockers
gh issue list --label "release-blocker" --state open

# Address or re-prioritize
```

---

## State Tracking

State in `docs/releases/_state/health_check_state.json`:

```json
{
  "version": "1.0.0",
  "last_check": "2026-01-08T05:00:00Z",
  "last_result": {
    "status": "PASS",
    "health_score": 100,
    "passed": 5,
    "failed": 0,
    "warnings": 0
  },
  "check_history": [...]
}
```

---

## Stale Check Detection

Checks are considered stale if the underlying audit is older than 24 hours. This ensures release decisions are based on recent data.

With `--skip-stale`:

- Stale checks report as "STALE" (warning)
- Fresh audits should be run before release

---

## Best Practices

1. **Run before release**: Always check health before tagging
2. **Address failures**: Don't bypass failed checks
3. **Use strict mode**: For GA releases, use `--strict`
4. **Keep audits fresh**: Run individual audits daily
5. **Monitor trends**: Track health score over time

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Dependency Audit](DEPENDENCY_AUDIT.md)
- [Type Safety Audit](TYPE_SAFETY_AUDIT.md)
- [API Determinism](API_DETERMINISM.md)
- [Test Quarantine](TEST_QUARANTINE.md)

---

## Change Log

| Date       | Change                           | Author               |
| ---------- | -------------------------------- | -------------------- |
| 2026-01-08 | Initial Pre-Release Health Check | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
