# Redaction Trend Alerts

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

The Redaction Trend Alert system automatically creates and manages incident issues based on trends in the redaction metrics time series. This converts passive observability into active incident response.

### Key Features

- **Automatic Issue Creation**: P0/P1 issues created when thresholds exceeded
- **Deduplication**: Prevents spam by tracking existing alerts
- **Rate Limiting**: Cooldown period between updates
- **Auto-Close**: Resolved issues are automatically closed
- **Counts-Only**: All issue content is safe (no sensitive data)

---

## Alert Levels

### P0 - Critical (Immediate)

| Trigger                   | Condition            | Meaning                                |
| ------------------------- | -------------------- | -------------------------------------- |
| `forbidden_hits_detected` | `forbidden_hits > 0` | Forbidden patterns in sanitized output |

P0 alerts indicate potential data exposure. The deploy is already blocked by the Pages publish workflow, but a P0 issue ensures visibility and tracking.

**Labels:** `release-ops`, `security`, `redaction-alert`, `severity:P0`

### P1 - High (Investigation Required)

| Trigger                  | Condition                      | Meaning               |
| ------------------------ | ------------------------------ | --------------------- |
| `rollbacks_24h_spike`    | `rollbacks >= 2` in 24h        | Instability pattern   |
| `rollbacks_window_spike` | `rollbacks >= 3` in 7 entries  | Sustained instability |
| `warn_trend_elevated`    | `WARN/FAIL >= 3` in 7 entries  | Drift accumulating    |
| `tokens_spike_300pct`    | Token count `>= 300%` increase | Sudden content change |

P1 alerts indicate patterns that warrant investigation before they become P0 issues.

**Labels:** `release-ops`, `redaction-alert`, `severity:P1`

---

## Thresholds

Default thresholds are configured in `docs/ci/REDACTION_TREND_ALERT_POLICY.yml`:

```yaml
hard_incident:
  forbidden_hits_gt: 0
  lookback_entries: 1

rollback_incident:
  rollbacks_last_24h_gte: 2
  rollbacks_last_entries_gte: 3
  rollbacks_last_entries_window: 7

warn_spike:
  warn_last_entries_gte: 3
  warn_last_entries_window: 7
  tokens_spike_pct: 300
  tokens_spike_window: 3
```

### Adjusting Thresholds

To adjust thresholds:

1. Edit `docs/ci/REDACTION_TREND_ALERT_POLICY.yml`
2. Test with `--dry-run` flag
3. Create PR with rationale
4. Monitor alert frequency after merge

---

## Deduplication and Rate Limiting

### Deduplication

Alerts are deduplicated by a composite key:

```
{date}_{level}_{triggers}
```

Example: `2026-01-08_P1_rollbacks_24h_spike,rollbacks_window_spike`

If an alert with the same key exists, no new issue is created.

### Rate Limiting

Issue **updates** are rate-limited:

- **Cooldown period:** 6 hours
- Updates within cooldown are skipped
- New triggers within cooldown still skip (prevents spam)
- Cooldown resets after each update

### State File

Deduplication state is stored in:

```
docs/releases/_state/redaction_trend_alerts_state.json
```

Schema:

```json
{
  "alerts": {
    "2026-01-08_P1_rollbacks_24h_spike": {
      "issue_number": 1234,
      "level": "P1",
      "last_updated": "2026-01-08T14:32:56Z"
    }
  }
}
```

---

## Issue Content

### What's Included (Safe)

- Alert level (P0/P1)
- Trigger codes
- Counts-only metrics table:
  - Forbidden hits count
  - Rollback counts
  - WARN/FAIL counts
  - Token spike percentage
- Links to:
  - Triggering workflow run
  - Trend page on Pages
  - Triage packet artifact (if applicable)
- Remediation checklist

### What's NOT Included (Sensitive)

- Raw patterns that matched
- Actual content that was redacted
- Internal system names/paths
- Token values or specific strings

---

## Issue Templates

### P0 Issue

**Title:** `[Redaction Alert P0] Forbidden patterns detected — 2026-01-08`

**Body:**

```markdown
## Redaction Trend Alert

**Level:** P0
**Date:** 2026-01-08
**Triggers:** forbidden_hits_detected

### Metrics Summary (Counts Only)

| Metric                | Value |
| --------------------- | ----- |
| Forbidden Hits        | 3     |
| Rollbacks (24h)       | 0     |
| Rollbacks (7 entries) | 0     |
| WARN/FAIL Count       | 1     |
| Tokens Spike          | 0%    |

### Links

- [Triggering Workflow Run](...)
- [Trend Page](...)
- [Triage Packet](...)

### Remediation Checklist

- [ ] Review triggered conditions above
- [ ] Check trend page for patterns
- [ ] Review triage packet (if WARN/FAIL)
- [ ] Identify root cause
- [ ] Apply fix
- [ ] Verify fix resolves the trend
```

### P1 Issue

**Title:** `[Redaction Alert P1] Rollback stability alert — 2026-01-08`

Similar format, different triggers highlighted.

---

## Auto-Close Behavior

When metrics return to OK and stay there:

