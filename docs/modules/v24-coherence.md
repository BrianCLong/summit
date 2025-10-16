# v24 Global Coherence Ecosystem - On-Call Runbook

- **Alert:** GraphQL p95 > 350ms (10m) or error‑rate > 0.1% (10m)
- **Checks:**
  1.  Look for Neo4j/PG latency spikes; verify Redis PubSub health.
  2.  Confirm cache hit‑rate; temporarily force Postgres read model.
  3.  If sustained: set `v24.coherence=false`; roll back Helm to last good rev.

- **Dashboards:** Grafana v24 panel links.
- **Run commands:** `scripts/rollback-v24.sh`.
- **Escalation:** PagerDuty service `intelgraph-server`.
