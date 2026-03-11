# Operational Runbook: System Startup and Shutdown Procedures

## Trigger Conditions
- Scheduled maintenance requiring full system restart.
- Emergency shutdown due to critical security incidents or infrastructure failures.
- Cold start of the environment after a full outage.

## Step-by-Step Procedures

### Shutdown Procedure
1. Notify stakeholders in the #inc-summit-ops channel.
2. Disable incoming traffic at the edge (e.g., set WAF to maintenance mode).
3. Stop the ingestion pipeline: scale ingestion workers to 0.
4. Drain active GraphRAG queries and wait for completion.
5. Stop application services (API, frontend, GraphRAG workers).
6. Create a final snapshot of the graph database and relational database.
7. Stop database instances (PostgreSQL, Neo4j, Redis).

### Startup Procedure
1. Start database instances (PostgreSQL, Neo4j, Redis) and verify health.
2. Start application services (API, frontend, GraphRAG workers).
3. Start the ingestion pipeline: scale ingestion workers to normal capacity.
4. Enable incoming traffic at the edge.
5. Notify stakeholders in the #inc-summit-ops channel that the system is back online.

## Verification Steps
- Verify all database instances are `Ready` and accepting connections.
- Run the smoke test suite: `scripts/smoke.sh <url>`
- Check the Grafana "System Health" dashboard for error rates and latency.
- Ensure the ingestion pipeline backlog is processing normally.

## Rollback Instructions
- If the shutdown procedure fails or causes data corruption, immediately isolate the affected component and restore from the latest clean backup using the `docs/runbooks/BACKUP_RESTORE_RUNBOOK.md`.
- If the startup procedure fails, halt the process, revert any changes made during the downtime, and investigate logs. Do not re-enable edge traffic until all services are healthy.