1. Alert workflow detects `level: OK`
2. Checks for open alert issues in state
3. If `clear_window_entries` (default: 7) consecutive OK entries:
   - Adds closure comment
   - Closes the issue
   - Clears state

### Disable Auto-Close

To disable auto-close, set in policy:

```yaml
close_policy:
  auto_close_when_clear: false
```

---

## Workflow Integration

### Trigger

The `redaction-trend-alerts.yml` workflow runs:

1. **On Pages publish completion** - `workflow_run` trigger
2. **Manually** - `workflow_dispatch` for testing

### Flow

```
Publish completes
       │
       ▼
Download site artifact (or rebuild)
       │
       ▼
Run check_redaction_trends.sh
       │
       ▼
┌──────┴──────┐
│   Level?    │
├─────────────┤
│ OK          │──────► Check for issues to auto-close
│             │
│ P0/P1       │──────► Check dedup state
│             │        ├─ Exists + cooldown: skip
│             │        ├─ Exists + expired: update
│             │        └─ New: create issue
└─────────────┘
```

---

## Scripts Reference

### check_redaction_trends.sh

Analyzes time series and outputs alert level.

```bash
# Basic usage
./scripts/release/check_redaction_trends.sh \
  --timeseries site/release-ops/redaction_metrics_timeseries.json

# With policy and output
./scripts/release/check_redaction_trends.sh \
  --timeseries site/release-ops/redaction_metrics_timeseries.json \
  --policy docs/ci/REDACTION_TREND_ALERT_POLICY.yml \
  --out alert_report.md \
  --out-json alert_summary.json

# Dry run
./scripts/release/check_redaction_trends.sh \
  --timeseries timeseries.json \
  --dry-run
```

| Option            | Description                        |
| ----------------- | ---------------------------------- |
| `--timeseries`    | Time series JSON file (required)   |
| `--policy`        | Alert policy YAML file             |
| `--out`           | Output markdown report             |
| `--out-json`      | Output JSON summary                |
| `--run-id`        | Workflow run ID for linking        |
| `--triage-packet` | URL to triage packet               |
| `--dry-run`       | Show results without state changes |
| `--verbose`       | Enable verbose logging             |

**Exit Code:** Always 0 (alerting does not block deploy)

---

## Troubleshooting

### Alert Not Created

**Symptom:** Threshold exceeded but no issue created

**Causes:**

1. Dedup key already exists
2. Within cooldown window
3. Workflow permissions issue

**Resolution:**

```bash
# Check state file
cat docs/releases/_state/redaction_trend_alerts_state.json

# Clear state to force new alert (testing only)
echo '{"alerts":{}}' > docs/releases/_state/redaction_trend_alerts_state.json
```

### Too Many Alerts

**Symptom:** Frequent alert spam

**Causes:**

1. Thresholds too sensitive
2. Cooldown too short
3. Systemic issue not addressed

**Resolution:**

1. Review and adjust thresholds in policy
2. Increase cooldown period
3. Address root cause of triggers

### Auto-Close Not Working

**Symptom:** Issues remain open after OK

**Causes:**

1. State file not tracking issue
2. `auto_close_when_clear` disabled
3. Not enough consecutive OK entries

**Resolution:**

```bash
# Check state
jq '.alerts' docs/releases/_state/redaction_trend_alerts_state.json

# Verify policy setting
grep -A2 "close_policy" docs/ci/REDACTION_TREND_ALERT_POLICY.yml
```

---

## Example Alert Report

```markdown
# Redaction Trend Alert Report

**Generated:** 2026-01-08 14:32 UTC
**Level:** ⚠️ P1
**Triggers:** rollbacks_24h_spike, warn_trend_elevated

---

## Summary

**Alert triggered!** The following conditions were detected:

- rollbacks_24h_spike
- warn_trend_elevated

## Metrics (Counts Only)

| Metric             | Value | Threshold |
| ------------------ | ----- | --------- |
| Forbidden Hits     | 0     | > 0       |
| Rollbacks (24h)    | 2     | >= 2      |
| Rollbacks (window) | 3     | >= 3      |
| WARN/FAIL Count    | 4     | >= 3      |
| Tokens Spike %     | 45%   | >= 300%   |

## Latest Entry

| Field             | Value       |
| ----------------- | ----------- |
| Date              | 2026-01-08  |
| Run ID            | 20806007405 |
| Health Level      | WARN        |
| Deployment Status | OK          |
| Entries Analyzed  | 7           |
```

---

## References

- **Checker Script**: `scripts/release/check_redaction_trends.sh`
- **Alert Workflow**: `.github/workflows/redaction-trend-alerts.yml`
- **Policy File**: `docs/ci/REDACTION_TREND_ALERT_POLICY.yml`
- **State File**: `docs/releases/_state/redaction_trend_alerts_state.json`
- **Time Series**: `docs/ci/REDACTION_METRICS_TRENDS.md`
- **Redaction Health**: `docs/ci/REDACTION_HEALTH.md`

---

## Change History

| Version | Date       | Changes                                     |
| ------- | ---------- | ------------------------------------------- |
| 1.0.0   | 2026-01-08 | Initial trend-based alerting implementation |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
