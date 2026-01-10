# Dependency Security Audit

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Dependency Security Audit system automatically scans project dependencies for known vulnerabilities using `pnpm audit`. It enforces security thresholds and blocks releases when critical or high severity vulnerabilities are detected.

### Key Properties

- **Automated scanning**: Runs on schedule, PRs, and pushes
- **Threshold enforcement**: Configurable fail thresholds by severity
- **PR integration**: Comments on PRs with vulnerability status
- **Auto-fix option**: Can create PRs to fix vulnerabilities
- **Release blocking**: Integrates with release gates

---

## Severity Levels

| Level    | Description                                 | Default Action |
| -------- | ------------------------------------------- | -------------- |
| Critical | Actively exploited or trivially exploitable | Block release  |
| High     | Significant security impact                 | Block release  |
| Moderate | Limited security impact                     | Warning        |
| Low      | Minimal security impact                     | Info           |

---

## Workflow Triggers

| Trigger      | Condition                        | Threshold    |
| ------------ | -------------------------------- | ------------ |
| Schedule     | Daily 6 AM UTC                   | high         |
| Pull Request | Changes to package.json/lockfile | high         |
| Push to main | Changes to package.json/lockfile | high         |
| Manual       | Workflow dispatch                | Configurable |

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> Dependency Security Audit
2. Click "Run workflow"
3. Configure options:
   - `threshold`: Severity level to fail (default: high)
   - `production_only`: Only audit production deps
   - `fix`: Attempt automatic fixes (creates PR)
4. Click "Run workflow"

### Via CLI

```bash
# Run with default threshold (high)
./scripts/release/dependency_audit.sh

# Specify threshold
./scripts/release/dependency_audit.sh --threshold critical

# Production dependencies only
./scripts/release/dependency_audit.sh --production

# Generate detailed report
./scripts/release/dependency_audit.sh --report

# Dry run
./scripts/release/dependency_audit.sh --dry-run
```

---

## Configuration

### Policy File

Configure in `docs/ci/DEPENDENCY_AUDIT_POLICY.yml`:

```yaml
audit:
  # Minimum severity to fail the build
  fail_threshold: high

  # Production dependencies only
  production_only: false

  # Ignore specific advisories
  ignore_advisories:
    - "GHSA-xxxx-yyyy-zzzz"

gates:
  # Maximum allowed vulnerabilities
  max_critical: 0
  max_high: 0
  max_moderate: 10
  max_low: 50
```

### Ignoring Advisories

To ignore a specific advisory (use sparingly):

```yaml
audit:
  ignore_advisories:
    - "GHSA-xxxx-yyyy-zzzz" # Reason: False positive
```

Document the reason for ignoring in a comment.

---

## PR Comments

When run on a pull request, the workflow posts a comment:

```markdown
## ✅ Dependency Security Audit PASSED

| Severity  | Count |
| --------- | ----- |
| Critical  | 0     |
| High      | 0     |
| Moderate  | 2     |
| Low       | 5     |
| **Total** | **7** |

Review moderate/low vulnerabilities when convenient.
```

---

## Auto-Fix

When triggered with `fix: true`:

1. Runs `pnpm audit --fix`
2. Checks for lockfile changes
3. Creates PR with fixes if changes detected
4. Labels PR with `security`, `dependencies`, `automated`

### Manual Fix Commands

```bash
# Attempt automatic fixes
pnpm audit --fix

# Update all packages
pnpm update

# Update specific package
pnpm update <package-name>

# Force resolution override
# Add to package.json:
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "^2.0.0"
    }
  }
}
```

---

## Reports

### Report Location

Generated reports are stored in `artifacts/security-audit/`:

- `audit-report.md` - Detailed vulnerability report
- Uploaded as workflow artifact for 30 days

### Report Contents

- Summary table by severity
- Individual vulnerability details
- Advisory links
- Remediation commands
- Affected packages and versions

---

## Integration

### With Release Gates

The audit integrates with release gates:

```yaml
# In release workflow
- name: Check Audit Status
  run: |
    AUDIT_RESULT=$(jq -r '.last_result.failed' docs/releases/_state/audit_state.json)
    if [[ "$AUDIT_RESULT" == "true" ]]; then
      echo "Release blocked: Security audit failed"
      exit 1
    fi
```

### With Release Checklist

Added to GA release checklist:

- [ ] Security audit passing (no critical/high vulnerabilities)

### With Evidence Index

Audit results are captured in `docs/release/GA_EVIDENCE_INDEX.md`.

---

## State Tracking

State in `docs/releases/_state/audit_state.json`:

```json
{
  "version": "1.0.0",
  "last_audit": "2026-01-08T06:00:00Z",
  "last_result": {
    "critical": 0,
    "high": 0,
    "moderate": 2,
    "low": 5,
    "threshold": "high",
    "failed": false
  },
  "audit_history": [...]
}
```

---

## Troubleshooting

### Audit Failing on Known Safe Package

**Symptom:** Audit fails on a package you know is safe

**Resolution:**

1. Add to `ignore_advisories` in policy
2. Document reason for ignoring
3. Set expiry date for review

### No Fixes Available

**Symptom:** `pnpm audit --fix` doesn't resolve issues

**Resolution:**

1. Check if patched version exists
2. Consider major version upgrade
3. Use `pnpm.overrides` for transitive deps
4. Document as Governed Exception if no fix available

### Rate Limiting

**Symptom:** Audit fails with rate limit error

**Resolution:**

1. Scheduled runs are rate-limited to daily
2. Use `--dry-run` for testing
3. Check GitHub API rate limits

---

## Best Practices

1. **Run regularly**: Enable scheduled daily scans
2. **Review promptly**: Address critical/high within 24-48 hours
3. **Document exceptions**: Use policy file for ignored advisories
4. **Test fixes**: Ensure `pnpm audit --fix` doesn't break builds
5. **Update regularly**: Keep dependencies up to date proactively

---

## References

- [pnpm audit documentation](https://pnpm.io/cli/audit)
- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [GA Hard Gates](ga-hard-gates.md)

---

## Change Log

| Date       | Change                   | Author               |
| ---------- | ------------------------ | -------------------- |
| 2026-01-08 | Initial Dependency Audit | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
