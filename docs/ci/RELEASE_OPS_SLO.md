# Release Ops SLO Reporting

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

The Release Ops SLO (Service Level Objectives) system tracks publication safety KPIs over time. It provides executive-grade metrics for monitoring the health and stability of the release publication pipeline.

### Key Features

- **Weekly/Monthly Windows**: Separate metrics for 7-day and 30-day periods
- **Target Comparisons**: Compare actual metrics against defined targets
- **MTBR Tracking**: Mean Time Between Rollbacks (hours)
- **Streak Analysis**: Track consecutive successful publishes
- **Recovery Metrics**: Measure time to recover from incidents
- **Counts-Only**: All metrics are safe for public publication

---

## SLO Metrics

### Success Rate

**Definition:** Percentage of cycles where deployment was successful without forbidden patterns.

```
success = (deployment_status in [OK, WARN]) AND (forbidden_hits == 0)
success_rate_pct = (successful_publishes / total_cycles) * 100
```

**Target:** ≥99%

### Rollback Rate

**Definition:** Percentage of cycles that resulted in a rollback.

```
rollback = (deployment_status == ROLLED_BACK)
rollback_rate_pct = (rollbacks_count / total_cycles) * 100
```

**Target:** ≤2%

### FAIL Rate

**Definition:** Percentage of cycles with forbidden patterns detected.

```
fail = (health_level == FAIL) OR (forbidden_hits > 0)
fail_rate_pct = (fail_count / total_cycles) * 100
```

**Target:** ≤1%

### WARN Rate

**Definition:** Percentage of cycles with elevated redaction counts.

```
warn = (health_level == WARN) AND (deployment_status in [OK, WARN])
warn_rate_pct = (warn_count / total_cycles) * 100
```

**Target:** No specific target (informational)

### MTBR (Mean Time Between Rollbacks)

**Definition:** Average hours between rollback events.

```
mtbr_hours = average(time_between_consecutive_rollbacks)
```

**Target:** ≥168 hours (1 week)

**Interpretation:**

- Higher is better
- N/A if fewer than 2 rollbacks in window
- Low MTBR indicates instability

### Longest OK Streak

**Definition:** Maximum consecutive successful deployments in the window.

**Target:** ≥20

### Recovery Cycles Average

**Definition:** Average number of cycles from a FAIL/rollback to the next successful deploy.

**Interpretation:**

- Lower is better
- Measures how quickly issues are resolved
- N/A if no recovery events in window

---

## Status Levels

### MEETING

All targets are met:

- Success rate ≥99%
- Rollback rate ≤2%
- FAIL rate ≤1%

### AT_RISK

Close to failing but not critical:

- Success rate ≥95%
- Rollback rate ≤5%
- FAIL rate ≤3%

### FAILING

One or more targets not met:

- Below AT_RISK thresholds

### INSUFFICIENT_DATA

Fewer than 3 data points available for meaningful statistics.

---

## Output Files

### release_ops_slo.json

Raw SLO metrics data.

```json
{
  "version": "1.0",
  "generated_at": "2026-01-08T14:32:56Z",
  "windows": {
    "weekly_days": 7,
    "monthly_days": 30
  },
  "weekly": {
    "total_cycles": 14,
    "successful_publishes": 13,
    "success_rate_pct": 92.86,
    "rollbacks_count": 1,
    "rollback_rate_pct": 7.14,
    "warn_count": 2,
    "warn_rate_pct": 14.29,
    "fail_count": 1,
    "fail_rate_pct": 7.14,
    "mtbr_hours": null,
    "longest_ok_streak": 8,
    "recovery_cycles_avg": 2.0,
    "status": "AT_RISK",
    "recent_incidents": [...]
  },
  "monthly": { ... },
  "all_time": { ... },
  "current_streak": 5,
  "targets": {
    "success_rate_pct": 99,
    "rollback_rate_max_pct": 2,
    "fail_rate_max_pct": 1,
    "mtbr_target_hours": 168,
    "ok_streak_target": 20
  },
  "summary": {
    "weekly_status": "AT_RISK",
    "monthly_status": "MEETING",
    "meeting_targets": true
  }
}
```

