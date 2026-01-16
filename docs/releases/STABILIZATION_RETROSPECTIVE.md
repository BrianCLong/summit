# Stabilization Retrospective

## Overview

The **Stabilization Retrospective** is a monthly, automated process that aggregates weekly stabilization closeout artifacts to identify trends, recurring issues, and focus areas for systemic improvements. It serves as the foundation for the [Roadmap Handoff](./STABILIZATION_ROADMAP_HANDOFF.md) process.

## Purpose

The retrospective provides:

1. **Trend Analysis**: Week-over-week metrics to identify improvements and regressions
2. **Recurring Blocker Identification**: Issues that persist across multiple weeks
3. **Focus Recommendations**: Data-driven themes for next month's improvement efforts
4. **Evidence Base**: Objective metrics for roadmap candidate derivation

## How It Works

### 1. Data Collection

The retrospective script (`scripts/releases/generate_stabilization_retrospective.mjs`) fetches weekly closeout artifacts:

- **Weekly Stabilization Reports**: JSON artifacts from `artifacts/reports/stabilization-report-*.json`
- **Default Window**: Last 4 weeks (configurable via `--weeks` parameter)
- **Fallback**: Generates synthetic data if no artifacts exist (for initial runs)

### 2. Metric Aggregation

The following metrics are aggregated across the time window:

| Metric | Description | Direction |
|--------|-------------|-----------|
| `risk_index` | Overall stabilization risk score | Lower is better |
| `done_p0` / `done_p1` | Completed P0/P1 items | Higher is better |
| `on_time_rate` | Percentage of items completed on time | Higher is better |
| `overdue_load` | Number of overdue items | Lower is better |
| `overdue_p0` | Number of overdue P0 items | Lower is better |
| `evidence_compliance` | Evidence collection compliance rate | Higher is better |
| `issuance_completeness` | Issue tracking completeness | Higher is better |
| `blocked_unissued` | Blocked items not yet issued as tickets | Lower is better |
| `blocked_unissued_p0` | Blocked P0 items not yet issued | Lower is better |
| `stabilization_score` | Overall stabilization health score | Higher is better |

### 3. Trend Calculation

For each metric, the retrospective calculates:

- **First Value**: Metric value at start of window
- **Last Value**: Metric value at end of window
- **Delta**: Change over the window (`last - first`)
- **Delta Percent**: Percentage change
- **Trend**: Classification as `improved`, `regressed`, or `stable`

Trend direction accounts for metric polarity (e.g., lower `overdue_load` = improvement).

### 4. Recurring Blocker Detection

Issues are flagged as "recurring" if they appear in **2 or more weeks** within the window:

- P0 overdue load
- P0 blocked & unissued items
- Critical dependency vulnerabilities
- P0 release blockers

### 5. Focus Theme Derivation

The retrospective identifies up to **5 focus themes** based on:

- Metrics below/above thresholds
- Recurring blockers
- Trend regressions
- Severity and persistence

Example themes:
- Issuance Hygiene
- Evidence Compliance
- P0 SLA Adherence
- Systemic Risk Reduction
- On-Time Delivery

## Output Artifacts

### Markdown Report

**Path**: `artifacts/stabilization/retrospective/RETRO_<timestamp>.md`

Contains:
- Executive summary with weekly metrics table
- "What Improved" section (top 5 improvements)
- "What Regressed" section (top 5 regressions)
- Recurring Blockers (top 10 with frequency)
- Focus Next Month (top 5 themes with rationale)
- Data Quality notes

### JSON Report

**Path**: `artifacts/stabilization/retrospective/retro_<timestamp>.json`

Contains:
- Full metric series (all values across window)
- Trend calculations for all metrics
- Recurring blockers with evidence
- Focus themes with severity and evidence
- Raw weekly data for audit trail

## Window Selection

### Default Behavior

- **Window**: Last 4 weeks
- **Rationale**: Balances recency with sufficient data for trend detection

### Custom Window

Use `--weeks=N` to analyze a different window:

```bash
node scripts/releases/generate_stabilization_retrospective.mjs --weeks=8
```

**Recommendations**:
- **2 weeks**: Minimum for basic trend detection
- **4 weeks**: Recommended for monthly retrospectives
- **8-12 weeks**: Quarterly or deep-dive analysis

### Data Quality Requirements

From `stabilization-policy.yml`:

- **Minimum weeks**: 2 (policy: `data_quality.min_weeks_for_analysis`)
- **Maximum missing data**: 25% (policy: `data_quality.max_missing_data_percent`)

If data quality is insufficient, the retrospective will warn or fail based on policy.

## How Recommendations Are Derived

All recommendations are **rule-based** and deterministic:

