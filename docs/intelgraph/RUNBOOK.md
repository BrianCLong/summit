# IntelGraph Service Runbook

## 1. Overview

This runbook provides operational procedures for diagnosing and resolving common issues related to the IntelGraph service. It is intended for on-call engineers and system administrators responsible for maintaining the health of the platform.

**Key System Components:**
- **Service:** `intelgraph-server` (Node.js application)
- **Primary Database:** Neo4j (`intelgraph-db`)
- **Audit Database:** PostgreSQL (`provenance-ledger-db`)
- **Dashboard:** Grafana - [IntelGraph Service Health](http://localhost:3000/d/intelgraph-health)
- **Key Metrics:** `intelgraph_service_operations_total`, `intelgraph_service_request_latency_seconds`

---

## 2. Triage and Diagnosis

### Issue: High Error Rate

1.  **Observe:** Check the "IntelGraph Service: Error Rate" panel in the Grafana dashboard. If the error rate for any method is consistently above 1%, this is a critical alert.
2.  **Diagnose:**
    *   Inspect the logs for the `intelgraph-server` container for messages containing `"level":"error"`. Look for `DatabaseError` or `NotFoundError` messages from `IntelGraphService`.
    *   Check the health of the upstream databases (Neo4j and PostgreSQL). Are they reachable? Are they under heavy load?
    *   Examine the error messages. If they are `NotFoundError`, it may indicate an issue with upstream data consistency (e.g., a client is requesting an entity that does not exist). If they are `DatabaseError`, it points to a problem with the database itself or a malformed query.
3.  **Correlate:** Is the spike in errors correlated with a recent deployment or a specific type of user action?

### Issue: High Latency

1.  **Observe:** Check the "IntelGraph Service: p99 Request Latency" panel in the Grafana dashboard. If latency for any method exceeds the SLO (e.g., 500ms), this is a performance degradation.
2.  **Diagnose:**
    *   Identify which specific method is slow (e.g., `createClaim`, `getDecisionProvenance`).
    *   Inspect the logs for the Neo4j database. Look for slow query logs that correspond to the high-latency method. The Cypher queries for each method are documented in `IntelGraphService.ts`.
    *   Analyze the query plan using `EXPLAIN` or `PROFILE` in the Neo4j browser to identify performance bottlenecks (e.g., full graph scans, missing indexes).
3.  **Correlate:** Is the high latency associated with a large volume of requests or a specific, complex query?

---

## 3. Recovery Procedures

### Scenario: Service Restart

If the `intelgraph-server` is in a crash loop or unresponsive, a simple restart may resolve transient issues.

```bash
# Using Docker Compose
docker compose restart intelgraph-server
```

### Scenario: Database Connection Failure

If the service cannot connect to Neo4j or PostgreSQL:

1.  **Verify Connectivity:** From within the `intelgraph-server` container, attempt to connect to the databases directly.
    ```bash
    # For PostgreSQL
    docker compose exec intelgraph-server pg_isready -h postgres -p 5432 -U user

    # For Neo4j (using curl)
    docker compose exec intelgraph-server curl http://neo4j:7474
    ```
2.  **Check Credentials:** Verify that the database credentials in the `.env` file match the configuration of the database containers.
3.  **Restart Databases:** If the databases are unresponsive, restart them.
    ```bash
    docker compose restart neo4j postgres
    ```
    *Note: Restarting databases may cause a temporary service outage.*

### Scenario: Slow Cypher Query

If a specific query is identified as the source of high latency:

1.  **Short-Term Mitigation:** If the query is non-critical, consider temporarily disabling the feature that triggers it to restore overall system performance.
2.  **Long-Term Fix:**
    *   Work with the development team to optimize the query.
    *   This may involve adding a new index to the Neo4j database. An index can be added via a new migration file in `server/db/migrations/neo4j/`.
    *   Example: `CREATE INDEX FOR (n:Entity) ON (n.name);`

---

## 4. Escalation

If an issue cannot be resolved using this runbook, or if it persists for more than 15 minutes, escalate to the **IntelGraph Engineering Team**. Provide the following information in the escalation ticket:

-   A screenshot of the relevant Grafana dashboard panels.
-   The last 100 lines of logs from the `intelgraph-server` container.
-   Any slow query logs from the Neo4j database.
-   A summary of the troubleshooting steps already taken.