### release_ops_slo.html

HTML visualization with:

- Status cards (MEETING/AT_RISK/FAILING)
- KPI summary grid
- Weekly and monthly detail tables
- Recent incidents list
- Target comparison indicators

### release_ops_slo.md

Markdown version for internal linking and review.

---

## Scripts Reference

### compute_release_ops_slo.sh

Computes SLO metrics from time series data.

```bash
# Basic usage
./scripts/release/compute_release_ops_slo.sh \
  --timeseries site/release-ops/redaction_metrics_timeseries.json \
  --out site/release-ops/release_ops_slo.json

# With verbose output
./scripts/release/compute_release_ops_slo.sh \
  --timeseries timeseries.json \
  --out slo.json \
  --verbose
```

| Option         | Description                        |
| -------------- | ---------------------------------- |
| `--timeseries` | Time series JSON file (required)   |
| `--policy`     | SLO policy YAML file (optional)    |
| `--out`        | Output JSON file (default: stdout) |
| `--verbose`    | Enable verbose logging             |

### render_release_ops_slo_report.sh

Renders SLO report pages from computed metrics.

```bash
# Basic usage
./scripts/release/render_release_ops_slo_report.sh \
  --slo-json site/release-ops/release_ops_slo.json

# Custom output directory
./scripts/release/render_release_ops_slo_report.sh \
  --slo-json slo.json \
  --out-dir public/ \
  --verbose
```

| Option       | Description                                  |
| ------------ | -------------------------------------------- |
| `--slo-json` | SLO JSON file (required)                     |
| `--out-dir`  | Output directory (default: site/release-ops) |
| `--verbose`  | Enable verbose logging                       |

---

## Integration

### Build Pipeline

SLO computation is integrated into `build_release_ops_site.sh`:

```
1. Update time series
2. Render trend pages
3. Compute SLO JSON ← NEW
4. Render SLO pages  ← NEW
5. Create index page (with SLO link)
6. Final verification
```

### Monthly Issue

The `release-ops-slo-issue.yml` workflow:

- Runs on the 1st of each month at 09:00 UTC
- Creates/updates a monthly SLO summary issue
- Deduplicates by month
- Contains counts-only KPIs and links
- Includes Governance Identity section

---

## Governance Identity

### Overview

Monthly SLO issues include a **Governance Identity** section that correlates releases with governance configuration. This enables tracking whether policy changes correlate with reliability shifts.

### Fields

| Field                       | Description                                       |
| --------------------------- | ------------------------------------------------- |
| **Governance Hash**         | SHA256 of governance_lockfile.json (short form)   |
| **Governance Authenticity** | VERIFIED, UNKNOWN, or NOT_VERIFIED                |
| **Governance Drift**        | Count of governance hash changes during the month |

### Example Section

```markdown
### Governance Identity

| Field                   | Value                |
| ----------------------- | -------------------- |
| Governance Hash         | `ab8b3bb2588620c...` |
| Governance Authenticity | VERIFIED             |
| Governance Drift        | No changes           |

_Governance identity provides correlation between releases and policy configuration.
Hash changes indicate policy updates during the period._
```

### Interpretation

- **Hash changes**: If governance drift shows changes, review whether reliability shifts correlate
- **Authenticity**: VERIFIED means the governance lockfile was signed by authorized CI
- **UNKNOWN**: Authenticity data not available (older releases or missing artifacts)

### Data Sources

The governance identity is extracted from:

1. `deployment_marker.json` - Contains governance_hash and authenticity status
2. `governance_authenticity.json` - Detailed authenticity verification result
3. `redaction_metrics_timeseries.json` - Governance hash per entry for drift detection

### Extraction Script

```bash
# Extract governance identity for a given month
./scripts/release/extract_governance_identity_for_slo.sh \
  --site-dir site/release-ops \
  --month 2026-01

# JSON output
./scripts/release/extract_governance_identity_for_slo.sh \
  --site-dir site/release-ops \
  --month 2026-01 \
  --json
```

### Safety

