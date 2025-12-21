# Chaos Drill Runbook

**Monthly**: enable `CHAOS_LATENCY_MS=200` in stage for 15m per service, confirm SLO dashboards and rollback.
Steps:
1. Announce in #ops; create change record.
2. Set env var; verify Prom metrics spike but stay under error budget.
3. Validate auto-scale rules.
4. Revert and post-mortem with findings.
