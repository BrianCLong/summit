# Redaction Metrics Trends

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

The Redaction Metrics Trends system maintains a counts-only time series of redaction metrics, including rollback event tracking. This provides drift detection and operational stability KPIs without publishing sensitive data.

### Key Features

- **Time Series Storage**: Historical record of redaction counts per run
- **Rollback Tracking**: Counts rollback events and reasons
- **Stability Summary**: Rolling statistics (7-day and 30-day windows)
- **Static Rendering**: HTML and Markdown trend pages (no JavaScript required)
- **History Capping**: Automatic pruning to prevent repo/site bloat

---

## Time Series Schema

The `redaction_metrics_timeseries.json` file contains:

```json
{
  "version": "1.0",
  "series": [
    {
      "date_utc": "2026-01-08",
      "timestamp_utc": "2026-01-08T14:32:56Z",
      "run_id": 20806007405,
      "git_sha_short": "abc1234",
      "health_level": "OK",
      "deployment_status": "OK",
      "rollback_reason": "none",
      "tokens_redacted": 12,
      "internal_domains_redacted": 3,
      "issue_links_redacted": 45,
      "pr_links_redacted": 8,
      "state_refs_redacted": 2,
      "run_ids_redacted": 5,
      "forbidden_hits": 0,
      "governance_hash": "ab8b3bb2588620c98e3a6e1ded76ac43a8d7eee8fe5a29d14f612e72f1ec64f8"
    }
  ]
}
```

### Field Descriptions

| Field                       | Type   | Description                                     |
| --------------------------- | ------ | ----------------------------------------------- |
| `date_utc`                  | string | Date in YYYY-MM-DD format                       |
| `timestamp_utc`             | string | ISO 8601 timestamp                              |
| `run_id`                    | number | GitHub workflow run ID                          |
| `git_sha_short`             | string | First 7 characters of commit SHA                |
| `health_level`              | string | OK, WARN, or FAIL                               |
| `deployment_status`         | string | OK, WARN, or ROLLED_BACK                        |
| `rollback_reason`           | string | `none`, `redaction_fail`, or `site_safety_fail` |
| `tokens_redacted`           | number | Count of redacted tokens                        |
| `internal_domains_redacted` | number | Count of redacted internal domains              |
| `issue_links_redacted`      | number | Count of redacted issue links                   |
| `pr_links_redacted`         | number | Count of redacted PR links                      |
| `state_refs_redacted`       | number | Count of redacted state references              |
| `run_ids_redacted`          | number | Count of redacted run IDs                       |
| `forbidden_hits`            | number | Count of forbidden pattern matches              |
| `governance_hash`           | string | SHA256 hash of governance lockfile (optional)   |

---

## Governance Change Tracking

### Overview

The trend system tracks governance hash changes over time to correlate policy changes with operational events. This enables root cause analysis when incidents occur after governance updates.

### How It Works

1. **Hash Capture**: Each time series entry includes the current governance hash
2. **Change Detection**: `detect_governance_changes.sh` analyzes the series for hash transitions
3. **Annotation**: Trend pages mark rows where governance changed with 🔄
4. **Correlation**: SLO reports show governance change counts alongside incident counts

### Governance Changes Output

The `governance_changes.json` file contains:

```json
{
  "version": "1.0",
  "generated_at": "2026-01-08T14:32:56Z",
  "changes": [
    {
      "timestamp_utc": "2026-01-07T10:00:00Z",
      "run_id": 20805753049,
      "from_hash_short": "ab8b3bb25886",
      "to_hash_short": "cd9f4cc36897"
    }
  ],
  "change_count_7d": 1,
  "change_count_30d": 2,
  "current_hash_short": "cd9f4cc36897",
  "unique_hashes_30d": 3,
  "total_changes": 5
}
```

### Change Count Metrics

