# Stabilization Progress Report

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Stabilization Progress Report provides a comprehensive view of MVP-4 stabilization status. It aggregates all audit results, health checks, and release readiness metrics into a single unified report with an overall stabilization score.

### Key Features

- **Unified view**: Single report aggregating all stabilization metrics
- **Stabilization score**: 0-100% based on all check results
- **Automated reporting**: Daily generation with trend tracking
- **Actionable recommendations**: Specific next steps based on status

---

## Stabilization Score

The stabilization score is calculated as a weighted average of all check statuses:

| Status | Points |
| ------ | ------ |
| PASS   | 100    |
| WARN   | 50     |
| FAIL   | 0      |

```
score = (pass_count * 100 + warn_count * 50) / total_checks
```

| Score  | Overall Status | Release Decision          |
| ------ | -------------- | ------------------------- |
| 90-100 | PASS           | Ready for release         |
| 70-89  | WARN           | Review warnings first     |
| < 70   | FAIL           | Address failures required |

---

## Checks Included

| Check               | Source                    | Pass Criteria                      |
| ------------------- | ------------------------- | ---------------------------------- |
| Dependency Audit    | `audit_state.json`        | No critical/high vulnerabilities   |
| Type Safety         | `type_safety_state.json`  | No files over threshold            |
| API Determinism     | `determinism_state.json`  | All endpoints deterministic        |
| Health Check        | `health_check_state.json` | Score >= 80%                       |
| Test Quarantine     | `quarantine_state.json`   | < 10 quarantined tests             |
| Evidence Collection | `evidence_state.json`     | Recent collection with no failures |
| Release Blockers    | GitHub Issues             | No open blockers                   |

---

## Report Contents

### Summary Section

Quick overview with:

- Overall status (PASS/WARN/FAIL)
- Stabilization score percentage
- Check-by-check status table

### Detail Sections

Each check includes:

- Last run timestamp
- Key metrics
- Status determination
- Relevant thresholds

### Recommendations

Actionable items based on current status:

- Critical issues requiring immediate attention
- Warnings to review before release
- Suggested commands to resolve issues

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> Stabilization Progress Report
2. Click "Run workflow"
3. Configure options:
   - `include_details`: Show full audit details
   - `notify_slack`: Send notification
4. Click "Run workflow"

### Via CLI

```bash
# Generate markdown report
./scripts/release/generate_stabilization_report.sh

# Specify output file
./scripts/release/generate_stabilization_report.sh --output ./my-report.md

# Generate JSON output
./scripts/release/generate_stabilization_report.sh --format json

# Output JSON summary to stdout
./scripts/release/generate_stabilization_report.sh --json-summary

# Include full details
./scripts/release/generate_stabilization_report.sh --include-details
```

---

## Sample Output

### Markdown Report

```markdown
# MVP-4 Stabilization Progress Report

**Generated:** 2026-01-08T10:00:00Z
**Overall Status:** ⚠️ WARN
**Stabilization Score:** 85%

---

## Summary

| Category            | Status | Score Contribution |
| ------------------- | ------ | ------------------ |
| Dependency Audit    | PASS   | ✅                 |
| Type Safety         | PASS   | ✅                 |
| API Determinism     | PASS   | ✅                 |
| Health Check        | WARN   | ⚠️                 |
| Test Quarantine     | PASS   | ✅                 |
| Evidence Collection | WARN   | ⚠️                 |
| Release Blockers    | PASS   | ✅                 |

**Checks Summary:** 5 passed, 2 warnings, 0 failed
```

### JSON Output

```json
{
  "report_timestamp": "2026-01-08T10:00:00Z",
  "stabilization_score": 85,
  "overall_status": "WARN",
  "summary": {
    "total_checks": 7,
    "passed": 5,
    "warnings": 2,
    "failed": 0
  },
  "checks": {
    "dependency_audit": {
      "status": "PASS",
      "critical": 0,
      "high": 0
    },
    "type_safety": {
      "status": "PASS",
      "total_any": 45,
      "over_threshold": 0
    }
  }
}
```

---

## Workflow Triggers

| Trigger  | Condition          | Action                    |
| -------- | ------------------ | ------------------------- |
| Schedule | 9 AM UTC Mon-Fri   | Generate daily report     |
| Push     | State file changes | Regenerate on data change |
| Manual   | Workflow dispatch  | On-demand report          |

---

## Integration

### With Release Workflow

```yaml
jobs:
  stabilization-check:
    uses: ./.github/workflows/stabilization-report.yml

  release:
    needs: stabilization-check
    if: needs.stabilization-check.outputs.status != 'FAIL'
    steps:
      - name: Proceed with Release
        run: echo "Stabilization score: ${{ needs.stabilization-check.outputs.score }}%"
```

### With CI Dashboard

The stabilization score can be displayed on CI dashboards:

```bash
# Get current score
./scripts/release/generate_stabilization_report.sh --json-summary | jq '.stabilization_score'
```

---

## Troubleshooting

### Stale Metrics

If metrics appear outdated:

```bash
# Run fresh audits
./scripts/release/dependency_audit.sh
./scripts/release/type_safety_audit.sh
./scripts/release/api_determinism_check.sh

# Run health check
./scripts/release/pre_release_health_check.sh

# Collect evidence
./scripts/release/generate_evidence_bundle.sh

# Regenerate report
./scripts/release/generate_stabilization_report.sh
```

### Missing State Files

If state files are missing:

```bash
# Check state directory
ls -la docs/releases/_state/

# Initialize with defaults (files created on first audit run)
echo '{}' > docs/releases/_state/audit_state.json
```

### GitHub API Errors

For release blocker queries:

```bash
# Verify authentication
gh auth status

# Test query manually
gh issue list --label release-blocker --state open --limit 5
```

---

## Best Practices

1. **Daily review**: Check stabilization report each morning
2. **Address failures**: Prioritize FAIL status items
3. **Track trends**: Monitor score over time
4. **Pre-release check**: Generate report before any release
5. **Team visibility**: Share report in team channels

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Pre-Release Health Check](PRE_RELEASE_HEALTH.md)
- [Dependency Audit](DEPENDENCY_AUDIT.md)
- [Type Safety Audit](TYPE_SAFETY_AUDIT.md)
- [API Determinism](API_DETERMINISM.md)
- [Evidence Collection](EVIDENCE_COLLECTION.md)

---

## Change Log

| Date       | Change                       | Author               |
| ---------- | ---------------------------- | -------------------- |
| 2026-01-08 | Initial Stabilization Report | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
