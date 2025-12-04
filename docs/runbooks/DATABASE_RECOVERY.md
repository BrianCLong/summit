# Database Recovery & Troubleshooting Runbook

## Overview
This runbook covers recovery procedures for Neo4j, PostgreSQL, and Redis, as well as troubleshooting steps for connection pool exhaustion and circuit breaker events.

## Metrics & Monitoring
- **Grafana Dashboard**: `Infrastructure / Database Pools`
- **Key Metrics**:
  - `db_pool_size` (Gauge): Current connection pool size.
  - `db_pool_waiting` (Gauge): Requests waiting for a connection.
  - `db_connection_errors_total` (Counter): Connection failures.
  - `db_circuit_breaker_state` (Gauge): 0=Closed, 1=Half-Open, 2=Open.

## Alerting Triggers
1.  **High Pool Utilization**: >85% of `db_pool_size` used for 5m.
    -   *Action*: Check for slow queries. Scale up pool if necessary (see Config).
2.  **Circuit Breaker Open**: `db_circuit_breaker_state` == 2.
    -   *Action*: Check database health. Restart DB service if down.
3.  **Backup Failure**: `backup_duration_seconds{status="failure"}` > 0.
    -   *Action*: Investigate logs, check disk space.

## Recovery Procedures

### 1. PostgreSQL Recovery
-   **Restore from Backup**:
    ```bash
    # Decompress if needed
    gunzip postgres-backup-YYYY-MM-DD.sql.gz
    # Restore
    psql -h <host> -U <user> -d <dbname> -f postgres-backup-YYYY-MM-DD.sql
    ```
-   **Point-in-Time Recovery**:
    -   Requires WAL archiving enabled. Refer to AWS RDS / Cloud provider docs if managed.

### 2. Neo4j Recovery
-   **Restore from Backup**:
    -   **Community Edition**: Stop Neo4j, replace `graph.db` with backup (offline).
    -   **Enterprise**: Use `neo4j-admin load`.
    -   **From GraphML**:
        ```cypher
        CALL apoc.import.graphml("neo4j-export-YYYY-MM-DD.graphml", {batchSize: 10000, readLabels: true})
        ```

### 3. Redis Recovery
-   **Restore from RDB**:
    -   Stop Redis.
    -   Replace `dump.rdb` in data directory.
    -   Start Redis.

## Circuit Breaker Troubleshooting
If `db_circuit_breaker_state` is stuck at 2 (Open):
1.  Verify DB connectivity from the server pod:
    ```bash
    nc -zv <db-host> <db-port>
    ```
2.  Check logs for specific error (timeout, auth failed).
3.  The breaker attempts to self-heal every 30s. If it fails immediately, the underlying issue persists.
