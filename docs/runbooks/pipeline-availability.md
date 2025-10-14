# Pipeline Availability Runbook

- Symptom: SLO burn alert (fast/slow) or downtime on dashboard.
- Indicators: `pipeline_uptime_ratio`, error budget gauge, error logs.
- Possible causes: source outage, scheduler failure, DB connection pool exhaustion, auth errors.
- Immediate actions:
  - Check Grafana SLO dashboard and service health `/api/monitoring/health`.
  - Inspect orchestrator/scheduler logs for errors.
  - Verify dependencies (Neo4j/Postgres/Redis) health endpoints.
- Resolution steps:
  - Restart failing workers; scale replicas if saturation observed.
  - Fix credentials/network for failing sources.
  - Apply hotfix for recent deployment causing widespread failures.
- Validation: Availability returns to baseline; burn rate < 1 on next windows.
- Recovery expectation: 15–30 minutes for transient outages, 1–2 hours for dependency failures.

