# Alerting Policy & Rationalization

## Principles
1. **Page only for outcomes**: Alerts should only page if a user is impacted or SLO burn is critical.
2. **One-In, One-Out**: No new alert rule can be added without removing an existing one, unless it replaces a legacy signal.
3. **Actionable**: Every page must have a runbook. If there is no runbook, delete the alert.

## Alert Taxonomy
- **Tier 0 (Critical)**: Wake up. Site down, data loss, critical user journey broken.
- **Tier 1 (High)**: Resolve next business day. Degraded performance, non-critical feature broken.
- **Tier 2 (Info)**: No page. Log for review.

## Requirements
- **Runbook Link**: Mandatory for Tier 0/1.
- **Owner**: Every alert must have a team owner.
- **Impact**: Defined customer impact.

## Noise Reduction
- **Consolidate**: Merge duplicate alerts.
- **Multi-Signal**: Use symptom-based alerting (Error Rate + Latency) rather than cause-based (CPU high).
- **Auto-Triage**: Route alerts by service and severity.

## Legacy Clean-up
- Delete "host down" pings that don't map to user journeys.
- Track false-positive rate and tune weekly.
