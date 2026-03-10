# AI-IO Watchlist Runbook

## Overview
This runbook details the procedures for updating and maintaining the AI-IO Watchlist for Summit.

## Update Cadence
The AI-IO Watchlist must be refreshed every 30 days.

## Emergency Refresh Triggers
An emergency refresh may be triggered by:
- Major election events
- Conflict escalations
- Platform threat reports
- New public disruption reports

## Escalation
A watch item moves from `P2` to `P1` when two independent sources corroborate the threat or trend.

## SLO / SLA Assumptions
- Monthly refresh completes within 1 business day of scheduled run.
- P1 manual updates occur within 24h of a major public report.

## Related Scripts
- `scripts/watchlists/build_ai_io_watchlist.py`: Generates the watchlist artifacts deterministically.
- `scripts/monitoring/ai-io-watchlist-drift.py`: Monitors drift between the current watchlist and previous versions.

## Artifact Locations
- Definitions: `docs/watchlists/ai-io-2026H1.md`
- Schema: `docs/standards/ai-io-watchlist-schema.md`
- Report output: `artifacts/watchlists/ai-io/report.json`
- Metrics output: `artifacts/watchlists/ai-io/metrics.json`
- Timestamp tracking: `artifacts/watchlists/ai-io/stamp.json`