| Metric              | Description                                       |
| ------------------- | ------------------------------------------------- |
| `change_count_7d`   | Number of governance hash changes in last 7 days  |
| `change_count_30d`  | Number of governance hash changes in last 30 days |
| `unique_hashes_30d` | Distinct governance hashes seen in last 30 days   |
| `total_changes`     | All-time count of governance hash changes         |

### Interpreting Governance Changes

- **0 changes**: Governance configuration is stable
- **1-2 changes/month**: Normal policy evolution
- **3+ changes/month**: High churn - investigate if correlated with incidents
- **Change + incident**: Strong indicator of causal relationship

### Usage in Trend Pages

The trend table includes a "Gov" column:

- **🔄**: Governance hash changed at this run
- **-**: No governance change

This allows quick visual correlation between governance updates and operational events.

---

## Stability Metrics

The trend pages display stability metrics computed from the time series:

### Rolling Windows

| Metric      | 7-Day Window                     | 30-Day Window |
| ----------- | -------------------------------- | ------------- |
| Rollbacks   | Count of ROLLED_BACK deployments | Same          |
| FAIL Health | Count of FAIL health levels      | Same          |

### Point Metrics

| Metric           | Description                                       |
| ---------------- | ------------------------------------------------- |
| Avg Tokens (7d)  | Average tokens_redacted over last 7 entries       |
| Max Issues (30d) | Maximum issue_links_redacted over last 30 entries |
| Current Status   | Latest deployment_status                          |
| Current Health   | Latest health_level                               |

---

## How Rollbacks Are Counted

A rollback is recorded when `deployment_status == "ROLLED_BACK"`:

1. **During Build**: The deployment marker is generated with status `ROLLED_BACK`
2. **During Collection**: `update_redaction_metrics_timeseries.sh` reads the marker
3. **In Time Series**: Entry is recorded with `deployment_status: "ROLLED_BACK"` and `rollback_reason`
4. **In Trend**: Rollback appears in table and counts toward stability metrics

### Rollback Reasons

| Reason             | Meaning                                                 |
| ------------------ | ------------------------------------------------------- |
| `none`             | No rollback (normal deployment)                         |
| `redaction_fail`   | Health level was FAIL (forbidden patterns detected)     |
| `site_safety_fail` | Site safety verification failed (blocked files present) |

---

## Interpreting Changes

### Token Count Trends

- **Gradual increase**: May indicate growing documentation or legitimate content expansion
- **Sudden spike (2x+)**: Investigate - may indicate policy misconfiguration or content leak attempt
- **Steady decrease**: Verify intentional - may indicate content being removed

### Forbidden Hits

- **Any non-zero value**: Triggers FAIL health, blocks deployment
- **Repeated occurrences**: Indicates systemic issue - review redaction policy

### Rollback Frequency

- **0 in 30 days**: Excellent stability
- **1-2 in 30 days**: Normal operational variance
- **3+ in 30 days**: Investigate root causes, review policy

---

## Scripts Reference

### update_redaction_metrics_timeseries.sh

Collects metrics and updates the time series.

```bash
# Basic usage
./scripts/release/update_redaction_metrics_timeseries.sh \
  --site-dir site/release-ops

# With metadata
./scripts/release/update_redaction_metrics_timeseries.sh \
  --site-dir site/release-ops \
  --run-id 12345678 \
  --git-sha abc1234def5678

# Custom history limit
./scripts/release/update_redaction_metrics_timeseries.sh \
  --site-dir site/release-ops \
  --max-entries 30
```

| Option          | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `--site-dir`    | Directory containing source files (default: site/release-ops) |
| `--max-entries` | Maximum history entries to keep (default: 60)                 |
| `--run-id`      | GitHub workflow run ID                                        |
| `--git-sha`     | Git commit SHA                                                |
| `--verbose`     | Enable verbose logging                                        |

### render_redaction_metrics_trend.sh

Renders trend visualization pages.

```bash
# Basic usage
./scripts/release/render_redaction_metrics_trend.sh \
  --site-dir site/release-ops

# With verbose output
./scripts/release/render_redaction_metrics_trend.sh \
  --site-dir site/release-ops \
  --verbose
```