1. **Threshold-Based Triggers**:
   - If `blocked_unissued_p0 > 0` → Recommend "Issuance Hygiene"
   - If `evidence_compliance < 95%` → Recommend "Evidence Compliance"
   - If `overdue_p0 > 0` in ≥2 weeks → Recommend "P0 SLA Adherence"
   - If `risk_index_avg ≥ 30` → Recommend "Systemic Risk Reduction"
   - If `on_time_rate < 80%` → Recommend "On-Time Delivery"

2. **Scoring**:
   - **Severity Weight**: Critical=100, High=70, Medium=40, Low=20
   - **Persistence Bonus**: +10 per week issue persists
   - **Final Score**: `severity_weight + (persistence * 10)`

3. **Selection**:
   - Sort by score (descending)
   - Select top N (default: 5, configurable in policy)

**No Invented Narratives**: All recommendations cite specific metrics, thresholds, and evidence.

## Where to Find Outputs

### CI Artifacts

The **Stabilization Retrospective** workflow uploads artifacts to GitHub Actions:

- **Artifact Name**: `stabilization-retrospective`
- **Retention**: 90 days (configurable in policy)
- **Contents**: All JSON and Markdown reports

### Repository Paths

- **Retrospective Reports**: `artifacts/stabilization/retrospective/`
- **Latest Report**: `ls -t artifacts/stabilization/retrospective/RETRO_*.md | head -1`

### Pull Requests

In **draft mode** (default), the workflow creates a PR with:
- All retrospective artifacts
- Summary in PR description
- Labels: `stabilization`, `retrospective`, `documentation`

## Running the Retrospective

### Via GitHub Actions (Recommended)

**Automatic**: Runs monthly on the 1st day of the month at 10:00 UTC

**Manual Trigger**:

```bash
gh workflow run stabilization-retrospective.yml \
  -f weeks=4 \
  -f mode=draft
```

### Via Command Line

```bash
# Generate retrospective for last 4 weeks
node scripts/releases/generate_stabilization_retrospective.mjs

# Custom window
node scripts/releases/generate_stabilization_retrospective.mjs \
  --weeks=8 \
  --out-dir=artifacts/stabilization/retrospective \
  --artifacts-dir=artifacts/reports
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--weeks` | 4 | Number of weeks to analyze |
| `--out-dir` | `artifacts/stabilization/retrospective` | Output directory |
| `--artifacts-dir` | `artifacts/reports` | Directory with weekly artifacts |
| `--help` | - | Show usage help |

## Integration with Roadmap Handoff

The retrospective JSON output feeds directly into the [Roadmap Handoff](./STABILIZATION_ROADMAP_HANDOFF.md) process:

```bash
# Generate retrospective
node scripts/releases/generate_stabilization_retrospective.mjs

# Derive roadmap candidates
node scripts/releases/derive_stabilization_roadmap_candidates.mjs \
  --retro=artifacts/stabilization/retrospective/retro_<timestamp>.json

# Generate drafts
node scripts/releases/sync_stabilization_roadmap_handoff.mjs \
  --candidates=candidates.json \
  --retro=retro.json
```

This pipeline is automated in the **Stabilization Retrospective** workflow.

## Policy Configuration

The retrospective is governed by `.github/releases/stabilization-policy.yml`:

```yaml
stabilization:
  retrospective:
    enabled: true
    default_window_weeks: 4
    schedule: 'monthly'
    artifacts_path: 'artifacts/stabilization/retrospective'

  roadmap_handoff:
    thresholds:
      recurring_overdue_weeks: 2
      min_risk_index_avg: 30
      evidence_compliance_min: 0.95
      # ... additional thresholds
```

See [Stabilization Policy](../../.github/releases/stabilization-policy.yml) for full configuration.

## Troubleshooting

### No Weekly Artifacts Found

**Symptom**: "No existing artifacts found. Generating synthetic data..."

**Resolution**:
- Ensure weekly stabilization reports are being generated
- Check `artifacts/reports/` for `stabilization-report-*.json` files
- For initial runs, synthetic data is acceptable for demonstration

### Insufficient Data Quality

**Symptom**: "Data quality below threshold"

**Resolution**:
- Reduce `--weeks` parameter
- Check `data_quality.max_missing_data_percent` in policy
- Investigate why weekly reports are missing

### Unexpected Trends

**Symptom**: Metrics show unexpected improvements/regressions

**Resolution**:
- Review raw weekly data in JSON output: `weekly_data` field
- Verify metric calculation logic in script
- Check for data anomalies or outliers in source artifacts

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-14 | Initial release |

## See Also

- [Stabilization Roadmap Handoff](./STABILIZATION_ROADMAP_HANDOFF.md)
- [Stabilization Policy](../../.github/releases/stabilization-policy.yml)
- [Weekly Stabilization Closeout Process](./WEEKLY_STABILIZATION.md) (if exists)

## Support

For questions or issues:
- File a GitHub issue with label `stabilization`
- Contact: `#release-team` (Slack)
- Maintainers: See `stabilization-policy.yml` metadata
