# Operational Runbook: Recovering from Graph Database Corruption

## Trigger Conditions
- PagerDuty Alert: "Neo4j Database Offline" or "Database Corruption Detected".
- GraphRAG queries fail consistently with database errors (e.g., `Neo.TransientError.Database.DatabaseUnavailable`).
- Failed health checks on Neo4j database nodes.
- Alerts on missing data or corrupt index structures from automated integrity checks.

## Step-by-Step Procedures

1. Open the #inc-summit-ops channel and acknowledge the alert.
2. Stop the GraphRAG worker pods to prevent further queries or updates to the corrupted database.
3. Access the Neo4j cluster administration console or run `cypher-shell` on the primary node.
4. Attempt to run a diagnostic tool (e.g., `neo4j-admin database check`) to assess the extent of the corruption.
5. If corruption is confirmed, initiate the database restore procedure from the latest clean backup as detailed in `docs/runbooks/BACKUP_RESTORE_RUNBOOK.md`.
6. Ensure the restored database is brought online and verified for consistency.
7. Restart the GraphRAG worker pods to resume query processing.

## Verification Steps
- Verify the database is online and accepting connections.
- Run a set of sample GraphRAG queries to confirm data integrity and correctness.
- Monitor the Grafana "Database Health" dashboard for stable metrics and absence of error logs.
- Run the smoke test suite: `scripts/smoke.sh <url>`.

## Rollback Instructions
- If the restore fails, identify the point of failure (e.g., corrupted backup file, disk space issue) and attempt to restore from an older, known-good backup.
- If the issue cannot be resolved, escalate to the database administration team or Neo4j support per `docs/runbooks/op-oncall-escalation.md`.
- Document the root cause, recovery time, and any data loss incurred during the incident.