| Option       | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `--site-dir` | Directory containing time series (default: site/release-ops) |
| `--verbose`  | Enable verbose logging                                       |

---

## Integration

### Build Pipeline Integration

The trend system is integrated into `build_release_ops_site.sh`:

1. Redaction health is computed (`redaction_health.json`)
2. Time series is updated (`update_redaction_metrics_timeseries.sh`)
3. Trend pages are rendered (`render_redaction_metrics_trend.sh`)
4. Index page includes link to trend view

### Source Files

The collector reads from:

- `redaction_health.json` - Health level and redaction counts
- `deployment_marker.json` - Deployment status and rollback info

---

## Resetting History

To reset the time series history:

### Option 1: Clear Entire History

```bash
# Remove the time series file
rm site/release-ops/redaction_metrics_timeseries.json

# Next build will initialize fresh history
```

### Option 2: Keep Recent Entries

```bash
# Keep only last N entries
jq '.series = .series[:10]' site/release-ops/redaction_metrics_timeseries.json > tmp.json
mv tmp.json site/release-ops/redaction_metrics_timeseries.json
```

### Option 3: Remove Specific Entries

```bash
# Remove entries with specific run_id
jq '.series = [.series[] | select(.run_id != 12345678)]' \
  site/release-ops/redaction_metrics_timeseries.json > tmp.json
mv tmp.json site/release-ops/redaction_metrics_timeseries.json
```

---

## Output Files

| File                                | Description                  |
| ----------------------------------- | ---------------------------- |
| `redaction_metrics_timeseries.json` | Raw time series data         |
| `redaction_metrics_trend.html`      | HTML trend visualization     |
| `redaction_metrics_trend.md`        | Markdown trend documentation |

All files are safe for public publication (counts-only, no sensitive content).

---

## Troubleshooting

### Time Series Not Updating

**Symptom:** New entries not appearing in time series

**Causes:**

1. `redaction_health.json` not present
2. Script not executable
3. jq not available

**Resolution:**

```bash
# Verify source files exist
ls -la site/release-ops/redaction_health.json
ls -la site/release-ops/deployment_marker.json

# Check script is executable
ls -la scripts/release/update_redaction_metrics_timeseries.sh

# Verify jq is installed
which jq
```

### Trend Pages Empty

**Symptom:** Trend pages show "No historical data"

**Cause:** Time series file is empty or missing

**Resolution:**

```bash
# Check time series exists and has entries
jq '.series | length' site/release-ops/redaction_metrics_timeseries.json
```

### Stability Metrics Incorrect

**Symptom:** Rollback counts don't match expectations

**Cause:** Time series entries may have wrong deployment_status

**Resolution:**

```bash
# List all entries with their status
jq '.series[] | {date: .date_utc, status: .deployment_status, reason: .rollback_reason}' \
  site/release-ops/redaction_metrics_timeseries.json
```

---

## References

- **Collector Script**: `scripts/release/update_redaction_metrics_timeseries.sh`
- **Renderer Script**: `scripts/release/render_redaction_metrics_trend.sh`
- **Change Detector**: `scripts/release/detect_governance_changes.sh`
- **Build Integration**: `scripts/release/build_release_ops_site.sh`
- **Allowlist**: `docs/ci/PAGES_PUBLISH_ALLOWLIST.md`
- **Redaction Health**: `docs/ci/REDACTION_HEALTH.md`
- **Pages Rollback**: `docs/ci/PAGES_ROLLBACK.md`
- **Governance Stamping**: `docs/ci/GOVERNANCE_STAMPING.md`

---

## Change History

| Version | Date       | Changes                                               |
| ------- | ---------- | ----------------------------------------------------- |
| 1.1.0   | 2026-01-08 | Added governance hash tracking and change annotations |
| 1.0.0   | 2026-01-08 | Initial implementation                                |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
