# Dependency Freeze Verification

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Dependency Freeze system verifies that dependencies remain unchanged during RC stabilization periods. This prevents unexpected regressions from dependency updates and ensures release stability.

### Key Properties

- **Baseline comparison**: Compares lockfile against RC tag baseline
- **Automatic detection**: Triggers on PR lockfile changes
- **Configurable strictness**: Allow patch updates or full freeze
- **PR integration**: Comments on violations with guidance

---

## How It Works

1. **RC Tag Detection**: Identifies latest RC tag as baseline
2. **Lockfile Comparison**: Diffs current lockfile against baseline
3. **Change Analysis**: Categorizes changes (patch/minor/major)
4. **Status Determination**: PASS, WARN, or FAIL based on configuration
5. **PR Notification**: Comments on PRs that violate the freeze

---

## Workflow Triggers

| Trigger  | Condition                        | Action                   |
| -------- | -------------------------------- | ------------------------ |
| PR       | Changes to lockfile/package.json | Verify against latest RC |
| Tag Push | `v*.*.*-rc.*`                    | Baseline verification    |
| Manual   | Workflow dispatch                | Custom baseline check    |

---

## Configuration Options

| Option          | Description                      | Default          |
| --------------- | -------------------------------- | ---------------- |
| `--baseline`    | Git ref to compare against       | Latest RC tag    |
| `--lockfile`    | Path to lockfile                 | `pnpm-lock.yaml` |
| `--allow-patch` | Allow patch version updates only | `false`          |
| `--strict`      | Fail on any change               | `false`          |
| `--report`      | Generate detailed report         | `false`          |

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> Dependency Freeze Check
2. Click "Run workflow"
3. Configure options:
   - `baseline`: Specific ref to compare against
   - `strict`: Fail on any dependency change
   - `allow_patch`: Allow patch updates
4. Click "Run workflow"

### Via CLI

```bash
# Check against latest RC tag
./scripts/release/verify_dependency_freeze.sh

# Check against specific baseline
./scripts/release/verify_dependency_freeze.sh --baseline v4.1.2-rc.1

# Strict mode (fail on any change)
./scripts/release/verify_dependency_freeze.sh --strict

# Allow patch updates
./scripts/release/verify_dependency_freeze.sh --allow-patch

# Generate report
./scripts/release/verify_dependency_freeze.sh --report
```

---

## Status Codes

| Status | Meaning                                   | Exit Code |
| ------ | ----------------------------------------- | --------- |
| PASS   | No dependency changes                     | 0         |
| WARN   | Patch changes only (with `--allow-patch`) | 0         |
| FAIL   | Dependencies changed (freeze violation)   | 1         |
| SKIP   | Not in RC stabilization phase             | 0         |

---

## PR Integration

When a PR modifies dependencies during RC stabilization, the workflow:

1. Detects the lockfile change
2. Compares against the RC baseline
3. Posts a comment explaining the violation
4. Fails the check (blocking merge)

### Sample PR Comment

```markdown
## ❌ Dependency Freeze Violation

This PR modifies dependencies during the RC stabilization period.

**Baseline:** `v4.1.2-rc.1`
**Status:** FAIL

### What to do:

1. **If this is intentional:** Request an exception from the release team
2. **If this is accidental:** Revert the dependency changes
3. **If critical security fix:** Document the justification and get approval
```

---

## Exceptions

Some dependency changes may be allowed during stabilization:

### Allowed Changes

1. **Security patches**: Critical CVE fixes with documented justification
2. **Patch updates**: With `--allow-patch` flag enabled
3. **Approved exceptions**: With release team sign-off

### Requesting an Exception

1. Create an issue with label `dependency-exception`
2. Document the reason for the dependency change
3. Get approval from release team
4. Reference the issue in your PR

---

## State Tracking

State in `docs/releases/_state/dependency_freeze_state.json`:

```json
{
  "version": "1.0.0",
  "last_check": "2026-01-08T10:00:00Z",
  "last_result": {
    "baseline": "v4.1.2-rc.1",
    "status": "PASS",
    "has_changes": false,
    "strict_mode": true,
    "allow_patch": false
  },
  "checks": [...]
}
```

---

## Report Output

Generated reports include:

```markdown
# Dependency Freeze Verification Report

**Generated:** 2026-01-08T10:00:00Z
**Baseline:** v4.1.2-rc.1
**Current:** HEAD
**Status:** PASS

---

## Summary

| Check                 | Result |
| --------------------- | ------ |
| Lockfile Changed      | No     |
| Strict Mode           | true   |
| Patch Updates Allowed | false  |
| Overall Status        | PASS   |

---

## Changes Detected

No changes detected
```

---

## Troubleshooting

### No RC Tag Found

If no RC tag exists:

```bash
# Create an RC tag first
git tag v4.1.2-rc.1 <commit-sha>
git push origin v4.1.2-rc.1

# Or specify a different baseline
./scripts/release/verify_dependency_freeze.sh --baseline main
```

### False Positives

Lockfile formatting differences can cause false positives:

```bash
# Regenerate lockfile deterministically
pnpm install --frozen-lockfile

# Check for actual version changes
git diff pnpm-lock.yaml | grep "version:"
```

### Legitimate Updates Needed

For legitimate dependency updates during stabilization:

```bash
# Document the change
git commit -m "deps: security patch for CVE-XXXX-YYYY

This update addresses a critical security vulnerability.
Exception approved by @release-team in issue #1234"
```

---

## Best Practices

1. **Lock dependencies early**: Create RC tag only when dependencies are stable
2. **Document exceptions**: Always document why a dependency change is needed
3. **Security first**: Security patches can override the freeze with approval
4. **Regenerate cleanly**: Use `pnpm install --frozen-lockfile` before comparing
5. **Review lockfile diffs**: Manually review lockfile changes in PRs

---

## Integration with Other Checks

The dependency freeze check integrates with:

- **RC Lockdown**: Complements feature flag and schema freeze
- **Pre-Release Health**: Affects overall health score
- **Stabilization Report**: Included in stabilization metrics
- **Release Gate**: Required for GA promotion

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [RC Lockdown](rc-lockdown.yml)
- [Dependency Audit](DEPENDENCY_AUDIT.md)
- [Stabilization Report](STABILIZATION_REPORT.md)

---

## Change Log

| Date       | Change                          | Author               |
| ---------- | ------------------------------- | -------------------- |
| 2026-01-08 | Initial Dependency Freeze Check | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