All governance identity data is **counts-only** and safe for public publication:

- Hash is a cryptographic fingerprint (no policy content)
- Authenticity is a boolean status
- Drift is a change count only

---

## Adjusting Targets

### Via Policy File

Edit `docs/ci/RELEASE_OPS_SLO_POLICY.yml`:

```yaml
targets:
  publish_success_rate_pct: 99.0 # Adjust as needed
  rollback_rate_max_pct: 2.0 # Adjust as needed
  fail_rate_max_pct: 1.0 # Adjust as needed
  mtbr_target_hours: 168 # Adjust as needed
  ok_streak_target: 20 # Adjust as needed
```

### Safety Guidelines

When adjusting targets:

1. **Document the change**: Include rationale in commit message
2. **Review historical data**: Ensure new targets are achievable
3. **Consider trend**: Are metrics improving or degrading?
4. **Team alignment**: Discuss significant changes with stakeholders
5. **Monitor after change**: Watch for alert noise changes

---

## Interpreting Results

### Healthy Pipeline

- Weekly status: MEETING
- Monthly status: MEETING
- Current streak: >10
- No recent incidents
- MTBR: >168 hours

### Warning Signs

- Weekly status: AT_RISK (monthly still MEETING)
- Increasing WARN rate
- Decreasing OK streak
- Recovery cycles increasing

### Action Required

- Monthly status: AT_RISK or FAILING
- Multiple recent incidents
- MTBR declining
- Recovery cycles >3

---

## Resetting SLO History

To reset and start fresh:

### Clear Time Series

```bash
# Remove time series (SLO will show INSUFFICIENT_DATA)
rm site/release-ops/redaction_metrics_timeseries.json

# Next build will create fresh history
```

### Keep Recent Data Only

```bash
# Keep last 7 days of data
jq '
  (now - 7 * 86400) as $cutoff |
  .series = [.series[] | select((.timestamp_utc | fromdateiso8601) >= $cutoff)]
' site/release-ops/redaction_metrics_timeseries.json > tmp.json
mv tmp.json site/release-ops/redaction_metrics_timeseries.json
```

---

## Example KPI Table

| Metric               | Weekly     | Monthly   | Target | Status  |
| -------------------- | ---------- | --------- | ------ | ------- |
| Total Cycles         | 14         | 42        | -      | -       |
| Successful Publishes | 13         | 41        | -      | -       |
| Success Rate         | 92.86%     | 97.62%    | ≥99%   | AT_RISK |
| Rollbacks            | 1 (7.14%)  | 1 (2.38%) | ≤2%    | Met     |
| FAILs                | 1 (7.14%)  | 1 (2.38%) | ≤1%    | Not Met |
| WARNs                | 2 (14.29%) | 4 (9.52%) | -      | -       |
| MTBR                 | N/A        | N/A       | ≥168h  | -       |
| Longest Streak       | 8          | 15        | ≥20    | Not Met |

---

## References

- **SLO Script**: `scripts/release/compute_release_ops_slo.sh`
- **Renderer Script**: `scripts/release/render_release_ops_slo_report.sh`
- **Governance Identity Script**: `scripts/release/extract_governance_identity_for_slo.sh`
- **Policy File**: `docs/ci/RELEASE_OPS_SLO_POLICY.yml`
- **Monthly Workflow**: `.github/workflows/release-ops-slo-issue.yml`
- **State File**: `docs/releases/_state/slo_issues_state.json`
- **Time Series**: `docs/ci/REDACTION_METRICS_TRENDS.md`
- **Trend Alerts**: `docs/ci/REDACTION_TREND_ALERTS.md`
- **Governance Stamping**: `docs/ci/GOVERNANCE_STAMPING.md`
- **Governance Signing**: `docs/ci/GOVERNANCE_SIGNING.md`

---

## Change History

| Version | Date       | Changes                                                 |
| ------- | ---------- | ------------------------------------------------------- |
| 1.1.0   | 2026-01-08 | Added Governance Identity section to monthly SLO issues |
| 1.0.0   | 2026-01-08 | Initial SLO reporting implementation                    |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
